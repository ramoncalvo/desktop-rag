// RAG App — https://github.com/ramoncalvo

import { useEffect, useState } from "react";

const API = "http://127.0.0.1:5555/api";

interface DirEntry {
  name: string;
  path: string;
}

interface BrowseResult {
  current: string;
  parent: string | null;
  directories: DirEntry[];
}

interface Props {
  onSelect: (path: string) => void;
  onClose: () => void;
}

export default function DirectoryPicker({ onSelect, onClose }: Props) {
  const [current, setCurrent] = useState("");
  const [parent, setParent] = useState<string | null>(null);
  const [dirs, setDirs] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    browse();
  }, []);

  async function browse(path?: string) {
    setLoading(true);
    try {
      const url = path ? `${API}/files/browse?path=${encodeURIComponent(path)}` : `${API}/files/browse`;
      const res = await fetch(url);
      const data: BrowseResult = await res.json();
      setCurrent(data.current);
      setParent(data.parent);
      setDirs(data.directories);
    } catch {}
    setLoading(false);
  }

  function handleNavigate(path: string) {
    browse(path);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-[560px] max-h-[70vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <svg className="w-4 h-4" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Seleccionar carpeta
          </h2>
          <button onClick={onClose} className="p-1 rounded transition hover:opacity-70" style={{ color: "var(--text-muted)" }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current path */}
        <div className="px-5 py-2.5 flex items-center gap-2 shrink-0" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
          {parent && (
            <button onClick={() => handleNavigate(parent)} className="p-1 rounded transition hover:opacity-70"
              style={{ color: "var(--accent)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <span className="text-xs font-mono truncate" style={{ color: "var(--text-secondary)" }}>{current}</span>
        </div>

        {/* Directory list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex gap-1">
                {[0, 150, 300].map((d) => (
                  <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}

          {!loading && dirs.length === 0 && (
            <p className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
              No hay subcarpetas
            </p>
          )}

          {!loading && dirs.map((dir) => (
            <button
              key={dir.path}
              onClick={() => handleNavigate(dir.path)}
              className="w-full flex items-center gap-3 px-5 py-2.5 text-left text-sm transition hover:opacity-80"
              style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}
            >
              <svg className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="truncate">{dir.name}</span>
              <svg className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Footer: select current */}
        <div className="px-5 py-3 flex items-center justify-between shrink-0"
          style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
          <span className="text-[11px] truncate max-w-[320px]" style={{ color: "var(--text-muted)" }}>{current}</span>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm transition"
              style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              Cancelar
            </button>
            <button onClick={() => onSelect(current)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
              Seleccionar esta carpeta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
