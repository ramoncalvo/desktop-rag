# RAG App — https://github.com/ramoncalvo
"""Extract transcripts from local video files using OpenAI Whisper."""

import hashlib
import io
import os
import sys
import re

import whisper

_model: whisper.Whisper | None = None
MODEL_NAME = "base"


def _get_model(progress_callback=None) -> whisper.Whisper:
    global _model
    if _model is None:
        if progress_callback:
            progress_callback("Cargando modelo Whisper...")
        _model = whisper.load_model(MODEL_NAME)
    return _model


class _TqdmCapture(io.StringIO):
    """Captures tqdm output and forwards to a callback."""
    def __init__(self, callback):
        super().__init__()
        self.callback = callback

    def write(self, s):
        if not s or s.strip() == "":
            return len(s)
        # Extract percentage and language detection from tqdm/whisper output
        s_clean = s.strip()
        if s_clean:
            # Parse tqdm progress: "30%|███| 19620/66427 [00:05<00:13, 3512.83frames/s]"
            pct_match = re.search(r"(\d+)%\|", s_clean)
            lang_match = re.search(r"Detected language: (\w+)", s_clean)
            if lang_match:
                self.callback(f"Idioma detectado: {lang_match.group(1)}")
            elif pct_match:
                self.callback(f"Transcribiendo... {pct_match.group(1)}%")
            elif "frames/s" not in s_clean and len(s_clean) > 2:
                self.callback(s_clean)
        return len(s)

    def flush(self):
        pass


def get_file_hash(file_path: str) -> str:
    h = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


SUPPORTED_VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".m4a", ".mp3", ".wav", ".flac", ".ogg"}


def is_video_file(file_path: str) -> bool:
    ext = os.path.splitext(file_path)[1].lower()
    return ext in SUPPORTED_VIDEO_EXTENSIONS


def transcribe(file_path: str, progress_callback=None) -> dict:
    """Transcribe a video/audio file. Returns {segments, text, duration}."""
    if progress_callback:
        progress_callback(f"Transcribiendo {os.path.basename(file_path)}...")

    model = _get_model(progress_callback)

    # Redirect stderr to capture tqdm progress from Whisper
    old_stderr = sys.stderr
    if progress_callback:
        sys.stderr = _TqdmCapture(progress_callback)

    try:
        result = model.transcribe(file_path, language=None, verbose=False)
    finally:
        sys.stderr = old_stderr

    if progress_callback:
        progress_callback(f"Transcripcion completa: {os.path.basename(file_path)}")

    return {
        "text": result["text"],
        "segments": result["segments"],
        "duration_sec": int(result["segments"][-1]["end"]) if result["segments"] else 0,
    }


def _fmt_timestamp(seconds: float) -> str:
    """Format seconds as MM:SS."""
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m}:{s:02d}"


def chunk_transcript(segments: list[dict], chunk_size: int = 500, overlap: int = 100) -> list[dict]:
    """Convert Whisper segments into overlapping text chunks with precise timestamps."""
    words_with_time = []
    for seg in segments:
        for word in seg["text"].split():
            words_with_time.append({"word": word, "start": seg["start"]})

    chunks = []
    start = 0
    while start < len(words_with_time):
        end = min(start + chunk_size, len(words_with_time))
        chunk_words = words_with_time[start:end]
        text = " ".join(w["word"] for w in chunk_words)
        if text.strip():
            start_sec = chunk_words[0]["start"]
            end_sec = chunk_words[-1]["start"]
            chunks.append({
                "text": text.strip(),
                "start_sec": int(start_sec),
                "end_sec": int(end_sec),
                "start_ts": _fmt_timestamp(start_sec),
                "end_ts": _fmt_timestamp(end_sec),
                "start_min": int(start_sec // 60),
                "end_min": int(end_sec // 60),
                "source_type": "video",
            })
        start += chunk_size - overlap
    return chunks


def get_video_title(file_path: str) -> str:
    """Try to extract title from video metadata, fallback to filename."""
    try:
        import subprocess
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", file_path],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0:
            import json
            data = json.loads(result.stdout)
            tags = data.get("format", {}).get("tags", {})
            title = tags.get("title") or tags.get("TITLE") or ""
            if title.strip():
                return title.strip()
    except Exception:
        pass
    return os.path.splitext(os.path.basename(file_path))[0]
