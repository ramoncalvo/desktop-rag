// RAG App — https://github.com/ramoncalvo

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { IndexedFile, TextContent } from "../lib/api";

const API = "http://127.0.0.1:5555/api";

interface Props {
  fileId: string | null;
  page?: number;
}

export default function DocumentViewer({ fileId, page: initialPage }: Props) {
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(fileId);
  const [loading, setLoading] = useState(false);
  const [fileType, setFileType] = useState<string>("");
  const [title, setTitle] = useState("");

  // Text/transcript state
  const [textContent, setTextContent] = useState<TextContent | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (fileId) setSelectedFileId(fileId);
  }, [fileId]);

  useEffect(() => {
    if (selectedFileId) {
      const file = files.find((f) => f.id === selectedFileId);
      if (file) {
        setFileType(file.file_type);
        setTitle(file.title || file.file_name);

        if (file.file_type !== "pdf") {
          loadTextContent(selectedFileId);
        } else {
          setTextContent(null);
          setLoading(false);
        }
      }
    } else {
      setFileType("");
      setTextContent(null);
      setTitle("");
    }
  }, [selectedFileId, files]);

  async function loadFiles() {
    try {
      const f = await api.files.list();
      setFiles(f);
    } catch {}
  }

  async function loadTextContent(fid: string) {
    setLoading(true);
    try {
      const data = await api.files.content(fid);
      if ("segments" in data) {
        setTextContent(data as TextContent);
      }
    } catch {}
    setLoading(false);
  }

  function handleFileSelect(fid: string) {
    setSelectedFileId(fid);
  }

  // Build PDF URL with optional page anchor
  const pdfUrl = selectedFileId && fileType === "pdf"
    ? `${API}/files/${selectedFileId}/raw#page=${initialPage || 1}`
    : "";

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[#1e2a36] bg-[#0d1117] shrink-0">
        <svg className="w-4 h-4 text-[#c8ff00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <select
          value={selectedFileId || ""}
          onChange={(e) => handleFileSelect(e.target.value)}
          className="flex-1 bg-[#151b23] text-gray-200 border border-[#1e2a36] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c8ff00]/40 transition max-w-md"
        >
          <option value="">Selecciona un documento...</option>
          {files.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title || f.file_name} ({f.file_type})
            </option>
          ))}
        </select>

        {title && (
          <span className="text-[11px] bg-[#c8ff00]/10 text-[#c8ff00] px-2.5 py-1 rounded-md font-medium">
            {fileType.toUpperCase()}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {!selectedFileId && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <svg className="w-12 h-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 text-sm">Selecciona un documento para ver su contenido</p>
          </div>
        )}

        {/* PDF: render original in iframe */}
        {selectedFileId && fileType === "pdf" && (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-none bg-[#151b23]"
            title={title}
          />
        )}

        {/* Video transcript */}
        {selectedFileId && fileType !== "pdf" && !loading && textContent && (
          <div className="overflow-y-auto h-full p-6">
            <div className="max-w-3xl mx-auto">
              <div className="bg-[#151b23] border border-[#1e2a36] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    {textContent.title}
                  </h3>
                  <span className="text-[11px] bg-[#c8ff00]/10 text-[#c8ff00] px-2 py-0.5 rounded font-medium">
                    {textContent.file_type.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-4">
                  {textContent.segments.map((seg, i) => (
                    <div key={i} className="border-l-2 border-[#1e2a36] pl-4 hover:border-[#c8ff00]/40 transition">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] bg-[#1e2a36] text-[#c8ff00] px-2 py-0.5 rounded font-mono">
                          {seg.start_ts}
                        </span>
                        <span className="text-[11px] text-gray-600">→ {seg.end_ts}</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">{seg.text}</p>
                    </div>
                  ))}
                  {textContent.segments.length === 0 && (
                    <p className="text-gray-600 text-sm italic">Sin contenido disponible</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {selectedFileId && loading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-[#c8ff00] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-[#c8ff00] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-[#c8ff00] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
