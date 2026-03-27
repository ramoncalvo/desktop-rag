# RAG App

App de escritorio para hacer preguntas sobre tus documentos (PDFs y videos) usando un LLM local con Ollama.

## Requisitos

- Python 3.11+
- [Ollama](https://ollama.com) instalado
- macOS / Linux / Windows

## Instalacion

```bash
# Crear y activar entorno conda
conda create -n desktop-rag python=3.11 -y
conda activate desktop-rag

# Instalar dependencias
pip install -r requirements.txt
```

## Uso

```bash
conda activate desktop-rag
python app.py
```

Al iniciar por primera vez:
1. La app verifica si Ollama esta instalado y corriendo
2. Si no esta corriendo, lo arranca automaticamente
3. Selecciona un modelo (llama3.1:8b por defecto) y se descarga si no lo tienes
4. Una vez listo, se abre la ventana principal

### Indexar documentos

1. Ve a la pestana **Fuentes**
2. Selecciona una carpeta con PDFs o videos (mp4, mkv, avi, mov, etc.)
3. Click en **Escanear e indexar nuevos** — solo procesa archivos nuevos
4. Los PDFs se extraen con PyMuPDF, los videos se transcriben con Whisper

### Chat

1. Escribe tu pregunta en la pestana **Chat**
2. La app busca contexto relevante en ChromaDB y genera una respuesta con Ollama
3. Las fuentes consultadas se muestran debajo de cada respuesta

## Compilar

### macOS (.app)

```bash
conda activate desktop-rag
pip install pyinstaller
pyinstaller --onedir --windowed --name "RAG App" --add-data "core:core" --add-data "ui:ui" app.py
```

El resultado esta en `dist/RAG App.app`.

### Windows (.exe)

```powershell
conda activate desktop-rag
pip install pyinstaller
pyinstaller --onedir --windowed --name "RAG App" --add-data "core;core" --add-data "ui;ui" --icon=NONE app.py
```

El resultado esta en `dist\RAG App\RAG App.exe`.

> En Windows el separador de `--add-data` es `;` en vez de `:`.
> Requiere [Ollama para Windows](https://ollama.com/download/windows) instalado.

## Datos

Todo se guarda en `~/.rag-app/`:
- `data.db` — SQLite (sesiones, mensajes, archivos indexados)
- `chroma_db/` — vectores ChromaDB

## Modelos soportados

| Modelo | Tamano | Notas |
|--------|--------|-------|
| llama3.1:8b | ~4.7 GB | Default, buen balance |
| llama3.2:3b | ~2 GB | Rapido, menos memoria |
| mistral:7b | ~4.1 GB | Alternativa solida |
| gemma2:9b | ~5.4 GB | Google |
| qwen2.5:7b | ~4.4 GB | Bueno para multilingue |

## Dependencias

- `openai` — cliente para API de Ollama (compatible OpenAI)
- `chromadb` — vector DB embebido
- `sentence-transformers` — embeddings multilingue
- `PyMuPDF` — extraccion de texto de PDFs
- `openai-whisper` — transcripcion local de video/audio
- `requests` — verificar estado de Ollama
