// RAG App — https://github.com/ramoncalvo

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Session } from "../lib/api";
import Sidebar from "./Sidebar";
import ChatTab from "./ChatTab";
import IndexerTab from "./IndexerTab";

export default function MainLayout({ model }: { model: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [tab, setTab] = useState<"chat" | "indexer">("chat");

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

  return (
    <div className="flex h-screen bg-[#0f0f0f]">
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelect={handleSelectSession}
        onNew={handleNewChat}
        onDelete={handleDeleteSession}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <nav className="flex border-b border-[#333] bg-[#1a1a1a] shrink-0">
          <button
            onClick={() => setTab("chat")}
            className={`px-6 py-3 text-sm border-b-2 transition ${
              tab === "chat"
                ? "text-blue-400 border-blue-400"
                : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setTab("indexer")}
            className={`px-6 py-3 text-sm border-b-2 transition ${
              tab === "indexer"
                ? "text-blue-400 border-blue-400"
                : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            Fuentes
          </button>
        </nav>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {tab === "chat" ? (
            <ChatTab
              sessionId={currentSessionId}
              onSessionCreated={(id) => {
                setCurrentSessionId(id);
                loadSessions();
              }}
              onTitleChanged={loadSessions}
            />
          ) : (
            <IndexerTab />
          )}
        </div>

        {/* Status bar */}
        <footer className="px-4 py-1.5 text-xs text-gray-500 bg-[#1a1a1a] border-t border-[#333] shrink-0">
          Modelo: {model}
        </footer>
      </div>
    </div>
  );
}
