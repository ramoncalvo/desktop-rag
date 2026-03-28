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
    <aside className="w-64 bg-[#1a1a1a] border-r border-[#333] flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#333]">
        <h2 className="text-sm font-semibold text-gray-200">Sesiones</h2>
        <button
          onClick={onNew}
          className="text-xs bg-[#242424] hover:bg-[#333] text-gray-300 px-3 py-1 rounded-md border border-[#333] transition"
        >
          + Nuevo
        </button>
      </div>

      {/* Sessions list */}
      <ul className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {sessions.map((s) => (
          <li
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition ${
              s.id === currentSessionId
                ? "bg-[#242424] text-blue-400"
                : "text-gray-400 hover:bg-[#242424] hover:text-gray-200"
            }`}
          >
            <span className="truncate flex-1">{s.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(s.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 ml-2 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
        {sessions.length === 0 && (
          <li className="text-gray-600 text-xs text-center py-8">
            Sin sesiones. Haz click en "+ Nuevo" para crear una.
          </li>
        )}
      </ul>
    </aside>
  );
}
