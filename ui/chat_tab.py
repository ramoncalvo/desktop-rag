# RAG App — https://github.com/ramoncalvo
"""Chat tab: message display + input for RAG queries."""

import json
import threading
import tkinter as tk
from tkinter import ttk

from core import database, llm, rag


class ChatTab(ttk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent)
        self.app = app
        self.current_session_id = None
        self._pending = False

        # --- Messages area ---
        self.messages_text = tk.Text(
            self, wrap="word", state="disabled",
            font=("Helvetica", 13), padx=12, pady=12,
            spacing1=4, spacing3=4,
        )
        self.messages_text.pack(fill="both", expand=True, padx=8, pady=(8, 0))

        scrollbar = ttk.Scrollbar(self.messages_text, command=self.messages_text.yview)
        scrollbar.pack(side="right", fill="y")
        self.messages_text.config(yscrollcommand=scrollbar.set)

        # Tags for styling
        self.messages_text.tag_config("user", foreground="#1a73e8", font=("Helvetica", 13, "bold"))
        self.messages_text.tag_config("assistant", foreground="#333333")
        self.messages_text.tag_config("source", foreground="#666666", font=("Helvetica", 11))
        self.messages_text.tag_config("error", foreground="#d32f2f")
        self.messages_text.tag_config("separator", foreground="#cccccc")

        # --- Input area ---
        input_frame = ttk.Frame(self)
        input_frame.pack(fill="x", padx=8, pady=8)

        self.input_entry = tk.Text(input_frame, height=3, font=("Helvetica", 13), wrap="word")
        self.input_entry.pack(side="left", fill="both", expand=True, padx=(0, 8))
        self.input_entry.bind("<Return>", self._on_enter)
        self.input_entry.bind("<Shift-Return>", lambda e: None)  # Allow shift+enter for newline

        btn_frame = ttk.Frame(input_frame)
        btn_frame.pack(side="right", fill="y")
        self.send_btn = ttk.Button(btn_frame, text="Enviar", command=self._send)
        self.send_btn.pack(fill="x", pady=(0, 4))
        self.cancel_btn = ttk.Button(btn_frame, text="Cancelar", command=self._cancel, state="disabled")
        self.cancel_btn.pack(fill="x")

    def load_session(self, session_id: str):
        self.current_session_id = session_id
        messages = database.get_messages(session_id)
        self.messages_text.config(state="normal")
        self.messages_text.delete("1.0", "end")

        for msg in messages:
            self._render_message(msg)

        self.messages_text.config(state="disabled")
        self.messages_text.see("end")

    def _render_message(self, msg: dict):
        role = msg["role"]
        content = msg["content"]

        if role == "user":
            self.messages_text.insert("end", "Tu: ", "user")
            self.messages_text.insert("end", content + "\n", "")
        else:
            self.messages_text.insert("end", "Asistente: ", "assistant")
            self.messages_text.insert("end", content + "\n", "")

            # Render sources (deduplicated by file)
            if msg.get("sources"):
                try:
                    sources = json.loads(msg["sources"]) if isinstance(msg["sources"], str) else msg["sources"]
                    seen_files = set()
                    for src in sources:
                        file_id = src.get("file_id", "")
                        if file_id in seen_files:
                            continue
                        seen_files.add(file_id)
                        title = src.get("title", "")
                        source_type = src.get("source_type", "")
                        if source_type == "pdf":
                            pages = set()
                            for s in sources:
                                if s.get("file_id") == file_id and s.get("page"):
                                    pages.add(s["page"])
                            pages_str = ", ".join(str(p) for p in sorted(pages))
                            self.messages_text.insert("end", f"  [{title} p.{pages_str}]\n", "source")
                        elif source_type == "video":
                            timestamps = []
                            for s in sources:
                                if s.get("file_id") == file_id:
                                    ts = s.get("start_ts", "")
                                    if ts:
                                        timestamps.append(ts)
                                    else:
                                        timestamps.append(f"{s.get('start_min', 0)}min")
                            ts_str = ", ".join(timestamps)
                            self.messages_text.insert("end", f"  [{title} ({ts_str})]\n", "source")
                        else:
                            self.messages_text.insert("end", f"  [{title}]\n", "source")
                except (json.JSONDecodeError, TypeError):
                    pass


        self.messages_text.insert("end", "\n", "separator")

    def _on_enter(self, event):
        if not event.state & 0x1:  # Not shift
            self._send()
            return "break"

    def _send(self):
        if self._pending:
            return
        text = self.input_entry.get("1.0", "end").strip()
        if not text:
            return

        if not self.current_session_id:
            session = database.create_session(text[:80])
            self.current_session_id = session["id"]
            self.app.refresh_sessions()

        self.input_entry.delete("1.0", "end")
        self._pending = True
        self.send_btn.config(state="disabled")
        self.cancel_btn.config(state="normal")

        # Save user message
        user_msg = database.add_message(self.current_session_id, "user", text)

        # Show user message
        self.messages_text.config(state="normal")
        self._render_message(user_msg)
        self.messages_text.insert("end", "Pensando...\n", "source")
        self.messages_text.config(state="disabled")
        self.messages_text.see("end")

        # Query in background
        self._cancel_flag = False
        threading.Thread(target=self._query_thread, args=(text,), daemon=True).start()

    def _query_thread(self, question: str):
        model = database.get_setting("ollama_model", "llama3.1:8b")
        context, sources = rag.query_context(question)

        if self._cancel_flag:
            self.after(0, self._reset_input)
            return

        if context:
            result = llm.generate_answer(question, context, model=model)
            answer_text = result["text"]
            actions = result["actions"] if result["actions"] else None
        else:
            answer_text = "No tengo documentos indexados con informacion relevante. Indexa documentos primero desde la pestana 'Fuentes'."
            actions = None

        if self._cancel_flag:
            self.after(0, self._reset_input)
            return

        sources_json = json.dumps(sources) if sources else None
        actions_json = json.dumps(actions) if actions else None
        assistant_msg = database.add_message(
            self.current_session_id, "assistant", answer_text,
            sources=sources_json, actions=actions_json,
        )

        # Auto-title
        sessions = database.list_sessions()
        for s in sessions:
            if s["id"] == self.current_session_id and s["title"] == "Nuevo Chat":
                database.rename_session(self.current_session_id, question[:80])
                self.after(0, self.app.refresh_sessions)
                break

        def _update_ui():
            # Remove "Pensando..." line
            self.messages_text.config(state="normal")
            # Find and delete the last "Pensando..." line
            idx = self.messages_text.search("Pensando...", "end", backwards=True)
            if idx:
                line_start = self.messages_text.index(f"{idx} linestart")
                line_end = self.messages_text.index(f"{idx} lineend + 1c")
                self.messages_text.delete(line_start, line_end)
            self._render_message(assistant_msg)
            self.messages_text.config(state="disabled")
            self.messages_text.see("end")
            self._reset_input()

        self.after(0, _update_ui)

    def _cancel(self):
        self._cancel_flag = True
        self._reset_input()

    def _reset_input(self):
        self._pending = False
        self.send_btn.config(state="normal")
        self.cancel_btn.config(state="disabled")

    def new_chat(self):
        self.current_session_id = None
        self.messages_text.config(state="normal")
        self.messages_text.delete("1.0", "end")
        self.messages_text.config(state="disabled")
