# RAG App — https://github.com/ramoncalvo
"""FastAPI backend that wraps core/ for the Tauri frontend."""

import json
import os
import sys

# Add parent dir to path so core/ is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from core import database, rag, pdf_processor, video_processor
from core import llm as llm_service
from core import ollama_manager

app = FastAPI(title="RAG App Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Models ---

class MessageRequest(BaseModel):
    content: str

class SessionCreate(BaseModel):
    title: str | None = None

class SessionRename(BaseModel):
    title: str

class IndexRequest(BaseModel):
    folder_path: str

class OllamaSetup(BaseModel):
    model: str


# --- Startup ---

@app.on_event("startup")
def startup():
    database.init_db()


# --- Ollama ---

@app.get("/api/ollama/status")
def ollama_status():
    installed = ollama_manager.is_ollama_installed()
    running = ollama_manager.is_ollama_running()
    models = ollama_manager.list_local_models() if running else []
    saved_model = database.get_setting("ollama_model", "")
    return {
        "installed": installed,
        "running": running,
        "models": models,
        "saved_model": saved_model,
    }


@app.post("/api/ollama/start")
def ollama_start():
    if ollama_manager.is_ollama_running():
        return {"ok": True, "message": "Ya esta corriendo"}
    ok = ollama_manager.start_ollama()
    if not ok:
        raise HTTPException(500, "No se pudo iniciar Ollama")
    return {"ok": True}


@app.post("/api/ollama/pull")
def ollama_pull(body: OllamaSetup):
    if ollama_manager.is_model_available(body.model):
        database.set_setting("ollama_model", body.model)
        return {"ok": True, "message": "Modelo ya disponible"}
    ok = ollama_manager.pull_model(body.model)
    if not ok:
        raise HTTPException(500, f"No se pudo descargar {body.model}")
    database.set_setting("ollama_model", body.model)
    return {"ok": True}


# --- Chat Sessions ---

@app.get("/api/sessions")
def list_sessions():
    return database.list_sessions()


@app.post("/api/sessions")
def create_session(body: SessionCreate = SessionCreate()):
    return database.create_session(body.title or "Nuevo Chat")


@app.get("/api/sessions/{session_id}/messages")
def get_messages(session_id: str):
    return database.get_messages(session_id)


@app.post("/api/sessions/{session_id}/messages")
def send_message(session_id: str, body: MessageRequest):
    # Save user message
    database.add_message(session_id, "user", body.content)

    # RAG query
    model = database.get_setting("ollama_model", "llama3.1:8b")
    context, sources = rag.query_context(body.content)

    if context:
        result = llm_service.generate_answer(body.content, context, model=model)
        answer_text = result["text"]
        actions = result["actions"] if result["actions"] else None
    else:
        answer_text = "No tengo documentos indexados con informacion relevante. Indexa documentos primero desde la pestana Fuentes."
        actions = None

    sources_json = json.dumps(sources) if sources else None
    actions_json = json.dumps(actions) if actions else None

    assistant_msg = database.add_message(
        session_id, "assistant", answer_text,
        sources=sources_json, actions=actions_json,
    )

    # Auto-title
    sessions = database.list_sessions()
    for s in sessions:
        if s["id"] == session_id and s["title"] == "Nuevo Chat":
            database.rename_session(session_id, body.content[:80])
            break

    return assistant_msg


@app.patch("/api/sessions/{session_id}")
def rename_session(session_id: str, body: SessionRename):
    database.rename_session(session_id, body.title[:100])
    return {"ok": True}


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str):
    database.delete_session(session_id)
    return {"ok": True}


# --- Indexing ---

@app.get("/api/files")
def list_files():
    return database.list_indexed_files()


@app.post("/api/index")
def index_folder(body: IndexRequest):
    folder = body.folder_path
    if not os.path.isdir(folder):
        raise HTTPException(400, "Carpeta no valida")

    database.set_setting("index_folder", folder)

    supported_ext = {".pdf"} | video_processor.SUPPORTED_VIDEO_EXTENSIONS
    all_files = []
    for root, _, filenames in os.walk(folder):
        for fname in filenames:
            ext = os.path.splitext(fname)[1].lower()
            if ext in supported_ext:
                all_files.append(os.path.join(root, fname))

    new_files = [f for f in all_files if not database.is_file_indexed(f)]
    indexed = []

    for file_path in new_files:
        fname = os.path.basename(file_path)
        ext = os.path.splitext(fname)[1].lower()
        try:
            if ext == ".pdf":
                result = _index_pdf(file_path, folder)
            else:
                result = _index_video(file_path, folder)
            if result:
                indexed.append(result)
        except Exception as e:
            print(f"Error indexing {fname}: {e}")

    return {
        "total_found": len(all_files),
        "new_indexed": len(indexed),
        "files": indexed,
    }


@app.delete("/api/files/{file_id}")
def delete_file(file_id: str):
    rag.delete_file_chunks(file_id)
    database.delete_indexed_file(file_id)
    return {"ok": True}


# --- Document viewer ---

@app.get("/api/files/{file_id}/raw")
def get_file_raw(file_id: str):
    """Serve the original file (PDF, etc.) for embedding in the viewer."""
    file_info = database.get_indexed_file(file_id)
    if not file_info:
        raise HTTPException(404, "Archivo no encontrado")

    file_path = file_info["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(404, "Archivo no encontrado en disco")

    media_types = {
        "pdf": "application/pdf",
    }
    media_type = media_types.get(file_info["file_type"], "application/octet-stream")

    from starlette.responses import Response

    with open(file_path, "rb") as f:
        content = f.read()

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": "inline"},
    )


@app.get("/api/files/{file_id}/content")
def get_file_content(file_id: str, page: int | None = None):
    """Return document content for the viewer. PDFs return pages with text, others return raw text."""
    file_info = database.get_indexed_file(file_id)
    if not file_info:
        raise HTTPException(404, "Archivo no encontrado")

    file_path = file_info["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(404, "Archivo no encontrado en disco")

    if file_info["file_type"] == "pdf":
        import fitz
        doc = fitz.open(file_path)
        total_pages = len(doc)

        if page is not None:
            # Return single page
            if page < 1 or page > total_pages:
                doc.close()
                raise HTTPException(400, f"Pagina fuera de rango (1-{total_pages})")
            p = doc[page - 1]
            blocks = p.get_text("blocks")
            text_blocks = []
            for b in blocks:
                if b[6] == 0 and b[4].strip():
                    text_blocks.append({
                        "text": b[4].strip(),
                        "y": round(b[1], 1),
                        "x": round(b[0], 1),
                    })
            doc.close()
            return {
                "file_id": file_id,
                "title": file_info["title"],
                "file_type": "pdf",
                "total_pages": total_pages,
                "page": page,
                "blocks": text_blocks,
            }
        else:
            # Return all pages summary
            pages = []
            for i in range(total_pages):
                p = doc[i]
                text = p.get_text().strip()
                preview = text[:200] if text else ""
                pages.append({"page": i + 1, "preview": preview, "char_count": len(text)})
            doc.close()
            return {
                "file_id": file_id,
                "title": file_info["title"],
                "file_type": "pdf",
                "total_pages": total_pages,
                "pages": pages,
            }
    else:
        # For non-PDF (video transcripts), return the indexed chunks as text
        collection = rag.get_collection()
        results = collection.get(where={"file_id": file_id}, include=["documents", "metadatas"])
        segments = []
        if results and results["documents"]:
            for doc_text, meta in sorted(
                zip(results["documents"], results["metadatas"]),
                key=lambda x: x[1].get("start_sec", x[1].get("start_min", 0)),
            ):
                segments.append({
                    "text": doc_text,
                    "start_ts": meta.get("start_ts", f"{meta.get('start_min', 0)}min"),
                    "end_ts": meta.get("end_ts", f"{meta.get('end_min', 0)}min"),
                })
        return {
            "file_id": file_id,
            "title": file_info["title"],
            "file_type": file_info["file_type"],
            "segments": segments,
        }


# --- Settings ---

@app.get("/api/settings/{key}")
def get_setting(key: str):
    return {"key": key, "value": database.get_setting(key, "")}


# --- Health ---

@app.get("/api/health")
def health():
    return {"status": "ok"}


# --- Helpers ---

def _index_pdf(file_path: str, folder: str) -> dict | None:
    file_hash = pdf_processor.get_file_hash(file_path)
    blocks = pdf_processor.extract_pages(file_path)
    if not blocks:
        return None

    chunks = pdf_processor.chunk_pages(blocks)
    title = pdf_processor.get_pdf_title(file_path)
    page_count = pdf_processor.get_pdf_page_count(file_path)

    file_id = database.add_indexed_file(
        file_path=file_path,
        file_name=os.path.basename(file_path),
        file_type="pdf",
        file_hash=file_hash,
        title=title,
        chunk_count=len(chunks),
        page_count=page_count,
        duration_sec=0,
        folder_path=folder,
    )
    rag.index_chunks(file_id, file_path, title, chunks)
    return {"file_id": file_id, "title": title, "type": "pdf", "chunks": len(chunks)}


def _index_video(file_path: str, folder: str) -> dict | None:
    file_hash = video_processor.get_file_hash(file_path)
    result = video_processor.transcribe(file_path)
    if not result["segments"]:
        return None

    chunks = video_processor.chunk_transcript(result["segments"])
    title = video_processor.get_video_title(file_path)

    file_id = database.add_indexed_file(
        file_path=file_path,
        file_name=os.path.basename(file_path),
        file_type=os.path.splitext(file_path)[1].lstrip("."),
        file_hash=file_hash,
        title=title,
        chunk_count=len(chunks),
        page_count=0,
        duration_sec=result["duration_sec"],
        folder_path=folder,
    )
    rag.index_chunks(file_id, file_path, title, chunks)
    return {"file_id": file_id, "title": title, "type": "video", "chunks": len(chunks)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5555)
