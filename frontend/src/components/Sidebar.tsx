// RAG App — https://github.com/ramoncalvo

import type { Session } from "../lib/api";

interface Props {
  sessions: Session[];
  currentSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export default function Sidebar({ sessions, currentSessionId, onSelect, onNew, onDelete }: Props) {
  return (
    <aside className="w-64 bg-[#0d1117] border-r border-[#1e2a36] flex flex-col shrink-0">
      {/* Brand header */}
      <div className="px-5 py-4 border-b border-[#1e2a36]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#c8ff00] rounded-md flex items-center justify-center">
            <span className="text-[#0d1117] text-xs font-bold">R</span>
          </div>
          <span className="text-sm font-semibold text-gray-200 tracking-tight">rag-app</span>
        </div>
      </div>

      {/* Sessions header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Sesiones</span>
        <button
          onClick={onNew}
          className="text-[11px] bg-[#c8ff00]/10 hover:bg-[#c8ff00]/20 text-[#c8ff00] px-2.5 py-1 rounded-md transition font-medium"
        >
          + Nuevo
        </button>
      </div>

      {/* Sessions list */}
      <ul className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {sessions.map((s) => (
          <li
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-[13px] transition ${
              s.id === currentSessionId
                ? "bg-[#c8ff00]/10 text-[#c8ff00]"
                : "text-gray-400 hover:bg-[#151b23] hover:text-gray-200"
            }`}
          >
            <span className="truncate flex-1">{s.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(s.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 ml-2 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
        {sessions.length === 0 && (
          <li className="text-gray-600 text-xs text-center py-10">
            Sin sesiones
          </li>
        )}
      </ul>
    </aside>
  );
}
