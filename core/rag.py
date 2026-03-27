# RAG App — https://github.com/ramoncalvo
"""ChromaDB embedded vector store for RAG."""

import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
from pathlib import Path

CHROMA_DIR = Path.home() / ".rag-app" / "chroma_db"
COLLECTION_NAME = "rag_docs"

_client: chromadb.ClientAPI | None = None


def _get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return _client


def _get_embedding_fn():
    return SentenceTransformerEmbeddingFunction(
        model_name="paraphrase-multilingual-MiniLM-L12-v2"
    )


def get_collection():
    client = _get_client()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=_get_embedding_fn(),
    )


def index_chunks(file_id: str, file_path: str, title: str, chunks: list[dict]) -> int:
    """Index document chunks. Each chunk has: text, page (or start_min/end_min), and optional y_position/page_height."""
    collection = get_collection()

    existing = collection.get(where={"file_id": file_id})
    if existing and existing["ids"]:
        return len(existing["ids"])

    ids = [f"{file_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = []
    for i, c in enumerate(chunks):
        meta = {
            "file_id": file_id,
            "file_path": file_path,
            "title": title,
            "chunk": i,
            "start_min": c.get("start_min", c.get("page", 0)),
            "end_min": c.get("end_min", c.get("page", 0)),
            "source_type": c.get("source_type", "pdf"),
        }
        if "start_sec" in c:
            meta["start_sec"] = c["start_sec"]
        if "end_sec" in c:
            meta["end_sec"] = c["end_sec"]
        if "start_ts" in c:
            meta["start_ts"] = c["start_ts"]
        if "end_ts" in c:
            meta["end_ts"] = c["end_ts"]
        if "page" in c:
            meta["page"] = c["page"]
        if "y_position" in c:
            meta["y_position"] = c["y_position"]
        if "page_height" in c:
            meta["page_height"] = c["page_height"]
        metadatas.append(meta)

    docs = [c["text"] for c in chunks]

    batch_size = 50
    for i in range(0, len(chunks), batch_size):
        end = i + batch_size
        collection.upsert(ids=ids[i:end], documents=docs[i:end], metadatas=metadatas[i:end])

    return len(chunks)


def query_context(question: str, n_results: int = 8) -> tuple[str, list[dict]]:
    collection = get_collection()
    if collection.count() == 0:
        return "", []

    results = collection.query(query_texts=[question], n_results=n_results)

    if not results["documents"] or not results["documents"][0]:
        return "", []

    context_parts = []
    sources = []
    seen = set()

    for chunk, meta in zip(results["documents"][0], results["metadatas"][0]):
        title = meta.get("title", "")
        source_type = meta.get("source_type", "pdf")
        start = meta.get("start_min", 0)
        end = meta.get("end_min", 0)
        start_ts = meta.get("start_ts", "")
        end_ts = meta.get("end_ts", "")

        if source_type == "pdf":
            page = meta.get("page", 1)
            header = f"[PDF: {title} | pagina {page}]"
        elif source_type == "video":
            ts_label = f"{start_ts}-{end_ts}" if start_ts else f"min {start}-{end}"
            header = f"[Video: {title} | {ts_label}]"
        else:
            header = f"[{title} | seccion {start}-{end}]"

        context_parts.append(f"{header}\n{chunk}")

        key = f"{meta['file_id']}_{meta.get('start_sec', start)}_{meta.get('end_sec', end)}"
        if source_type == "pdf":
            key = f"{meta['file_id']}_p{meta.get('page', 0)}_{meta.get('y_position', 0)}"

        if key not in seen:
            seen.add(key)
            source = {
                "file_id": meta["file_id"],
                "title": meta.get("title"),
                "start_min": start,
                "end_min": end,
                "file_path": meta.get("file_path", ""),
                "snippet": chunk[:300],
                "source_type": source_type,
            }
            if source_type == "video":
                source["start_sec"] = meta.get("start_sec", start * 60)
                source["end_sec"] = meta.get("end_sec", end * 60)
                source["start_ts"] = start_ts
                source["end_ts"] = end_ts
            if source_type == "pdf":
                source["page"] = meta.get("page", 1)
                source["y_position"] = meta.get("y_position", 0)
                source["page_height"] = meta.get("page_height", 842)
            sources.append(source)

    context = "\n\n---\n\n".join(context_parts)
    return context, sources


def delete_file_chunks(file_id: str):
    collection = get_collection()
    existing = collection.get(where={"file_id": file_id})
    if existing and existing["ids"]:
        collection.delete(ids=existing["ids"])


def get_file_samples(chunks_per_file: int = 3) -> list[dict]:
    collection = get_collection()
    if collection.count() == 0:
        return []

    all_data = collection.get(include=["documents", "metadatas"])
    files: dict[str, dict] = {}

    for doc, meta in zip(all_data["documents"], all_data["metadatas"]):
        fid = meta["file_id"]
        if fid not in files:
            files[fid] = {
                "file_id": fid,
                "title": meta.get("title", fid),
                "chunks": [],
            }
        if len(files[fid]["chunks"]) < chunks_per_file:
            files[fid]["chunks"].append(doc)

    return list(files.values())
