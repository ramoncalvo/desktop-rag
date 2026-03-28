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
    <div className="flex items-center justify-center h-screen bg-[#0f0f0f]">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-10 w-[480px] text-center">
        <h1 className="text-3xl font-bold text-white mb-1">RAG App</h1>
        <p className="text-gray-500 mb-6">Configuracion inicial</p>

        <p className="text-sm text-gray-300 mb-3">{status}</p>

        {/* Progress bar */}
        <div className="w-full h-1 bg-[#242424] rounded-full mb-4 overflow-hidden">
          {(loading || working) && (
            <div className="h-full w-1/3 bg-blue-500 rounded-full animate-[slide_1.2s_ease-in-out_infinite]" />
          )}
        </div>

        {/* Model select */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <label className="text-gray-400 text-sm">Modelo:</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={working}
            className="bg-[#242424] text-gray-200 border border-[#333] rounded-lg px-3 py-2 text-sm disabled:opacity-40"
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Button */}
        <button
          onClick={handleStart}
          disabled={loading || working}
          className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {working ? "Preparando..." : "Iniciar"}
        </button>

        {detail && (
          <p className="text-xs text-gray-500 mt-4">{detail}</p>
        )}
      </div>
    </div>
  );
}
