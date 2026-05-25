import os
import fitz  # PyMuPDF
import chromadb
from chromadb.utils.embedding_functions import GoogleGenerativeAiEmbeddingFunction
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Each folder maps to which agents use those docs
AGENT_FOLDERS = {
    "paa": ["PAA"],
    "sga": ["SGA"],
    "ora": ["ORA"],
    "caa": ["CAA"],
}

def extract_text_from_pdf(pdf_path: str) -> str:
    doc = fitz.open(pdf_path)
    return "\n".join(page.get_text() for page in doc)

def ingest_all():
    embedding_fn = GoogleGenerativeAiEmbeddingFunction(
        api_key=os.getenv("GEMINI_API_KEY"),
        model_name="models/gemini-embedding-001"
    )
    
    client = chromadb.PersistentClient(path="rag/chroma_db")
    collection = client.get_or_create_collection(
        name="agentnation_rag",
        embedding_function=embedding_fn
    )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=75,
        separators=["\n\n", "\n", ". ", " "]
    )

    docs_root = Path("rag/documents")
    chunk_id = 0

    for folder_name, agent_targets in AGENT_FOLDERS.items():
        folder = docs_root / folder_name
        if not folder.exists():
            continue

        for pdf_file in folder.glob("*.pdf"):
            print(f"Processing: {pdf_file.name}")
            raw_text = extract_text_from_pdf(str(pdf_file))
            chunks = splitter.split_text(raw_text)

            for chunk in chunks:
                if len(chunk.strip()) < 100:  # skip tiny fragments
                    continue
                
                collection.add(
                    documents=[chunk],
                    metadatas=[{
                        "source": pdf_file.stem,
                        "agent_target": ",".join(agent_targets),
                        "folder": folder_name,
                    }],
                    ids=[f"chunk_{chunk_id}"]
                )
                chunk_id += 1

    print(f"Done. {chunk_id} chunks stored.")

if __name__ == "__main__":
    ingest_all()