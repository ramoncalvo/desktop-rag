# RAG App — https://github.com/ramoncalvo
"""Indexer tab: select folder, scan for PDFs/videos, index new files."""

import json
import os
import threading
import tkinter as tk
from tkinter import ttk, filedialog

from core import database, rag, pdf_processor, video_processor


class IndexerTab(ttk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent)
        self.app = app
        self._indexing = False

        # --- Folder selection ---
        folder_frame = ttk.LabelFrame(self, text="Carpeta de documentos", padding=10)
        folder_frame.pack(fill="x", padx=10, pady=(10, 5))

        self.folder_var = tk.StringVar(value=database.get_setting("index_folder", ""))
        folder_row = ttk.Frame(folder_frame)
        folder_row.pack(fill="x")

        self.folder_entry = ttk.Entry(folder_row, textvariable=self.folder_var, state="readonly")
        self.folder_entry.pack(side="left", fill="x", expand=True, padx=(0, 8))
        ttk.Button(folder_row, text="Seleccionar carpeta", command=self._browse_folder).pack(side="left")

        btn_row = ttk.Frame(folder_frame)
        btn_row.pack(fill="x", pady=(8, 0))
        self.scan_btn = ttk.Button(btn_row, text="Escanear e indexar nuevos", command=self._start_indexing)
        self.scan_btn.pack(side="left")
        self.stop_btn = ttk.Button(btn_row, text="Detener", command=self._stop_indexing, state="disabled")
        self.stop_btn.pack(side="left", padx=8)

        # --- Progress ---
        progress_frame = ttk.LabelFrame(self, text="Progreso", padding=10)
        progress_frame.pack(fill="x", padx=10, pady=5)

        self.progress_var = tk.DoubleVar(value=0)
        self.progress_bar = ttk.Progressbar(progress_frame, variable=self.progress_var, maximum=100)
        self.progress_bar.pack(fill="x")
        self.progress_label = ttk.Label(progress_frame, text="")
        self.progress_label.pack(anchor="w", pady=(4, 0))
        self.detail_label = ttk.Label(progress_frame, text="", foreground="gray")
        self.detail_label.pack(anchor="w", pady=(2, 0))

        # --- Indexed files list ---
        list_frame = ttk.LabelFrame(self, text="Archivos indexados", padding=10)
        list_frame.pack(fill="both", expand=True, padx=10, pady=(5, 10))

        cols = ("title", "type", "chunks", "path")
        self.tree = ttk.Treeview(list_frame, columns=cols, show="headings", height=12)
        self.tree.heading("title", text="Titulo")
        self.tree.heading("type", text="Tipo")
        self.tree.heading("chunks", text="Chunks")
        self.tree.heading("path", text="Ruta")
        self.tree.column("title", width=200)
        self.tree.column("type", width=60)
        self.tree.column("chunks", width=60)
        self.tree.column("path", width=300)
        self.tree.pack(fill="both", expand=True, side="left")

        tree_scroll = ttk.Scrollbar(list_frame, orient="vertical", command=self.tree.yview)
        tree_scroll.pack(side="right", fill="y")
        self.tree.config(yscrollcommand=tree_scroll.set)

        # Delete button
        ttk.Button(self, text="Eliminar seleccionado", command=self._delete_selected).pack(anchor="e", padx=10, pady=(0, 10))

        self._refresh_list()

    def _browse_folder(self):
        folder = filedialog.askdirectory()
        if folder:
            self.folder_var.set(folder)
            database.set_setting("index_folder", folder)

    def _refresh_list(self):
        for item in self.tree.get_children():
            self.tree.delete(item)

        files = database.list_indexed_files()
        for f in files:
            self.tree.insert("", "end", iid=f["id"], values=(
                f["title"] or f["file_name"],
                f["file_type"],
                f["chunk_count"],
                f["file_path"],
            ))

    def _start_indexing(self):
        folder = self.folder_var.get()
        if not folder or not os.path.isdir(folder):
            self.progress_label.config(text="Selecciona una carpeta valida primero")
            return

        self._indexing = True
        self.scan_btn.config(state="disabled")
        self.stop_btn.config(state="normal")
        threading.Thread(target=self._index_thread, args=(folder,), daemon=True).start()

    def _stop_indexing(self):
        self._indexing = False

    def _index_thread(self, folder: str):
        # Scan for supported files
        supported_ext = {".pdf"} | video_processor.SUPPORTED_VIDEO_EXTENSIONS
        all_files = []
        for root, _, filenames in os.walk(folder):
            for fname in filenames:
                ext = os.path.splitext(fname)[1].lower()
                if ext in supported_ext:
                    full_path = os.path.join(root, fname)
                    all_files.append(full_path)

        # Filter out already indexed
        new_files = [f for f in all_files if not database.is_file_indexed(f)]

        total = len(new_files)
        if total == 0:
            self.after(0, lambda: self.progress_label.config(text=f"Todo indexado. {len(all_files)} archivos encontrados, 0 nuevos."))
            self.after(0, self._finish_indexing)
            return

        self.after(0, lambda: self.progress_label.config(text=f"Indexando {total} archivos nuevos de {len(all_files)} encontrados..."))

        for i, file_path in enumerate(new_files):
            if not self._indexing:
                self.after(0, lambda: self.progress_label.config(text="Indexacion detenida"))
                break

            fname = os.path.basename(file_path)
            ext = os.path.splitext(fname)[1].lower()
            pct = (i + 1) / total * 100
            self.after(0, lambda p=pct, f=fname: self._update_progress(p, f"Procesando: {f}"))

            try:
                if ext == ".pdf":
                    self._index_pdf(file_path, folder)
                elif ext in video_processor.SUPPORTED_VIDEO_EXTENSIONS:
                    self._index_video(file_path, folder)
            except Exception as e:
                self.after(0, lambda f=fname, err=e: self.progress_label.config(text=f"Error en {f}: {err}"))

        self.after(0, lambda: self._update_progress(100, f"Completado: {total} archivos indexados"))
        self.after(0, self._finish_indexing)
        self.after(0, self._refresh_list)
        self.after(0, lambda: self.app.on_index_complete())

    def _index_pdf(self, file_path: str, folder: str):
        file_hash = pdf_processor.get_file_hash(file_path)
        blocks = pdf_processor.extract_pages(file_path)
        if not blocks:
            return

        chunks = pdf_processor.chunk_pages(blocks)
        title = pdf_processor.get_pdf_title(file_path)
        page_count = pdf_processor.get_pdf_page_count(file_path)

        file_id = database.add_indexed_file(
            file_path=file_path,
            file_name=os.path.basename(file_path),
            file_type="pdf",
            file_hash=file_hash,
            title=title,
            chunk_count=len(chunks),
            page_count=page_count,
            duration_sec=0,
            folder_path=folder,
        )

        rag.index_chunks(file_id, file_path, title, chunks)

    def _index_video(self, file_path: str, folder: str):
        file_hash = video_processor.get_file_hash(file_path)

        def on_progress(msg):
            self.after(0, lambda m=msg: self.detail_label.config(text=m))

        result = video_processor.transcribe(file_path, progress_callback=on_progress)
        if not result["segments"]:
            return

        chunks = video_processor.chunk_transcript(result["segments"])
        title = video_processor.get_video_title(file_path)

        file_id = database.add_indexed_file(
            file_path=file_path,
            file_name=os.path.basename(file_path),
            file_type=os.path.splitext(file_path)[1].lstrip("."),
            file_hash=file_hash,
            title=title,
            chunk_count=len(chunks),
            page_count=0,
            duration_sec=result["duration_sec"],
            folder_path=folder,
        )

        rag.index_chunks(file_id, file_path, title, chunks)

    def _update_progress(self, pct: float, text: str):
        self.progress_var.set(pct)
        self.progress_label.config(text=text)

    def _finish_indexing(self):
        self._indexing = False
        self.scan_btn.config(state="normal")
        self.stop_btn.config(state="disabled")
        self.detail_label.config(text="")

    def _delete_selected(self):
        selected = self.tree.selection()
        if not selected:
            return
        for file_id in selected:
            rag.delete_file_chunks(file_id)
            database.delete_indexed_file(file_id)
        self._refresh_list()
