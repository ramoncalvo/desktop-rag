## Done

- [X] add text file navigation viewer (PDF pages + video transcript with timestamps)
- [X] add video navigation player (video + synced transcript + seek from chat)
- [X] light mode (beige + purple palette, Zustand theme store)
- [X] add profile dropdown and options
  - profile > the user can update his password
  - billing > the user can pay the subscription

Planeacion

- planear plan freenium

## Features

- [ ] external, commercial LLM
- [ ] auth (Supabase Auth)
  - google login (OAuth)
  - user and password
  - magic links
- [ ] pay subscription (Stripe Checkout + Webhooks)
  - team or personal
  - Stripe webhook → actualiza plan en Supabase
- [ ] cambiar el nombre a las sessiones de chat
- [ ] servicio de user management en vps
- [ ] arquitectura hibrida: front + back en VPS, procesamiento local
  - WebView apunta al VPS (codigo protegido)
  - Sidecar local para procesamiento de documentos (PDFs, videos, embeddings)
  - SQLite + Ollama en local (privacidad de datos del usuario)
  - Modo offline para procesamiento local
- [ ] stack recomendado: Supabase (auth + DB gratis 50k MAU) + Stripe (solo comision 2.9%)
- [ ]

## Bugs

- [ ] no sirve el boton de nuevo
