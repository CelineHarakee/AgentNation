# rag/retriever.py
# Imported by PAA, SGA, ORA, and CAA at runtime.
# Handles connecting to ChromaDB and retrieving relevant chunks.
#
# The collection is loaded once and cached — no repeated disk I/O per call.

import os
import logging
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("agentnation.rag")

# ── Config ────────────────────────────────────────────────────────────────────

CHROMA_DB_PATH  = "rag/chroma_db"
COLLECTION_NAME = "agentnation_rag"

# ── Lazy-loaded singletons ────────────────────────────────────────────────────
# ChromaDB client and collection are loaded once on first call, then cached.
# This avoids reconnecting to disk on every agent call.

_client     = None
_collection = None


def _get_collection():
    global _client, _collection

    if _collection is not None:
        return _collection

    try:
        import chromadb
        from chromadb.utils.embedding_functions import GoogleGenerativeAiEmbeddingFunction
    except ImportError:
        logger.error("chromadb not installed. Run: pip install chromadb langchain-google-genai")
        return None

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY not set — RAG retrieval disabled.")
        return None

    try:
        embedding_fn = GoogleGenerativeAiEmbeddingFunction(
            api_key=api_key,
            model_name="models/gemini-embedding-001"
        )
        _client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        _collection = _client.get_collection(
            name=COLLECTION_NAME,
            embedding_function=embedding_fn
        )
        logger.info(f"[RAG] Connected to ChromaDB — {_collection.count()} chunks loaded.")
        return _collection

    except Exception as e:
        logger.error(f"[RAG] Failed to connect to ChromaDB: {e}")
        logger.error("      Did you run: python rag/ingest.py ?")
        return None


# ── Public API ────────────────────────────────────────────────────────────────

def retrieve(
    query: str,
    agent: str,
    n_results: int = 4,
    sector: Optional[str] = None,
) -> List[str]:
    """
    Retrieve the most relevant document chunks for a query.

    Args:
        query:     The text to search for. Use natural language —
                   e.g. "Saudi healthcare workforce expansion policy goals"
        agent:     Which agent is querying: "PAA", "SGA", "ORA", or "CAA"
                   Only documents tagged for that agent will be searched.
        n_results: How many chunks to return. 4 is usually enough.
                   Use 5–6 for complex multi-domain queries.
        sector:    Optional sector hint (e.g. "healthcare") — not used for
                   filtering yet but logged for debugging.

    Returns:
        List of raw chunk strings. Empty list if RAG unavailable or no results.
    """
    collection = _get_collection()
    if collection is None:
        return []

    if not query or not query.strip():
        return []

    try:
        # Filter to only retrieve chunks relevant to this agent.
        # ChromaDB's $contains works on string fields —
        # agent_target is stored as e.g. "PAA" or "PAA,SGA"
        results = collection.query(
            query_texts=[query],
            n_results=n_results,
            where={"agent_target": {"$eq": agent}},
            include=["documents", "metadatas", "distances"]
        )

        if not results["documents"] or not results["documents"][0]:
            logger.debug(f"[RAG] No results for agent={agent} query='{query[:60]}...'")
            return []

        chunks    = results["documents"][0]
        distances = results["distances"][0]
        sources   = [m.get("source", "unknown") for m in results["metadatas"][0]]

        # Log what was retrieved for debugging
        logger.debug(f"[RAG] agent={agent} | retrieved {len(chunks)} chunks")
        for i, (src, dist) in enumerate(zip(sources, distances)):
            logger.debug(f"  [{i+1}] {src} (distance: {dist:.3f})")

        # Filter out very low relevance chunks (distance > 0.85 in cosine space = poor match)
        relevant = [
            chunk for chunk, dist in zip(chunks, distances)
            if dist <= 0.85
        ]

        if not relevant:
            logger.debug(f"[RAG] All chunks filtered out as irrelevant (distance > 0.85)")
            return []

        return relevant

    except Exception as e:
        logger.error(f"[RAG] Retrieval error for agent={agent}: {e}")
        return []


def retrieve_with_sources(
    query: str,
    agent: str,
    n_results: int = 4,
) -> List[dict]:
    """
    Same as retrieve() but returns dicts with text and source metadata.
    Useful for debugging or if you want to show sources in the UI.

    Returns:
        List of {"text": str, "source": str, "distance": float}
    """
    collection = _get_collection()
    if collection is None:
        return []

    try:
        results = collection.query(
            query_texts=[query],
            n_results=n_results,
            where={"agent_target": {"$eq": agent}},
            include=["documents", "metadatas", "distances"]
        )

        if not results["documents"] or not results["documents"][0]:
            return []

        return [
            {
                "text":     doc,
                "source":   meta.get("source", "unknown"),
                "filename": meta.get("filename", "unknown"),
                "distance": dist,
            }
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            )
            if dist <= 0.85
        ]

    except Exception as e:
        logger.error(f"[RAG] retrieve_with_sources error: {e}")
        return []


def format_context(chunks: List[str], max_chars: int = 3000) -> str:
    """
    Format retrieved chunks into a clean context block for prompt injection.

    Args:
        chunks:    List of chunk strings from retrieve()
        max_chars: Safety cap on total context length to avoid huge prompts.
                   3000 chars ≈ 600–700 tokens, well within Gemini's limit.

    Returns:
        Formatted string ready to inject into a prompt.
    """
    if not chunks:
        return ""

    parts = []
    total = 0

    for i, chunk in enumerate(chunks, 1):
        chunk = chunk.strip()
        if total + len(chunk) > max_chars:
            break
        parts.append(f"[Document {i}]\n{chunk}")
        total += len(chunk)

    return "\n\n---\n\n".join(parts)


def is_available() -> bool:
    """
    Check if RAG is available (ChromaDB connected and has documents).
    Agents call this to decide whether to use RAG or skip it gracefully.
    """
    collection = _get_collection()
    if collection is None:
        return False
    try:
        return collection.count() > 0
    except Exception:
        return False