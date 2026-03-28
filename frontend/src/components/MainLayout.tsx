// RAG App — https://github.com/ramoncalvo

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Session } from "../lib/api";
import Sidebar from "./Sidebar";
import ChatTab from "./ChatTab";
import IndexerTab from "./IndexerTab";
import SettingsTab from "./SettingsTab";
import CreditsTab from "./CreditsTab";

type Tab = "chat" | "indexer" | "settings" | "credits";

export default function MainLayout({ model }: { model: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("chat");

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    const s = await api.sessions.list();
    setSessions(s);
  }

  function handleNewChat() {
    setCurrentSessionId(null);
    setTab("chat");
  }

  function handleSelectSession(id: string) {
    setCurrentSessionId(id);
    setTab("chat");
  }

  async function handleDeleteSession(id: string) {
    await api.sessions.delete(id);
    if (currentSessionId === id) setCurrentSessionId(null);
    loadSessions();
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "chat",
      label: "Chat",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      key: "indexer",
      label: "Fuentes",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      key: "settings",
      label: "Settings",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      key: "credits",
      label: "Creditos",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex h-screen bg-[#0d1117]">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelect={handleSelectSession}
        onNew={handleNewChat}
        onDelete={handleDeleteSession}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <nav className="flex border-b border-[#1e2a36] bg-[#0d1117] shrink-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition ${
                tab === t.key
                  ? "text-[#c8ff00] border-[#c8ff00]"
                  : "text-gray-500 border-transparent hover:text-gray-300"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-hidden halftone">
          {tab === "chat" && (
            <ChatTab
              sessionId={currentSessionId}
              onSessionCreated={(id) => {
                setCurrentSessionId(id);
                loadSessions();
              }}
              onTitleChanged={loadSessions}
            />
          )}
          {tab === "indexer" && <IndexerTab />}
          {tab === "settings" && <SettingsTab />}
          {tab === "credits" && <CreditsTab />}
        </div>

        {/* Status bar */}
        <footer className="px-4 py-1.5 text-[11px] text-gray-600 bg-[#0a0e14] border-t border-[#1e2a36] shrink-0 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#c8ff00]" />
          <span>Modelo: {model}</span>
          <span className="ml-auto">v1.0.0</span>
        </footer>
      </div>
    </div>
  );
}
