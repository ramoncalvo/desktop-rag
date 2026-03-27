# RAG App — https://github.com/ramoncalvo
"""Manage Ollama: check if running, start it, pull models."""

import platform
import shutil
import subprocess
import time

import requests

OLLAMA_URL = "http://localhost:11434"
DEFAULT_MODEL = "llama3.1:8b"


def is_ollama_installed() -> bool:
    return shutil.which("ollama") is not None


def is_ollama_running() -> bool:
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def start_ollama() -> bool:
    """Start ollama serve in background. Returns True if started successfully."""
    if is_ollama_running():
        return True
    try:
        subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        for _ in range(30):
            time.sleep(1)
            if is_ollama_running():
                return True
        return False
    except Exception:
        return False


def list_local_models() -> list[str]:
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        if r.status_code == 200:
            data = r.json()
            return [m["name"] for m in data.get("models", [])]
    except Exception:
        pass
    return []


def is_model_available(model: str) -> bool:
    models = list_local_models()
    for m in models:
        if m == model or m.startswith(model.split(":")[0]):
            return True
    return False


def pull_model(model: str, progress_callback=None) -> bool:
    """Pull a model from Ollama. progress_callback(status_text) is called with updates."""
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/pull",
            json={"name": model},
            stream=True,
            timeout=600,
        )
        for line in r.iter_lines():
            if line and progress_callback:
                import json
                try:
                    data = json.loads(line)
                    status = data.get("status", "")
                    total = data.get("total", 0)
                    completed = data.get("completed", 0)
                    if total > 0:
                        pct = int(completed / total * 100)
                        progress_callback(f"{status} {pct}%")
                    else:
                        progress_callback(status)
                except Exception:
                    pass
        return is_model_available(model)
    except Exception:
        return False


def get_install_instructions() -> str:
    system = platform.system()
    if system == "Darwin":
        return "Instala Ollama desde https://ollama.com/download/mac o con:\n  brew install ollama"
    elif system == "Linux":
        return "Instala Ollama con:\n  curl -fsSL https://ollama.com/install.sh | sh"
    elif system == "Windows":
        return "Descarga Ollama desde https://ollama.com/download/windows"
    return "Visita https://ollama.com para instrucciones de instalacion."
