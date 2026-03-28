// RAG App — https://github.com/ramoncalvo

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { IndexedFile } from "../lib/api";

export default function IndexerTab() {
  const [folder, setFolder] = useState("");
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [status, setStatus] = useState("");
  const [indexing, setIndexing] = useState(false);

  useEffect(() => { loadFiles(); loadFolder(); }, []);

  async function loadFiles() { try { setFiles(await api.files.list()); } catch {} }
  async function loadFolder() { try { const s = await api.settings.get("index_folder"); if (s.value) setFolder(s.value); } catch {} }

  async function handleBrowse() {
    // Try Tauri dialog first (native OS dialog)
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true });
      if (selected) { setFolder(selected as string); return; }
    } catch {
      // In browser mode, the input is editable — user can type/paste the path
    }
  }

  async function handleIndex() {
    if (!folder || indexing) return;
    setIndexing(true); setStatus("Indexando...");
    try { const r = await api.files.index(folder); setStatus(`Completado: ${r.new_indexed} nuevos de ${r.total_found} encontrados`); loadFiles(); }
    catch (e: any) { setStatus(`Error: ${e.message}`); }
    setIndexing(false);
  }

  async function handleDelete(id: string) { await api.files.delete(id); loadFiles(); }

  function fmt(sec: number) { if (!sec) return "-"; return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; }

  return (
    <div className="p-6 overflow-y-auto h-full space-y-5">
      <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
          <svg className="w-4 h-4" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
          Carpeta de documentos
        </h3>
        <div className="flex gap-2 mb-3">
          <input type="text" value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="Pega la ruta de la carpeta..."
            className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
          <button onClick={handleBrowse}
            className="px-4 py-2 rounded-lg text-sm transition"
            style={{ background: "var(--bg-tertiary)", color: "var(--text)", border: "1px solid var(--border)" }}>Seleccionar</button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleIndex} disabled={!folder || indexing}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-30"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
            {indexing ? "Indexando..." : "Escanear e indexar"}
          </button>
          {status && <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{status}</span>}
        </div>
      </div>

      <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
          <svg className="w-4 h-4" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Archivos indexados
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>{files.length}</span>
        </h3>
        {files.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>No hay archivos indexados</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-left" style={{ color: "var(--text-muted)" }}>
                <th className="pb-3 font-medium">Titulo</th><th className="pb-3 font-medium w-16">Tipo</th><th className="pb-3 font-medium w-20">Chunks</th><th className="pb-3 font-medium w-20">Info</th><th className="pb-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="transition" style={{ borderTop: "1px solid var(--border)", color: "var(--text)" }}>
                  <td className="py-3 pr-4 truncate max-w-[300px]">{f.title || f.file_name}</td>
                  <td className="py-3"><span className="text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: "var(--bg-tertiary)", color: "var(--accent)" }}>{f.file_type}</span></td>
                  <td className="py-3" style={{ color: "var(--text-secondary)" }}>{f.chunk_count}</td>
                  <td className="py-3" style={{ color: "var(--text-secondary)" }}>{f.file_type === "pdf" ? `${f.page_count}p` : fmt(f.duration_sec)}</td>
                  <td className="py-3">
                    <button onClick={() => handleDelete(f.id)} className="transition" style={{ color: "var(--text-muted)" }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
