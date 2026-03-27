# RAG App — https://github.com/ramoncalvo
"""Setup frame: checks Ollama installation, starts it, and pulls required model."""

import threading
import tkinter as tk
from tkinter import ttk

from core import ollama_manager


class SetupFrame(ttk.Frame):
    """Embedded setup frame (not a Toplevel) shown inside root window."""

    def __init__(self, parent, on_ready):
        super().__init__(parent, padding=20)
        self.pack(fill="both", expand=True)
        self.on_ready = on_ready

        self.model_var = tk.StringVar(value=ollama_manager.DEFAULT_MODEL)

        ttk.Label(self, text="RAG App", font=("", 20, "bold")).pack(pady=(10, 4))
        ttk.Label(self, text="Configuracion inicial", font=("", 13)).pack(pady=(0, 16))

        self.status_label = ttk.Label(self, text="Verificando Ollama...", wraplength=460, font=("", 12))
        self.status_label.pack(pady=5)

        self.progress = ttk.Progressbar(self, mode="indeterminate", length=400)
        self.progress.pack(pady=10)

        # Model selector
        model_frame = ttk.Frame(self)
        model_frame.pack(pady=5)
        ttk.Label(model_frame, text="Modelo:").pack(side="left")
        self.model_combo = ttk.Combobox(
            model_frame,
            textvariable=self.model_var,
            values=["llama3.1:8b", "llama3.2:3b", "mistral:7b", "gemma2:9b", "qwen2.5:7b"],
            state="readonly",
            width=25,
        )
        self.model_combo.pack(side="left", padx=10)

        # Buttons
        btn_frame = ttk.Frame(self)
        btn_frame.pack(pady=15)
        self.start_btn = ttk.Button(btn_frame, text="Iniciar", command=self._run_setup)
        self.start_btn.pack(side="left", padx=5)
        self.cancel_btn = ttk.Button(btn_frame, text="Salir", command=self._cancel)
        self.cancel_btn.pack(side="left", padx=5)

        self.detail_label = ttk.Label(self, text="", wraplength=460, foreground="gray")
        self.detail_label.pack(pady=5)

        self.progress.start(15)
        threading.Thread(target=self._check_initial, daemon=True).start()

    def _set_status(self, text):
        self.status_label.config(text=text)

    def _set_detail(self, text):
        self.detail_label.config(text=text)

    def _check_initial(self):
        if not ollama_manager.is_ollama_installed():
            instructions = ollama_manager.get_install_instructions()
            self.after(0, lambda: self._set_status("Ollama no esta instalado"))
            self.after(0, lambda: self._set_detail(instructions))
            self.after(0, self.progress.stop)
            return

        if ollama_manager.is_ollama_running():
            self.after(0, lambda: self._set_status("Ollama esta corriendo"))
            models = ollama_manager.list_local_models()
            if models:
                self.after(0, lambda: self._set_detail(f"Modelos locales: {', '.join(models)}"))
            self.after(0, self.progress.stop)
        else:
            self.after(0, lambda: self._set_status("Ollama instalado pero no esta corriendo"))
            self.after(0, lambda: self._set_detail("Presiona 'Iniciar' para arrancar Ollama y descargar el modelo"))
            self.after(0, self.progress.stop)

    def _run_setup(self):
        self.start_btn.config(state="disabled")
        self.model_combo.config(state="disabled")
        self.progress.start(15)
        threading.Thread(target=self._setup_thread, daemon=True).start()

    def _setup_thread(self):
        model = self.model_var.get()

        # Start Ollama if needed
        if not ollama_manager.is_ollama_running():
            self.after(0, lambda: self._set_status("Iniciando Ollama..."))
            if not ollama_manager.start_ollama():
                self.after(0, lambda: self._set_status("No se pudo iniciar Ollama"))
                self.after(0, lambda: self._set_detail("Intenta iniciar Ollama manualmente: ollama serve"))
                self.after(0, self.progress.stop)
                self.after(0, lambda: self.start_btn.config(state="normal"))
                return

        # Check if model is already available
        if ollama_manager.is_model_available(model):
            self.after(0, lambda: self._set_status(f"Modelo {model} listo"))
            self.after(0, self.progress.stop)
            self.after(500, self._finish)
            return

        # Pull model
        self.after(0, lambda: self._set_status(f"Descargando modelo {model}..."))

        def on_progress(status):
            self.after(0, lambda s=status: self._set_detail(s))

        ok = ollama_manager.pull_model(model, progress_callback=on_progress)
        if ok:
            self.after(0, lambda: self._set_status(f"Modelo {model} descargado"))
            self.after(0, self.progress.stop)
            self.after(500, self._finish)
        else:
            self.after(0, lambda: self._set_status(f"Error descargando {model}"))
            self.after(0, self.progress.stop)
            self.after(0, lambda: self.start_btn.config(state="normal"))

    def _finish(self):
        from core.database import set_setting
        set_setting("ollama_model", self.model_var.get())
        self.on_ready(self.model_var.get())

    def _cancel(self):
        self.winfo_toplevel().destroy()
