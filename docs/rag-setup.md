# RAG Setup Guide

## Overview

AgentNation uses a **Retrieval-Augmented Generation (RAG)** pipeline to ground LLM outputs in real Saudi labor market documents. Without RAG, agents still work but responses are based purely on Gemini's training data.

## Step 1 — Add Documents

Place PDF documents into the appropriate subfolder under `backend/rag/documents/`:

```
rag/documents/
├── paa/    ← Policy analysis context
├── ora/    ← Alternatives & recommendations context
├── caa/    ← Comparative assessment context
└── sga/    ← Scenario generation context
```

The `agent_target` metadata is set from the folder name during ingestion, so each agent only retrieves from its own documents.

### Recommended Documents

**PAA (`paa/`)**
- HRSD labor market reports
- Saudi Youth Statistics
- Healthcare workforce statistics
- Sector-specific workforce data

**ORA (`ora/`)**
- WEF reskilling white papers
- ILO reports on workforce transitions
- Germany's dual vocational training system study
- Singapore SkillsFuture case studies

**CAA (`caa/`)**
- OECD Employment Outlook
- Saudi digital transformation strategy reports
- Employment environment factsheets

**SGA (`sga/`)**
- Human Capability Development Program delivery plan
- HRDF annual reports
- Adult skills and learning statistics

## Step 2 — Run Ingestion

```bash
cd backend
source .venv/bin/activate
python rag/ingest.py
```

The script will:
1. Recursively find all `.pdf` files under `rag/documents/`
2. Extract text using `pypdf`
3. Split into 800-character chunks with 100-character overlap
4. Embed each chunk with `gemini-embedding-001`
5. Store in `rag/chroma_db/` with metadata: `source`, `filename`, `agent_target`

Expected output:
```
[RAG] Found 40 documents across 4 agent folders
[RAG] Ingesting paa/ — 12 documents...
[RAG] Ingesting ora/ — 8 documents...
...
[RAG] Ingestion complete. Total chunks: 1,847
```

## Step 3 — Verify

```bash
python rag/test_rag.py
```

This runs a test query for each agent and prints the top-3 retrieved chunks.

## Updating Documents

To add new documents without re-ingesting everything, run `ingest.py` again — it uses an upsert strategy that skips already-embedded chunks by filename hash.

To do a full re-index:
```bash
rm -rf rag/chroma_db/
python rag/ingest.py
```

## Troubleshooting

**"ChromaDB not available"** — Run `ingest.py` first.

**"GEMINI_API_KEY not set"** — Check your `.env` file.

**Poor retrieval quality** — Try reducing the cosine distance threshold in `retriever.py` (default: 0.85). Lower = stricter.
