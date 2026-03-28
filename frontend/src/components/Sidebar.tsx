// RAG App — https://github.com/ramoncalvo

import { useState, useRef, useEffect } from "react";
import type { Session } from "../lib/api";
import ThemeToggle from "./ThemeToggle";

interface Props {
  sessions: Session[];
  currentSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ sessions, currentSessionId, onSelect, onNew, onDelete, onNavigate, onLogout }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

      {/* Profile footer */}
      <div className="relative px-3 py-3" ref={dropdownRef} style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition"
          style={{ background: dropdownOpen ? "var(--accent-subtle)" : "transparent" }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--accent-subtle)" }}>
            <svg className="w-4 h-4" style={{ color: "var(--sidebar-text)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[13px] font-medium truncate" style={{ color: "var(--sidebar-text)" }}>Usuario</p>
            <p className="text-[11px] truncate" style={{ color: "var(--sidebar-text-muted)" }}>usuario@ejemplo.com</p>
          </div>
          <svg className={`w-4 h-4 transition ${dropdownOpen ? "rotate-180" : ""}`}
            style={{ color: "var(--sidebar-text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {dropdownOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-xl overflow-hidden shadow-lg z-50"
            style={{ background: "var(--sidebar-bg)", border: "1px solid var(--sidebar-border)" }}>
            <button
              onClick={() => { setDropdownOpen(false); onNavigate("profile"); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[13px] transition hover:opacity-80"
              style={{ color: "var(--sidebar-text)", borderBottom: "1px solid var(--sidebar-border)" }}
            >
              <svg className="w-4 h-4" style={{ color: "var(--sidebar-text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Perfil
            </button>
            <button
              onClick={() => { setDropdownOpen(false); onNavigate("billing"); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[13px] transition hover:opacity-80"
              style={{ color: "var(--sidebar-text)", borderBottom: "1px solid var(--sidebar-border)" }}
            >
              <svg className="w-4 h-4" style={{ color: "var(--sidebar-text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Facturacion
            </button>
            <button
              onClick={() => { setDropdownOpen(false); onNavigate("settings"); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[13px] transition hover:opacity-80"
              style={{ color: "var(--sidebar-text)", borderBottom: "1px solid var(--sidebar-border)" }}
            >
              <svg className="w-4 h-4" style={{ color: "var(--sidebar-text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
            <button
              onClick={() => { setDropdownOpen(false); onLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[13px] transition hover:opacity-80"
              style={{ color: "var(--danger)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar sesion
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
