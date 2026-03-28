# rag-app®

App de escritorio para hacer preguntas sobre tus documentos (PDFs y videos) usando un LLM local con Ollama.

## Ramas

| Rama | UI | Descripcion |
|------|-----|-------------|
| `main` | Tkinter | Monolito Python, empaquetable con PyInstaller |
| `tauri` | React + Tailwind + Tauri | UI moderna con shell Rust (12MB) + backend FastAPI |

## Stack (rama tauri)

| Capa | Tecnologia |
|------|------------|
| Shell | Tauri v2 (Rust) |
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Backend | FastAPI (Python) |
| LLM | Ollama (localhost:11434) |
| Vector DB | ChromaDB embebido |
| Base de datos | SQLite |
| Embeddings | sentence-transformers (multilingual) |
| Transcripcion | OpenAI Whisper |
| PDFs | PyMuPDF |

## Requisitos

- Python 3.11+
- Node.js 18+
- Rust (para compilar Tauri)
- [Ollama](https://ollama.com) instalado
- macOS / Linux / Windows

## Instalacion

```bash
# Backend (Python)
conda create -n desktop-rag python=3.11 -y
conda activate desktop-rag
pip install -r requirements.txt

# Frontend (Node)
cd frontend
npm install
```

## Uso en desarrollo

```bash
# Terminal 1: backend
conda activate desktop-rag
python backend/server.py

# Terminal 2: frontend
cd frontend && npm run dev

# Terminal 3: Tauri shell
CONDA_PREFIX=$CONDA_PREFIX cargo tauri dev
```

## Pantallas

1. **Login** — pantalla de inicio (por ahora solo click "Entrar")
2. **Setup** — verifica Ollama, descarga modelo seleccionado
3. **Chat** — pregunta sobre documentos, respuestas con fuentes y timestamps
4. **Fuentes** — seleccionar carpeta, escanear e indexar PDFs/videos
5. **Settings** — modelo Ollama, modelos descargados, directorio de datos
6. **Creditos** — autor, version, stack tecnologico

## Indexar documentos

1. Ve a la pestana **Fuentes**
2. Selecciona una carpeta con PDFs o videos (mp4, mkv, avi, mov, etc.)
3. Click en **Escanear e indexar** — solo procesa archivos nuevos
4. PDFs se extraen con PyMuPDF, videos se transcriben con Whisper (timestamps precisos)

## Compilar

### Frontend + Tauri (macOS)

```bash
conda activate desktop-rag
cd frontend && npm run build && cd ..
cargo tauri build
```

Binario en `src-tauri/target/release/rag-app`.

### Frontend + Tauri (Windows)

```powershell
cd frontend; npm run build; cd ..
cargo tauri build
```

### Rama main (Tkinter + PyInstaller)

```bash
# macOS
pyinstaller --onedir --windowed --name "RAG App" --add-data "core:core" --add-data "ui:ui" app.py

# Windows (separador ; en lugar de :)
pyinstaller --onedir --windowed --name "RAG App" --add-data "core;core" --add-data "ui;ui" --icon=NONE app.py
```

## Datos

Todo se guarda en `~/.rag-app/`:
- `data.db` — SQLite (sesiones, mensajes, archivos indexados, settings)
- `chroma_db/` — vectores ChromaDB

## Modelos soportados

| Modelo | Tamano | Notas |
|--------|--------|-------|
| llama3.1:8b | ~4.7 GB | Default, buen balance |
| llama3.2:3b | ~2 GB | Rapido, menos memoria |
| mistral:7b | ~4.1 GB | Alternativa solida |
| gemma2:9b | ~5.4 GB | Google |
| qwen2.5:7b | ~4.4 GB | Bueno para multilingue |

## Autor

**Ramon Calvo** — [github.com/ramoncalvo](https://github.com/ramoncalvo)

## Licencia

©2025 rag-app — Todos los derechos reservados.
