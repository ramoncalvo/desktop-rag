// RAG App — https://github.com/ramoncalvo

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { IndexedFile, TextContent } from "../lib/api";
import VideoPlayer from "./VideoPlayer";

const API = "http://127.0.0.1:5555/api";

const VIDEO_TYPES = new Set(["mp4", "mkv", "avi", "mov", "webm", "mp3", "wav", "m4a", "ogg", "flac"]);

interface Props {
  fileId: string | null;
  startTime?: number; // seconds for video seek
  page?: number;
}

export default function DocumentViewer({ fileId, page: initialPage, startTime }: Props) {
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(fileId);
  const [loading, setLoading] = useState(false);
  const [fileType, setFileType] = useState("");
  const [title, setTitle] = useState("");
  const [textContent, setTextContent] = useState<TextContent | null>(null);

  useEffect(() => { loadFiles(); }, []);
  useEffect(() => { if (fileId) setSelectedFileId(fileId); }, [fileId]);

  useEffect(() => {
    if (selectedFileId) {
      const file = files.find((f) => f.id === selectedFileId);
      if (file) {
        setFileType(file.file_type);
        setTitle(file.title || file.file_name);
        if (file.file_type !== "pdf") { loadTextContent(selectedFileId); }
        else { setTextContent(null); setLoading(false); }
      }
    } else { setFileType(""); setTextContent(null); setTitle(""); }
  }, [selectedFileId, files]);

  async function loadFiles() { try { setFiles(await api.files.list()); } catch {} }

  async function loadTextContent(fid: string) {
    setLoading(true);
    try { const d = await api.files.content(fid); if ("segments" in d) setTextContent(d as TextContent); }
    catch {} setLoading(false);
  }

  const pdfUrl = selectedFileId && fileType === "pdf"
    ? `${API}/files/${selectedFileId}/raw#page=${initialPage || 1}` : "";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
        <svg className="w-4 h-4" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <select value={selectedFileId || ""} onChange={(e) => setSelectedFileId(e.target.value)}
          className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none transition max-w-md"
          style={{ background: "var(--bg-secondary)", color: "var(--text)", border: "1px solid var(--border)" }}>
          <option value="">Selecciona un documento...</option>
          {files.map((f) => <option key={f.id} value={f.id}>{f.title || f.file_name} ({f.file_type})</option>)}
        </select>
        {title && <span className="text-[11px] px-2.5 py-1 rounded-md font-medium"
          style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>{fileType.toUpperCase()}</span>}
      </div>

      <div className="flex-1 overflow-hidden">
        {!selectedFileId && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <svg className="w-12 h-12" style={{ color: "var(--border)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Selecciona un documento para ver su contenido</p>
          </div>
        )}

        {selectedFileId && fileType === "pdf" && (
          <object data={pdfUrl} type="application/pdf" className="w-full h-full">
            <p className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
              Tu navegador no soporta visualizar PDFs.{" "}
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Descargar PDF</a>
            </p>
          </object>
        )}

        {/* Video player with synced transcript */}
        {selectedFileId && VIDEO_TYPES.has(fileType) && !loading && textContent && (
          <VideoPlayer
            fileId={selectedFileId}
            title={title}
            segments={textContent.segments}
            startTime={startTime}
          />
        )}

        {/* Non-video, non-pdf text content (fallback) */}
        {selectedFileId && fileType !== "pdf" && !VIDEO_TYPES.has(fileType) && !loading && textContent && (
          <div className="overflow-y-auto h-full p-6">
            <div className="max-w-3xl mx-auto rounded-xl p-6" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <div className="space-y-4">
                {textContent.segments.map((seg, i) => (
                  <div key={i} className="pl-4 transition" style={{ borderLeft: "2px solid var(--border)" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] px-2 py-0.5 rounded font-mono" style={{ background: "var(--bg-tertiary)", color: "var(--accent)" }}>{seg.start_ts}</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{seg.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedFileId && loading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1">
              {[0, 150, 300].map((d) => <div key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: `${d}ms` }} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
