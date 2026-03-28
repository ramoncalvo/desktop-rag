// RAG App — https://github.com/ramoncalvo

import type { Session } from "../lib/api";
import ThemeToggle from "./ThemeToggle";

interface Props {
  sessions: Session[];
  currentSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export default function Sidebar({ sessions, currentSessionId, onSelect, onNew, onDelete }: Props) {
  return (
    <aside className="w-64 flex flex-col shrink-0" style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}>
      {/* Brand header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "var(--accent-subtle)" }}>
            <span className="text-xs font-bold" style={{ color: "var(--sidebar-text)" }}>R</span>
          </div>
          <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--sidebar-text)" }}>rag-app</span>
        </div>
        <ThemeToggle className="text-[var(--sidebar-text-muted)]" />
      </div>

      {/* Sessions header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--sidebar-text-muted)" }}>Sesiones</span>
        <button onClick={onNew}
          className="text-[11px] px-2.5 py-1 rounded-md transition font-medium"
          style={{ background: "var(--accent-subtle)", color: "var(--sidebar-text)" }}>
          + Nuevo
        </button>
      </div>

      {/* Sessions list */}
      <ul className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {sessions.map((s) => (
          <li key={s.id} onClick={() => onSelect(s.id)}
            className="group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-[13px] transition"
            style={{
              background: s.id === currentSessionId ? "var(--accent-subtle-hover)" : "transparent",
              color: s.id === currentSessionId ? "var(--sidebar-text)" : "var(--sidebar-text-muted)",
            }}>
            <span className="truncate flex-1">{s.title}</span>
            <button onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
              className="opacity-0 group-hover:opacity-100 ml-2 transition"
              style={{ color: "var(--sidebar-text-muted)" }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
        {sessions.length === 0 && (
          <li className="text-xs text-center py-10" style={{ color: "var(--sidebar-text-muted)" }}>Sin sesiones</li>
        )}
      </ul>
    </aside>
  );
}
