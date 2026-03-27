# RAG App — Contexto para App de Escritorio (Monolito Tkinter)

## Objetivo

App de escritorio monolitica con Python/Tkinter que funciona como un RAG local.
Sin Docker, sin servidor web, sin auth. Todo corre en un solo proceso.
Usa Ollama como LLM local y ChromaDB embebido para vectores.

## Arquitectura

```
rag-app/
├── app.py                    # Entry point — verifica Ollama, init DB, abre UI
├── ui/
│   ├── main_window.py        # Ventana principal: sidebar sesiones + tabs
│   ├── chat_tab.py           # Chat con el RAG (mensajes + input)
│   ├── indexer_tab.py        # Selector de carpeta + escaneo + progreso
│   └── setup_dialog.py       # Frame inicial: verificar/instalar/arrancar Ollama + modelo
├── core/
│   ├── database.py           # SQLite (sesiones, mensajes, archivos indexados, settings)
│   ├── llm.py                # Cliente Ollama via API OpenAI-compatible
│   ├── rag.py                # ChromaDB embebido para busqueda semantica
│   ├── pdf_processor.py      # Extraccion texto PDF con metadata pagina/posicion (PyMuPDF)
│   ├── video_processor.py    # Extraccion transcript de video/audio (Whisper)
│   └── ollama_manager.py     # Verificar/instalar/arrancar Ollama + descargar modelos
└── requirements.txt
```

## Stack tecnologico

| Componente     | Tecnologia                                       |
|----------------|--------------------------------------------------|
| UI             | Tkinter (incluido en Python)                     |
| LLM            | Ollama local (API OpenAI-compatible en :11434)   |
| Vector DB      | ChromaDB embebido (PersistentClient)             |
| Base de datos  | SQLite (una sola DB en ~/.rag-app/data.db)       |
| Embeddings     | sentence-transformers (paraphrase-multilingual)   |
| PDF            | PyMuPDF (fitz) — extraccion de texto             |
| Transcripcion  | OpenAI Whisper (modelo base, local)              |

## Almacenamiento

Todo en `~/.rag-app/`:
- `data.db` — SQLite con tablas: indexed_files, chat_sessions, chat_messages, suggested_topics, app_settings
- `chroma_db/` — directorio de persistencia de ChromaDB

## Tablas SQLite

### indexed_files
Registra cada archivo procesado para no re-indexar.
- id, file_path (UNIQUE), file_name, file_type (pdf/mp4/mkv/etc), file_hash
- title, chunk_count, page_count, duration_sec, folder_path, created_at

### chat_sessions
- id, title, created_at, updated_at

### chat_messages
- id, session_id (FK), role, content, sources (JSON), actions (JSON), created_at

### app_settings
- key, value — guarda ollama_model, index_folder, etc.

## Flujo principal

1. `app.py` arranca → init SQLite → verifica si Ollama esta corriendo con modelo guardado
2. Si falta Ollama o modelo → muestra `SetupFrame` (instalar, arrancar, descargar modelo)
3. Una vez listo → muestra `MainWindow`:
   - **Sidebar izquierdo**: lista de sesiones (crear, renombrar, eliminar con click derecho)
   - **Tab Chat**: escribir pregunta → busca en ChromaDB → genera respuesta con Ollama
   - **Tab Fuentes**: seleccionar carpeta, escanear PDFs/videos, indexar los nuevos
4. Al indexar: escanea carpeta recursivamente → filtra archivos ya indexados → procesa nuevos:
   - PDFs: extrae texto por pagina con posicion Y (PyMuPDF) → chunks → ChromaDB
   - Videos/Audio: transcribe con Whisper → chunks con timestamps → ChromaDB

## Formato de respuesta del LLM

El LLM responde en JSON:
```json
{
  "text": "Respuesta del asistente...",
  "actions": []
}
```

## Componentes de la UI

### 1. SetupFrame (`ui/setup_dialog.py`)
- Frame embebido en root (no Toplevel)
- Verifica si Ollama esta instalado y corriendo
- Selector de modelo (llama3.1:8b, llama3.2:3b, mistral:7b, etc.)
- Boton para arrancar Ollama y descargar modelo
- Barra de progreso para descarga
- Si falta instalar: muestra instrucciones segun OS

### 2. MainWindow (`ui/main_window.py`)
- PanedWindow: sidebar (260px) + content area
- Sidebar: Listbox con sesiones, boton "+ Nuevo"
- Content: Notebook con tabs (Chat, Fuentes)
- Status bar inferior: modelo activo + estado

### 3. ChatTab (`ui/chat_tab.py`)
- Text widget readonly para mostrar mensajes (user vs assistant)
- Text input + boton Enviar + boton Cancelar
- Enter para enviar, Shift+Enter para nueva linea
- Sources renderizadas debajo de cada respuesta
- Consulta en hilo separado para no bloquear la UI

### 4. IndexerTab (`ui/indexer_tab.py`)
- Selector de carpeta con Entry readonly + boton Browse
- Boton "Escanear e indexar nuevos" + boton "Detener"
- Barra de progreso + label de estado
- TreeView con archivos indexados (titulo, tipo, chunks, ruta)
- Boton "Eliminar seleccionado" — borra de SQLite + ChromaDB

## Dependencias Python

```
openai>=1.0.0              # Cliente para API de Ollama (compatible OpenAI)
chromadb>=0.5.0            # Vector DB embebido
sentence-transformers>=3.0.0  # Embeddings multilingue
PyMuPDF>=1.25.0            # Extraccion de texto de PDFs
openai-whisper>=20231117   # Transcripcion local de video/audio
requests>=2.31.0           # HTTP para verificar Ollama
```

Tkinter viene incluido con Python estandar.

## Distribucion

Para empaquetar como binario:
```bash
pyinstaller --onedir --windowed --name "RAG App" --add-data "core:core" --add-data "ui:ui" app.py
```
- Genera `.app` (Mac) o `.exe` (Windows)
- Requiere Ollama instalado en la maquina del usuario
- Datos en `~/.rag-app/` (persisten entre ejecuciones)
- Modelos de Whisper y sentence-transformers se descargan al primer uso

## Ollama — Modelos soportados

Al iniciar la app, el usuario elige entre:
- `llama3.1:8b` (default) — buen balance calidad/velocidad
- `llama3.2:3b` — mas rapido, menos memoria
- `mistral:7b` — alternativa solida
- `gemma2:9b` — modelo de Google
- `qwen2.5:7b` — bueno para multilingue

La app se conecta a `http://localhost:11434/v1` (API OpenAI-compatible de Ollama).
