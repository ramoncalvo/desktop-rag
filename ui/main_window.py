# RAG App — https://github.com/ramoncalvo
"""Main window: sidebar with sessions + tabbed content area."""

import tkinter as tk
from tkinter import ttk, simpledialog, messagebox

from core import database
from ui.chat_tab import ChatTab
from ui.indexer_tab import IndexerTab


class MainWindow(ttk.Frame):
    def __init__(self, parent, model: str):
        super().__init__(parent)
        self.parent = parent
        self.model = model
        self.pack(fill="both", expand=True)

        parent.title(f"RAG App — {model}")
        parent.geometry("1200x800")

        # --- Main paned window ---
        paned = ttk.PanedWindow(self, orient="horizontal")
        paned.pack(fill="both", expand=True)

        # --- Sidebar ---
        sidebar = ttk.Frame(paned, width=260)
        paned.add(sidebar, weight=0)

        sidebar_header = ttk.Frame(sidebar)
        sidebar_header.pack(fill="x", padx=8, pady=(8, 4))
        ttk.Label(sidebar_header, text="Sesiones", font=("", 14, "bold")).pack(side="left")
        ttk.Button(sidebar_header, text="+ Nuevo", command=self._new_session, width=8).pack(side="right")

        self.sessions_listbox = tk.Listbox(sidebar, font=("Helvetica", 12), activestyle="none")
        self.sessions_listbox.pack(fill="both", expand=True, padx=8, pady=4)
        self.sessions_listbox.bind("<<ListboxSelect>>", self._on_session_select)
        self.sessions_listbox.bind("<Button-3>", self._on_session_right_click)
        self.sessions_listbox.bind("<Button-2>", self._on_session_right_click)

        # Context menu for sessions
        self.session_menu = tk.Menu(self, tearoff=0)
        self.session_menu.add_command(label="Renombrar", command=self._rename_session)
        self.session_menu.add_command(label="Eliminar", command=self._delete_session)

        # --- Content area with tabs ---
        content = ttk.Frame(paned)
        paned.add(content, weight=1)

        self.notebook = ttk.Notebook(content)
        self.notebook.pack(fill="both", expand=True)

        # Tabs
        self.chat_tab = ChatTab(self.notebook, self)
        self.notebook.add(self.chat_tab, text="  Chat  ")

        self.indexer_tab = IndexerTab(self.notebook, self)
        self.notebook.add(self.indexer_tab, text="  Fuentes  ")

        # --- Status bar ---
        self.status_var = tk.StringVar(value=f"Modelo: {model}")
        status_bar = ttk.Label(self, textvariable=self.status_var, relief="sunken", anchor="w", padding=(8, 2))
        status_bar.pack(fill="x", side="bottom")

        # Load data
        self._sessions = []
        self._session_ids = []
        self.refresh_sessions()

    def refresh_sessions(self):
        self._sessions = database.list_sessions()
        self._session_ids = [s["id"] for s in self._sessions]

        self.sessions_listbox.delete(0, "end")
        for s in self._sessions:
            self.sessions_listbox.insert("end", s["title"])

        # Select current session if any
        if self.chat_tab.current_session_id in self._session_ids:
            idx = self._session_ids.index(self.chat_tab.current_session_id)
            self.sessions_listbox.selection_set(idx)

    def _on_session_select(self, event):
        selection = self.sessions_listbox.curselection()
        if not selection:
            return
        idx = selection[0]
        session_id = self._session_ids[idx]
        self.chat_tab.load_session(session_id)
        self.notebook.select(self.chat_tab)

    def _on_session_right_click(self, event):
        idx = self.sessions_listbox.nearest(event.y)
        if idx >= 0:
            self.sessions_listbox.selection_clear(0, "end")
            self.sessions_listbox.selection_set(idx)
            self._right_click_idx = idx
            self.session_menu.post(event.x_root, event.y_root)

    def _new_session(self):
        self.chat_tab.new_chat()
        self.notebook.select(self.chat_tab)

    def _rename_session(self):
        idx = getattr(self, "_right_click_idx", None)
        if idx is None or idx >= len(self._session_ids):
            return
        session_id = self._session_ids[idx]
        current_title = self._sessions[idx]["title"]
        new_title = simpledialog.askstring("Renombrar sesion", "Nuevo titulo:", initialvalue=current_title, parent=self)
        if new_title:
            database.rename_session(session_id, new_title[:100])
            self.refresh_sessions()

    def _delete_session(self):
        idx = getattr(self, "_right_click_idx", None)
        if idx is None or idx >= len(self._session_ids):
            return
        session_id = self._session_ids[idx]
        if messagebox.askyesno("Eliminar sesion", "Seguro que quieres eliminar esta sesion?", parent=self):
            database.delete_session(session_id)
            if self.chat_tab.current_session_id == session_id:
                self.chat_tab.new_chat()
            self.refresh_sessions()

    def on_index_complete(self):
        """Called when indexing finishes."""
        self.status_var.set(f"Modelo: {self.model} | Indexacion completada")
