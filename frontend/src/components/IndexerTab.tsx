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
    try {
      const f = await api.files.list();
      setFiles(f);
    } catch {}
  }

  async function loadFolder() {
    try {
      const s = await api.settings.get("index_folder");
      if (s.value) setFolder(s.value);
    } catch {}
  }

  async function handleBrowse() {
    // Try Tauri dialog, fallback to prompt
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
      setStatus(
        `Completado: ${result.new_indexed} nuevos de ${result.total_found} archivos encontrados`
      );
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
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-200 mb-3">
          Carpeta de documentos
        </h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={folder}
            readOnly
            placeholder="Selecciona una carpeta..."
            className="flex-1 bg-[#242424] text-gray-300 border border-[#333] rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={handleBrowse}
            className="bg-[#242424] hover:bg-[#333] text-gray-300 px-4 py-2 rounded-lg text-sm border border-[#333] transition"
          >
            Seleccionar
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleIndex}
            disabled={!folder || indexing}
            className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {indexing ? "Indexando..." : "Escanear e indexar nuevos"}
          </button>
          {status && (
            <span className="text-xs text-gray-400">{status}</span>
          )}
        </div>
      </div>

      {/* Files table */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-200 mb-3">
          Archivos indexados ({files.length})
        </h3>

        {files.length === 0 ? (
          <p className="text-gray-600 text-sm py-4 text-center">
            No hay archivos indexados
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left border-b border-[#333]">
                  <th className="pb-2 font-medium">Titulo</th>
                  <th className="pb-2 font-medium w-16">Tipo</th>
                  <th className="pb-2 font-medium w-20">Chunks</th>
                  <th className="pb-2 font-medium w-20">Duracion</th>
                  <th className="pb-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-[#242424] text-gray-300"
                  >
                    <td className="py-2.5 pr-4 truncate max-w-[300px]">
                      {f.title || f.file_name}
                    </td>
                    <td className="py-2.5">
                      <span className="bg-[#242424] text-gray-400 text-xs px-2 py-0.5 rounded">
                        {f.file_type}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-400">{f.chunk_count}</td>
                    <td className="py-2.5 text-gray-400">
                      {f.file_type === "pdf"
                        ? `${f.page_count}p`
                        : formatDuration(f.duration_sec)}
                    </td>
                    <td className="py-2.5">
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="text-gray-500 hover:text-red-400 transition"
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
