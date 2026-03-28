// RAG App — https://github.com/ramoncalvo

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useThemeStore } from "../store/theme";

const MODELS = ["llama3.1:8b", "llama3.2:3b", "mistral:7b", "gemma2:9b", "qwen2.5:7b"];

export default function SettingsTab() {
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [dbPath] = useState("~/.rag-app");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const { theme, set: setTheme } = useThemeStore();

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const s = await api.ollama.status();
      setModel(s.saved_model || "llama3.1:8b");
      setModels(s.models);
    } catch {}
  }

  async function handleSaveModel() {
    setSaving(true); setStatus("");
    try { await api.ollama.pull(model); setStatus("Modelo guardado"); loadSettings(); }
    catch (e: any) { setStatus(`Error: ${e.message}`); }
    setSaving(false);
  }

  return (
    <div className="p-6 overflow-y-auto h-full space-y-5">
      {/* Theme */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text)" }}>
          <svg className="w-4 h-4" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
          Apariencia
        </h3>
        <div className="flex gap-3">
          <button onClick={() => setTheme("dark")}
            className="flex-1 py-3 rounded-lg text-sm font-medium transition"
            style={theme === "dark"
              ? { background: "var(--accent)", color: "var(--accent-text)" }
              : { background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            Oscuro
          </button>
          <button onClick={() => setTheme("light")}
            className="flex-1 py-3 rounded-lg text-sm font-medium transition"
            style={theme === "light"
              ? { background: "var(--accent)", color: "var(--accent-text)" }
              : { background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            Claro
          </button>
        </div>
      </div>

      {/* Ollama */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text)" }}>
          <svg className="w-4 h-4" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          Modelo LLM (Ollama)
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: "var(--text-muted)" }}>Modelo activo</label>
            <select value={model} onChange={(e) => setModel(e.target.value)} disabled={saving}
              className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none transition disabled:opacity-40"
              style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}>
              {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {models.length > 0 && (
            <div>
              <label className="text-[11px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: "var(--text-muted)" }}>Modelos descargados</label>
              <div className="flex flex-wrap gap-2">
                {models.map((m) => <span key={m} className="text-[11px] px-2.5 py-1 rounded-md font-medium" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>{m}</span>)}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button onClick={handleSaveModel} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-40"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}>{saving ? "Guardando..." : "Guardar modelo"}</button>
            {status && <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{status}</span>}
          </div>
        </div>
      </div>

      {/* Storage */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text)" }}>
          <svg className="w-4 h-4" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
          Almacenamiento
        </h3>
        <div>
          <label className="text-[11px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: "var(--text-muted)" }}>Directorio de datos</label>
          <input type="text" value={dbPath} readOnly className="w-full rounded-lg px-4 py-2.5 text-sm"
            style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }} />
          <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>SQLite + ChromaDB se almacenan aqui</p>
        </div>
      </div>
    </div>
  );
}
