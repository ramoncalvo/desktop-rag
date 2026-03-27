# RAG App — https://github.com/ramoncalvo
"""SQLite database for tracking indexed files, chat sessions, and messages."""

import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

DB_DIR = Path.home() / ".rag-app"
DB_PATH = DB_DIR / "data.db"


def _get_conn() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS indexed_files (
            id TEXT PRIMARY KEY,
            file_path TEXT NOT NULL UNIQUE,
            file_name TEXT NOT NULL,
            file_type TEXT NOT NULL,          -- 'pdf', 'mp4', 'mkv', 'avi', etc.
            file_hash TEXT NOT NULL,
            title TEXT,
            chunk_count INTEGER DEFAULT 0,
            page_count INTEGER DEFAULT 0,
            duration_sec INTEGER DEFAULT 0,
            folder_path TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS chat_sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT 'Nuevo Chat',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            sources TEXT,       -- JSON string
            actions TEXT,       -- JSON string
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS suggested_topics (
            id TEXT PRIMARY KEY,
            file_id TEXT NOT NULL REFERENCES indexed_files(id) ON DELETE CASCADE,
            topic TEXT NOT NULL,
            description TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    """)
    conn.commit()
    conn.close()


# --- Indexed files ---

def is_file_indexed(file_path: str) -> bool:
    conn = _get_conn()
    row = conn.execute("SELECT 1 FROM indexed_files WHERE file_path = ?", (file_path,)).fetchone()
    conn.close()
    return row is not None


def add_indexed_file(file_path: str, file_name: str, file_type: str,
                     file_hash: str, title: str, chunk_count: int,
                     page_count: int, duration_sec: int, folder_path: str) -> str:
    file_id = f"{file_type}_{uuid.uuid4().hex[:12]}"
    now = datetime.now().isoformat()
    conn = _get_conn()
    conn.execute(
        "INSERT INTO indexed_files (id, file_path, file_name, file_type, file_hash, title, chunk_count, page_count, duration_sec, folder_path, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (file_id, file_path, file_name, file_type, file_hash, title, chunk_count, page_count, duration_sec, folder_path, now),
    )
    conn.commit()
    conn.close()
    return file_id


def list_indexed_files(folder_path: str | None = None) -> list[dict]:
    conn = _get_conn()
    if folder_path:
        rows = conn.execute(
            "SELECT * FROM indexed_files WHERE folder_path = ? ORDER BY created_at DESC",
            (folder_path,),
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM indexed_files ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_indexed_file(file_id: str):
    conn = _get_conn()
    conn.execute("DELETE FROM indexed_files WHERE id = ?", (file_id,))
    conn.commit()
    conn.close()


def get_indexed_file(file_id: str) -> dict | None:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM indexed_files WHERE id = ?", (file_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


# --- Chat sessions ---

def create_session(title: str = "Nuevo Chat") -> dict:
    sid = uuid.uuid4().hex
    now = datetime.now().isoformat()
    conn = _get_conn()
    conn.execute(
        "INSERT INTO chat_sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
        (sid, title, now, now),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM chat_sessions WHERE id = ?", (sid,)).fetchone()
    conn.close()
    return dict(row)


def list_sessions() -> list[dict]:
    conn = _get_conn()
    rows = conn.execute("SELECT * FROM chat_sessions ORDER BY updated_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def rename_session(session_id: str, title: str):
    now = datetime.now().isoformat()
    conn = _get_conn()
    conn.execute("UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?", (title, now, session_id))
    conn.commit()
    conn.close()


def delete_session(session_id: str):
    conn = _get_conn()
    conn.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()


# --- Chat messages ---

def add_message(session_id: str, role: str, content: str,
                sources: str | None = None, actions: str | None = None) -> dict:
    mid = uuid.uuid4().hex
    now = datetime.now().isoformat()
    conn = _get_conn()
    conn.execute(
        "INSERT INTO chat_messages (id, session_id, role, content, sources, actions, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (mid, session_id, role, content, sources, actions, now),
    )
    conn.execute("UPDATE chat_sessions SET updated_at = ? WHERE id = ?", (now, session_id))
    conn.commit()
    row = conn.execute("SELECT * FROM chat_messages WHERE id = ?", (mid,)).fetchone()
    conn.close()
    return dict(row)


def get_messages(session_id: str) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at",
        (session_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# --- Settings ---

def get_setting(key: str, default: str = "") -> str:
    conn = _get_conn()
    row = conn.execute("SELECT value FROM app_settings WHERE key = ?", (key,)).fetchone()
    conn.close()
    return row["value"] if row else default


def set_setting(key: str, value: str):
    conn = _get_conn()
    conn.execute(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
        (key, value),
    )
    conn.commit()
    conn.close()
