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

export default function SetupScreen({ onReady }: { onReady: (model: string) => void }) {
  const [status, setStatus] = useState("Verificando Ollama...");
  const [detail, setDetail] = useState("");
  const [model, setModel] = useState("llama3.1:8b");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    checkOllama();
  }, []);

  async function checkOllama() {
    try {
      const s = await api.ollama.status();
      if (!s.installed) {
        setStatus("Ollama no esta instalado");
        setDetail("Instala Ollama desde https://ollama.com");
      } else if (s.running) {
        setStatus("Ollama esta corriendo");
        if (s.models.length) setDetail(`Modelos locales: ${s.models.join(", ")}`);
      } else {
        setStatus("Ollama instalado pero no esta corriendo");
        setDetail("Presiona 'Iniciar' para arrancar Ollama y descargar el modelo");
      }
    } catch {
      setStatus("Error conectando al backend");
    }
    setLoading(false);
  }

  async function handleStart() {
    setWorking(true);
    try {
      const s = await api.ollama.status();
      if (!s.running) {
        setStatus("Iniciando Ollama...");
        await api.ollama.start();
      }
      setStatus(`Preparando modelo ${model}...`);
      setDetail("Esto puede tardar unos minutos la primera vez");
      await api.ollama.pull(model);
      setStatus(`Modelo ${model} listo`);
      setTimeout(() => onReady(model), 500);
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
      setWorking(false);
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-[#0d1117] halftone relative overflow-hidden">
      {/* Decorative halftone wave - top right */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#c8ff00]/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[#c8ff00]/5 to-transparent rounded-full blur-3xl" />

      <div className="relative z-10 w-[520px]">
        {/* Logo card */}
        <div className="bg-[#c8ff00] rounded-2xl px-8 py-6 mb-6 text-center">
          <h1 className="text-4xl font-bold text-[#0d1117] tracking-tight">
            rag-app<span className="text-[#0d1117]/40 text-sm align-super ml-1">®</span>
          </h1>
          <p className="text-[#0d1117]/60 text-sm mt-1">Solutions.</p>
        </div>

        {/* Setup card */}
        <div className="bg-[#151b23] border border-[#2a3a4a] rounded-2xl p-8">
          <p className="text-sm text-gray-300 mb-4 text-center">{status}</p>

          {/* Progress bar */}
          <div className="w-full h-1 bg-[#1e2a36] rounded-full mb-6 overflow-hidden">
            {(loading || working) && (
              <div className="h-full w-full sweep-loading rounded-full" />
            )}
            {!loading && !working && (
              <div className="h-full bg-[#c8ff00] rounded-full transition-all duration-500" style={{ width: "100%" }} />
            )}
          </div>

          {/* Model select */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <label className="text-gray-500 text-sm">Modelo:</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={working}
              className="bg-[#1e2a36] text-gray-200 border border-[#2a3a4a] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#c8ff00]/50 transition disabled:opacity-40"
            >
              {MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Button */}
          <div className="flex justify-center">
            <button
              onClick={handleStart}
              disabled={loading || working}
              className="bg-[#c8ff00] hover:bg-[#d4ff33] text-[#0d1117] px-8 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed glow-lime"
            >
              {working ? "Preparando..." : "Iniciar"}
            </button>
          </div>

          {detail && (
            <p className="text-xs text-gray-500 mt-5 text-center">{detail}</p>
          )}
        </div>

        <p className="text-center text-[10px] text-gray-600 mt-4">©2025 rag-app</p>
      </div>
    </div>
  );
}
