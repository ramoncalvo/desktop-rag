# RAG App — https://github.com/ramoncalvo
"""PDF text extraction with page-level and Y-position metadata using PyMuPDF."""

import hashlib
from pathlib import Path

import fitz  # PyMuPDF


def get_file_hash(file_path: str) -> str:
    h = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def extract_pages(file_path: str) -> list[dict]:
    """Extract text blocks from PDF with page number and Y-position."""
    doc = fitz.open(file_path)
    blocks = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        page_height = page.rect.height
        text_blocks = page.get_text("blocks")

        for block in text_blocks:
            if block[6] != 0:
                continue
            text = block[4].strip()
            if not text or len(text) < 3:
                continue
            blocks.append({
                "page": page_num + 1,
                "y_position": round(block[1], 1),
                "text": text,
                "page_height": round(page_height, 1),
            })

    doc.close()
    return blocks


def chunk_pages(blocks: list[dict], max_chunk_words: int = 150, overlap_blocks: int = 2) -> list[dict]:
    """Group text blocks into chunks preserving page/position metadata."""
    # Merge short blocks (headers) with next block
    merged = []
    pending_header = None
    for block in blocks:
        words_count = len(block["text"].split())
        if words_count < 15 and not block["text"].rstrip().endswith("."):
            if pending_header:
                pending_header["text"] += "\n" + block["text"]
            else:
                pending_header = dict(block)
        else:
            if pending_header:
                block = dict(block)
                block["text"] = pending_header["text"] + "\n" + block["text"]
                block["y_position"] = pending_header["y_position"]
                pending_header = None
            merged.append(block)
    if pending_header:
        merged.append(pending_header)

    # Group into chunks
    chunks = []
    current_text = []
    current_words = 0
    chunk_start_page = None
    chunk_start_y = None
    chunk_page_height = None

    for block in merged:
        words = block["text"].split()
        if chunk_start_page is None:
            chunk_start_page = block["page"]
            chunk_start_y = block["y_position"]
            chunk_page_height = block["page_height"]

        current_text.append(block["text"])
        current_words += len(words)

        if current_words >= max_chunk_words:
            chunks.append({
                "text": "\n".join(current_text),
                "page": chunk_start_page,
                "y_position": chunk_start_y,
                "page_height": chunk_page_height,
                "source_type": "pdf",
            })
            overlap = current_text[-overlap_blocks:] if len(current_text) > overlap_blocks else current_text[-1:]
            current_text = list(overlap)
            current_words = sum(len(t.split()) for t in current_text)
            chunk_start_page = block["page"]
            chunk_start_y = block["y_position"]
            chunk_page_height = block["page_height"]

    if current_text:
        chunks.append({
            "text": "\n".join(current_text),
            "page": chunk_start_page,
            "y_position": chunk_start_y,
            "page_height": chunk_page_height,
            "source_type": "pdf",
        })

    return chunks


def get_pdf_title(file_path: str) -> str:
    doc = fitz.open(file_path)
    meta = doc.metadata
    title = meta.get("title", "").strip() if meta else ""

    if not title:
        if len(doc) > 0:
            page = doc[0]
            blocks = page.get_text("blocks")
            for block in blocks:
                if block[6] == 0:
                    text = block[4].strip()
                    if text and len(text) < 200:
                        title = text.split("\n")[0]
                        break

    doc.close()
    return title or Path(file_path).stem


def get_pdf_page_count(file_path: str) -> int:
    doc = fitz.open(file_path)
    count = len(doc)
    doc.close()
    return count
