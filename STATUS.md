# RAG App — Status del proyecto

## Ramas

| Rama | Stack | Estado |
|------|-------|--------|
| `main` | Python + Tkinter | Estable, funcional |
| `tauri` | Python FastAPI + React + Tailwind + Tauri | Estable, funcional |
| `tauri-nestjs` | **NestJS + Prisma + Vectra** + React + Tailwind + Tauri | En desarrollo activo |

## Rama actual: `tauri-nestjs`

### Completado

- [x] **NestJS backend** — 6 modulos (Prisma, Settings, Ollama, RAG, Files, Chat)
- [x] **Prisma 6 + SQLite** — schema con IndexedFile, ChatSession, ChatMessage, AppSetting
- [x] **Vectra** — vector store embebido (reemplaza ChromaDB, sin servidor)
- [x] **Ollama integration** — status, start, pull models, generate answers
- [x] **Embeddings** — nomic-embed-text via Ollama API
- [x] **PDF indexing** — Python/PyMuPDF via subprocess (extraccion con metadata pagina/posicion)
- [x] **Video transcription** — Python/Whisper via subprocess (timestamps precisos)
- [x] **File serving** — range requests para video streaming, inline para PDFs
- [x] **Directory browser** — endpoint browse + modal visual para seleccionar carpeta
- [x] **React frontend** — Login, Setup, Chat, Visor, Fuentes, Settings, Profile, Billing, Creditos
- [x] **Theme system** — Zustand store, dark (navy+lime) y light (beige+purple)
- [x] **Profile dropdown** — menu en sidebar con perfil, facturacion, settings, logout
- [x] **Video player** — HTML5 video con transcript sincronizado y seek
- [x] **Chat sources** — clickeables, navegan al visor con pagina/timestamp

### Pendiente

- [ ] **Boton "Nuevo"** no funciona (bug reportado)
- [ ] **Renombrar sesiones** de chat
- [ ] **Auth real** — Supabase Auth (Google OAuth, email/password, magic links)
- [ ] **Pagos** — Stripe Checkout + Webhooks
- [ ] **LLM comercial** — soporte para APIs externas (OpenAI, Anthropic)
- [ ] **User management** en VPS
- [ ] **Arquitectura hibrida** — front+back en VPS, procesamiento local
- [ ] **Modo offline** para procesamiento local sin internet

### Dependencias del backend NestJS

- NestJS 11
- Prisma 6 + SQLite
- Vectra (vector store embebido)
- OpenAI SDK (para Ollama)
- Python (subprocess) para PyMuPDF y Whisper

### Como correr

```bash
# Backend
cd backend && npm run build && node dist/src/main.js

# Frontend
cd frontend && npm run dev
```

Abrir http://localhost:1420

### Prerequisitos

- Node.js 18+
- Python 3.11+ con conda env `desktop-rag` (PyMuPDF, Whisper)
- Ollama con modelos: llama3.1:8b + nomic-embed-text
