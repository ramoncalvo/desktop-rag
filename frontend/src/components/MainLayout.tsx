// RAG App — https://github.com/ramoncalvo

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Session } from "../lib/api";
import Sidebar from "./Sidebar";
import ChatTab from "./ChatTab";
import DocumentViewer from "./DocumentViewer";
import IndexerTab from "./IndexerTab";
import SettingsTab from "./SettingsTab";
import ProfileTab from "./ProfileTab";
import BillingTab from "./BillingTab";
import CreditsTab from "./CreditsTab";

type Tab = "chat" | "viewer" | "indexer" | "settings" | "profile" | "billing" | "credits";

export default function MainLayout({ model, onLogout }: { model: string; onLogout: () => void }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("chat");
  const [viewerFileId, setViewerFileId] = useState<string | null>(null);
  const [viewerPage, setViewerPage] = useState<number | undefined>(undefined);
  const [viewerStartTime, setViewerStartTime] = useState<number | undefined>(undefined);

  useEffect(() => { loadSessions(); }, []);

  async function loadSessions() { setSessions(await api.sessions.list()); }

  function handleNewChat() { setCurrentSessionId(null); setTab("chat"); }
  function handleSelectSession(id: string) { setCurrentSessionId(id); setTab("chat"); }
  async function handleDeleteSession(id: string) {
    await api.sessions.delete(id);
    if (currentSessionId === id) setCurrentSessionId(null);
    loadSessions();
  }
  function handleOpenDocument(fileId: string, page?: number, startTimeSec?: number) {
    setViewerFileId(fileId); setViewerPage(page); setViewerStartTime(startTimeSec); setTab("viewer");
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "chat", label: "Chat", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
    { key: "viewer", label: "Visor", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { key: "indexer", label: "Fuentes", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg> },
    { key: "settings", label: "Settings", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { key: "credits", label: "Creditos", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  ];

  return (
    <div className="flex h-screen" style={{ background: "var(--bg)" }}>
      <Sidebar sessions={sessions} currentSessionId={currentSessionId}
        onSelect={handleSelectSession} onNew={handleNewChat} onDelete={handleDeleteSession}
        onNavigate={(t) => setTab(t as Tab)} onLogout={onLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <nav className="flex shrink-0" style={{ borderBottom: "1px solid var(--navbar-border)", background: "var(--navbar-bg)" }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition"
              style={{
                color: tab === t.key ? "var(--navbar-active)" : "var(--navbar-inactive)",
                borderBottomColor: tab === t.key ? "var(--navbar-active)" : "transparent",
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-hidden halftone" style={{ background: "var(--chat-bg)" }}>
          {tab === "chat" && <ChatTab sessionId={currentSessionId}
            onSessionCreated={(id) => { setCurrentSessionId(id); loadSessions(); }}
            onTitleChanged={loadSessions} onOpenDocument={handleOpenDocument} />}
          {tab === "viewer" && <DocumentViewer fileId={viewerFileId} page={viewerPage} startTime={viewerStartTime} />}
          {tab === "indexer" && <IndexerTab />}
          {tab === "settings" && <SettingsTab />}
          {tab === "profile" && <ProfileTab />}
          {tab === "billing" && <BillingTab />}
          {tab === "credits" && <CreditsTab />}
        </div>

        <footer className="px-4 py-1.5 text-[11px] shrink-0 flex items-center gap-2"
          style={{ color: "var(--sidebar-text-muted)", background: "var(--statusbar-bg)", borderTop: "1px solid var(--navbar-border)" }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          <span>Modelo: {model}</span>
          <span className="ml-auto">v1.0.0</span>
        </footer>
      </div>
    </div>
  );
}
