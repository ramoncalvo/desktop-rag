// RAG App — https://github.com/ramoncalvo

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { IndexedFile, PdfPageContent, PdfOverview, TextContent } from "../lib/api";

interface Props {
  fileId: string | null;
  page?: number;
}

export default function DocumentViewer({ fileId, page: initialPage }: Props) {
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(fileId);
  const [loading, setLoading] = useState(false);

  // PDF state
  const [pdfOverview, setPdfOverview] = useState<PdfOverview | null>(null);
  const [pdfPage, setPdfPage] = useState<PdfPageContent | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage || 1);

  // Text/transcript state
  const [textContent, setTextContent] = useState<TextContent | null>(null);

  const [fileType, setFileType] = useState<string>("");

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (fileId) {
      setSelectedFileId(fileId);
    }
  }, [fileId]);

  useEffect(() => {
    if (selectedFileId) {
      loadContent(selectedFileId);
    } else {
      setPdfOverview(null);
      setPdfPage(null);
      setTextContent(null);
    }
  }, [selectedFileId]);

  useEffect(() => {
    if (selectedFileId && fileType === "pdf" && currentPage) {
      loadPage(selectedFileId, currentPage);
    }
  }, [currentPage]);

  async function loadFiles() {
    try {
      const f = await api.files.list();
      setFiles(f);
    } catch {}
  }

  async function loadContent(fid: string) {
    setLoading(true);
    setPdfPage(null);
    setTextContent(null);
    setPdfOverview(null);

    try {
      const data = await api.files.content(fid);

      if (data.file_type === "pdf") {
        const overview = data as PdfOverview;
        setFileType("pdf");
        setPdfOverview(overview);
        const startPage = initialPage && fileId === fid ? initialPage : 1;
        setCurrentPage(startPage);
        await loadPage(fid, startPage);
      } else {
        setFileType("text");
        setTextContent(data as TextContent);
      }
    } catch (e: any) {
      console.error("Error loading content:", e);
    }
    setLoading(false);
  }

  async function loadPage(fid: string, page: number) {
    try {
      const data = await api.files.content(fid, page);
      if (data.file_type === "pdf" && "blocks" in data) {
        setPdfPage(data as PdfPageContent);
      }
    } catch {}
  }

  function handleFileSelect(fid: string) {
    setSelectedFileId(fid);
    setCurrentPage(1);
  }

  const textFiles = files.filter((f) => f.file_type === "pdf" || ["mp4", "mkv", "avi", "mov", "webm", "mp3", "wav"].includes(f.file_type));

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
          {textFiles.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title || f.file_name} ({f.file_type})
            </option>
          ))}
        </select>

        {/* PDF navigation */}
        {fileType === "pdf" && pdfOverview && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="bg-[#151b23] hover:bg-[#1e2a36] text-gray-300 px-3 py-1.5 rounded-lg text-sm border border-[#1e2a36] transition disabled:opacity-30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm text-gray-400 min-w-[80px] text-center">
              {currentPage} / {pdfOverview.total_pages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(pdfOverview.total_pages, p + 1))}
              disabled={currentPage >= pdfOverview.total_pages}
              className="bg-[#151b23] hover:bg-[#1e2a36] text-gray-300 px-3 py-1.5 rounded-lg text-sm border border-[#1e2a36] transition disabled:opacity-30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Page list sidebar (PDF only) */}
        {fileType === "pdf" && pdfOverview && (
          <div className="w-48 border-r border-[#1e2a36] overflow-y-auto bg-[#0a0e14] shrink-0">
            {pdfOverview.pages.map((p) => (
              <button
                key={p.page}
                onClick={() => setCurrentPage(p.page)}
                className={`w-full text-left px-3 py-2.5 text-[12px] border-b border-[#1e2a36] transition ${
                  p.page === currentPage
                    ? "bg-[#c8ff00]/10 text-[#c8ff00]"
                    : "text-gray-500 hover:bg-[#151b23] hover:text-gray-300"
                }`}
              >
                <div className="font-medium mb-0.5">Pagina {p.page}</div>
                <div className="truncate text-[11px] opacity-60">
                  {p.preview || "Sin contenido"}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedFileId && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <svg className="w-12 h-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 text-sm">Selecciona un documento para ver su contenido</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#c8ff00] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-[#c8ff00] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-[#c8ff00] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {/* PDF page view */}
          {!loading && fileType === "pdf" && pdfPage && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-[#151b23] border border-[#1e2a36] rounded-xl p-8 space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    {pdfPage.title} — Pagina {pdfPage.page}
                  </h3>
                  <span className="text-[11px] bg-[#c8ff00]/10 text-[#c8ff00] px-2 py-0.5 rounded font-medium">
                    PDF
                  </span>
                </div>
                {pdfPage.blocks.map((block, i) => (
                  <p
                    key={i}
                    className="text-sm text-gray-300 leading-relaxed"
                    style={{ marginLeft: block.x > 100 ? `${Math.min(block.x / 8, 40)}px` : 0 }}
                  >
                    {block.text}
                  </p>
                ))}
                {pdfPage.blocks.length === 0 && (
                  <p className="text-gray-600 text-sm italic">Esta pagina no tiene contenido de texto</p>
                )}
              </div>
            </div>
          )}

          {/* Text/transcript view */}
          {!loading && fileType === "text" && textContent && (
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
          )}
        </div>
      </div>
    </div>
  );
}
