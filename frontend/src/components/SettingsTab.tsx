// RAG App — https://github.com/ramoncalvo

import { useEffect, useState } from "react";
import { api } from "../lib/api";

const MODELS = [
  "llama3.1:8b",
  "llama3.2:3b",
  "mistral:7b",
  "gemma2:9b",
  "qwen2.5:7b",
];

export default function SettingsTab() {
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [dbPath, setDbPath] = useState("~/.rag-app");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const ollamaStatus = await api.ollama.status();
      setModel(ollamaStatus.saved_model || "llama3.1:8b");
      setModels(ollamaStatus.models);

      const dbSetting = await api.settings.get("db_path");
      if (dbSetting.value) setDbPath(dbSetting.value);
    } catch {}
  }

  async function handleSaveModel() {
    setSaving(true);
    setStatus("");
    try {
      await api.ollama.pull(model);
      setStatus("Modelo guardado correctamente");
      loadSettings();
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
    setSaving(false);
  }

  return (
    <div className="p-6 overflow-y-auto h-full space-y-5">
      {/* Ollama settings */}
      <div className="bg-[#151b23] border border-[#1e2a36] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-[#c8ff00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Modelo LLM (Ollama)
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-1.5 block">
              Modelo activo
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={saving}
              className="w-full bg-[#0d1117] text-gray-200 border border-[#1e2a36] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#c8ff00]/40 transition disabled:opacity-40"
            >
              {MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {models.length > 0 && (
            <div>
              <label className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-1.5 block">
                Modelos descargados
              </label>
              <div className="flex flex-wrap gap-2">
                {models.map((m) => (
                  <span key={m} className="text-[11px] bg-[#c8ff00]/10 text-[#c8ff00] px-2.5 py-1 rounded-md font-medium">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveModel}
              disabled={saving}
              className="bg-[#c8ff00] hover:bg-[#d4ff33] text-[#0d1117] px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-40"
            >
              {saving ? "Guardando..." : "Guardar modelo"}
            </button>
            {status && <span className="text-xs text-gray-400">{status}</span>}
          </div>
        </div>
      </div>

      {/* Storage settings */}
      <div className="bg-[#151b23] border border-[#1e2a36] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-[#c8ff00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          Almacenamiento
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-1.5 block">
              Directorio de datos
            </label>
            <input
              type="text"
              value={dbPath}
              readOnly
              className="w-full bg-[#0d1117] text-gray-400 border border-[#1e2a36] rounded-lg px-4 py-2.5 text-sm"
            />
            <p className="text-[11px] text-gray-600 mt-1.5">SQLite + ChromaDB se almacenan aqui</p>
          </div>
        </div>
      </div>

      {/* App info */}
      <div className="bg-[#151b23] border border-[#1e2a36] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-[#c8ff00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Informacion
        </h3>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-gray-500">Ollama</div>
          <div className="text-gray-300">localhost:11434</div>
          <div className="text-gray-500">ChromaDB</div>
          <div className="text-gray-300">Embebido (PersistentClient)</div>
          <div className="text-gray-500">Base de datos</div>
          <div className="text-gray-300">SQLite</div>
          <div className="text-gray-500">Embeddings</div>
          <div className="text-gray-300">paraphrase-multilingual-MiniLM</div>
        </div>
      </div>
    </div>
  );
}
