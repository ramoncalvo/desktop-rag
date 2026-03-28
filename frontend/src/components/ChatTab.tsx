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

  useEffect(() => {
    if (sessionId) {
      loadMessages(sessionId);
    } else {
      setMessages([]);
    }
  }, [sessionId]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function loadMessages(id: string) {
    const msgs = await api.sessions.messages(id);
    setMessages(msgs);
  }

  async function handleSend() {
    if (sending || !input.trim()) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    let sid = sessionId;
    if (!sid) {
      const session = await api.sessions.create(text.slice(0, 80));
      sid = session.id;
      onSessionCreated(sid);
    }

    setMessages((prev) => [
      ...prev,
      { id: "temp", session_id: sid!, role: "user", content: text, sources: null, actions: null, created_at: "" },
    ]);

    try {
      const response = await api.sessions.send(sid!, text);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "temp"),
        { id: "user-" + Date.now(), session_id: sid!, role: "user", content: text, sources: null, actions: null, created_at: "" },
        response,
      ]);
      onTitleChanged();
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { id: "err", session_id: sid!, role: "assistant", content: `Error: ${e.message}`, sources: null, actions: null, created_at: "" },
      ]);
    }

    setSending(false);
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function parseSources(raw: string | null): Source[] {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }

  function renderSources(sources: Source[]) {
    const seen = new Set<string>();
    const tags: { label: string; key: string; fileId: string; page?: number }[] = [];

    sources.forEach((src) => {
      if (seen.has(src.file_id)) return;
      seen.add(src.file_id);

      if (src.source_type === "video") {
        const timestamps = sources
          .filter((s) => s.file_id === src.file_id)
          .map((s) => s.start_ts || `${s.start_min}min`);
        tags.push({ label: `${src.title} (${timestamps.join(", ")})`, key: src.file_id, fileId: src.file_id });
      } else if (src.source_type === "pdf") {
        const pages = [...new Set(sources.filter((s) => s.file_id === src.file_id).map((s) => s.page))].sort();
        const firstPage = pages[0];
        tags.push({ label: `${src.title} p.${pages.join(", ")}`, key: src.file_id, fileId: src.file_id, page: firstPage });
      } else {
        tags.push({ label: src.title, key: src.file_id, fileId: src.file_id });
      }
    });

    if (!tags.length) return null;

    return (
      <div className="mt-3 pt-3 border-t border-[#1e2a36] flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <button
            key={t.key}
            onClick={() => onOpenDocument?.(t.fileId, t.page)}
            className="text-[11px] bg-[#c8ff00]/10 text-[#c8ff00]/70 px-2 py-0.5 rounded font-medium hover:bg-[#c8ff00]/20 hover:text-[#c8ff00] transition cursor-pointer"
          >
            {t.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 bg-[#c8ff00]/10 rounded-xl flex items-center justify-center">
              <span className="text-[#c8ff00] text-lg font-bold">R</span>
            </div>
            <p className="text-gray-600 text-sm">Escribe una pregunta para empezar</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={msg.id || i}
            className={`max-w-[85%] ${msg.role === "user" ? "ml-auto" : "mr-auto"}`}
          >
            <div
              className={`px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#c8ff00] text-[#0d1117] rounded-2xl rounded-br-sm font-medium"
                  : "bg-[#151b23] border border-[#1e2a36] text-gray-200 rounded-2xl rounded-bl-sm"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.role === "assistant" && renderSources(parseSources(msg.sources))}
            </div>
          </div>
        ))}

        {sending && (
          <div className="mr-auto flex items-center gap-2 py-2">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-[#c8ff00] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 bg-[#c8ff00] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 bg-[#c8ff00] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-gray-500 text-sm">Pensando...</span>
          </div>
        )}

        <div ref={messagesEnd} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-[#1e2a36] bg-[#0a0e14] flex gap-3 shrink-0">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu pregunta..."
          rows={3}
          className="flex-1 bg-[#151b23] text-gray-200 border border-[#1e2a36] rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#c8ff00]/40 transition placeholder:text-gray-600"
        />
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="bg-[#c8ff00] hover:bg-[#d4ff33] text-[#0d1117] px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Enviar
          </button>
          <button
            disabled={!sending}
            className="bg-[#151b23] hover:bg-[#1e2a36] text-gray-500 px-5 py-2 rounded-lg text-sm border border-[#1e2a36] transition disabled:opacity-30"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
