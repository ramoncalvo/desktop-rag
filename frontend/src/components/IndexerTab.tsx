// RAG App — https://github.com/ramoncalvo

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { IndexedFile } from "../lib/api";

export default function IndexerTab() {
  const [folder, setFolder] = useState("");
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [status, setStatus] = useState("");
  const [indexing, setIndexing] = useState(false);

  useEffect(() => {
    loadFiles();
    loadFolder();
  }, []);

  async function loadFiles() {
    try { setFiles(await api.files.list()); } catch {}
  }

  async function loadFolder() {
    try {
      const s = await api.settings.get("index_folder");
      if (s.value) setFolder(s.value);
    } catch {}
  }

  async function handleBrowse() {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true });
      if (selected) setFolder(selected as string);
    } catch {
      const path = prompt("Ruta de la carpeta:");
      if (path) setFolder(path);
    }
  }

  async function handleIndex() {
    if (!folder || indexing) return;
    setIndexing(true);
    setStatus("Indexando...");
    try {
      const result = await api.files.index(folder);
      setStatus(`Completado: ${result.new_indexed} nuevos de ${result.total_found} encontrados`);
      loadFiles();
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
    setIndexing(false);
  }

  async function handleDelete(id: string) {
    await api.files.delete(id);
    loadFiles();
  }

  function formatDuration(sec: number) {
    if (!sec) return "-";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  return (
    <div className="p-6 overflow-y-auto h-full space-y-5">
      {/* Folder selection */}
      <div className="bg-[#151b23] border border-[#1e2a36] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-[#c8ff00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          Carpeta de documentos
        </h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={folder}
            readOnly
            placeholder="Selecciona una carpeta..."
            className="flex-1 bg-[#0d1117] text-gray-300 border border-[#1e2a36] rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
          <button
            onClick={handleBrowse}
            className="bg-[#1e2a36] hover:bg-[#2a3a4a] text-gray-300 px-4 py-2 rounded-lg text-sm border border-[#2a3a4a] transition"
          >
            Seleccionar
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleIndex}
            disabled={!folder || indexing}
            className="bg-[#c8ff00] hover:bg-[#d4ff33] text-[#0d1117] px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {indexing ? "Indexando..." : "Escanear e indexar"}
          </button>
          {status && (
            <span className="text-xs text-gray-400">{status}</span>
          )}
        </div>
      </div>

      {/* Files table */}
      <div className="bg-[#151b23] border border-[#1e2a36] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-[#c8ff00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Archivos indexados
          <span className="text-[11px] bg-[#c8ff00]/10 text-[#c8ff00] px-2 py-0.5 rounded-full font-medium">
            {files.length}
          </span>
        </h3>

        {files.length === 0 ? (
          <p className="text-gray-600 text-sm py-8 text-center">No hay archivos indexados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left text-[11px] uppercase tracking-wider">
                  <th className="pb-3 font-medium">Titulo</th>
                  <th className="pb-3 font-medium w-16">Tipo</th>
                  <th className="pb-3 font-medium w-20">Chunks</th>
                  <th className="pb-3 font-medium w-20">Info</th>
                  <th className="pb-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id} className="border-t border-[#1e2a36] text-gray-300 hover:bg-[#0d1117]/50 transition">
                    <td className="py-3 pr-4 truncate max-w-[300px]">{f.title || f.file_name}</td>
                    <td className="py-3">
                      <span className="bg-[#1e2a36] text-[#c8ff00] text-[11px] px-2 py-0.5 rounded font-medium">
                        {f.file_type}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">{f.chunk_count}</td>
                    <td className="py-3 text-gray-400">
                      {f.file_type === "pdf" ? `${f.page_count}p` : formatDuration(f.duration_sec)}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="text-gray-600 hover:text-red-400 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
