// RAG App — https://github.com/ramoncalvo

import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { Message, Source } from "../lib/api";

interface Props {
  sessionId: string | null;
  onSessionCreated: (id: string) => void;
  onTitleChanged: () => void;
  onOpenDocument?: (fileId: string, page?: number) => void;
}

export default function ChatTab({ sessionId, onSessionCreated, onTitleChanged, onOpenDocument }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { sessionId ? loadMessages(sessionId) : setMessages([]); }, [sessionId]);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  async function loadMessages(id: string) { setMessages(await api.sessions.messages(id)); }

  async function handleSend() {
    if (sending || !input.trim()) return;
    const text = input.trim();
    setInput(""); setSending(true);

    let sid = sessionId;
    if (!sid) { const s = await api.sessions.create(text.slice(0, 80)); sid = s.id; onSessionCreated(sid); }

    setMessages((prev) => [...prev, { id: "temp", session_id: sid!, role: "user", content: text, sources: null, actions: null, created_at: "" }]);

    try {
      const response = await api.sessions.send(sid!, text);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "temp"),
        { id: "user-" + Date.now(), session_id: sid!, role: "user", content: text, sources: null, actions: null, created_at: "" },
        response,
      ]);
      onTitleChanged();
    } catch (e: any) {
      setMessages((prev) => [...prev, { id: "err", session_id: sid!, role: "assistant", content: `Error: ${e.message}`, sources: null, actions: null, created_at: "" }]);
    }
    setSending(false); textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }

  function parseSources(raw: string | null): Source[] { if (!raw) return []; try { return JSON.parse(raw); } catch { return []; } }

  function renderSources(sources: Source[]) {
    const seen = new Set<string>();
    const tags: { label: string; key: string; fileId: string; page?: number }[] = [];
    sources.forEach((src) => {
      if (seen.has(src.file_id)) return; seen.add(src.file_id);
      if (src.source_type === "video") {
        const ts = sources.filter((s) => s.file_id === src.file_id).map((s) => s.start_ts || `${s.start_min}min`);
        tags.push({ label: `${src.title} (${ts.join(", ")})`, key: src.file_id, fileId: src.file_id });
      } else if (src.source_type === "pdf") {
        const pages = [...new Set(sources.filter((s) => s.file_id === src.file_id).map((s) => s.page))].sort();
        tags.push({ label: `${src.title} p.${pages.join(", ")}`, key: src.file_id, fileId: src.file_id, page: pages[0] });
      } else {
        tags.push({ label: src.title, key: src.file_id, fileId: src.file_id });
      }
    });
    if (!tags.length) return null;
    return (
      <div className="mt-3 pt-3 flex flex-wrap gap-1.5" style={{ borderTop: "1px solid var(--border)" }}>
        {tags.map((t) => (
          <button key={t.key} onClick={() => onOpenDocument?.(t.fileId, t.page)}
            className="text-[11px] px-2 py-0.5 rounded font-medium transition cursor-pointer"
            style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
            {t.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-subtle)" }}>
              <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>R</span>
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Escribe una pregunta para empezar</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={msg.id || i} className={`max-w-[85%] ${msg.role === "user" ? "ml-auto" : "mr-auto"}`}>
            <div className="px-4 py-3 text-sm leading-relaxed"
              style={msg.role === "user"
                ? { background: "var(--user-msg)", color: "var(--user-msg-text)", borderRadius: "16px 16px 4px 16px", fontWeight: 500 }
                : { background: "var(--assistant-msg)", color: "var(--text)", borderRadius: "16px 16px 16px 4px", border: "1px solid var(--assistant-msg-border)" }}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.role === "assistant" && renderSources(parseSources(msg.sources))}
            </div>
          </div>
        ))}

        {sending && (
          <div className="mr-auto flex items-center gap-2 py-2">
            <div className="flex gap-1">
              {[0, 150, 300].map((d) => (
                <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: `${d}ms` }} />
              ))}
            </div>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Pensando...</span>
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      <div className="px-6 py-4 flex gap-3 shrink-0" style={{ borderTop: "1px solid var(--navbar-border)", background: "var(--chat-input-bg)" }}>
        <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Escribe tu pregunta..." rows={3}
          className="flex-1 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none transition placeholder:opacity-50"
          style={{ background: "var(--accent-subtle)", color: "var(--sidebar-text)", border: "1px solid var(--sidebar-border)" }} />
        <div className="flex flex-col gap-2">
          <button onClick={handleSend} disabled={sending || !input.trim()}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}>Enviar</button>
          <button disabled={!sending}
            className="px-5 py-2 rounded-lg text-sm transition disabled:opacity-30"
            style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
