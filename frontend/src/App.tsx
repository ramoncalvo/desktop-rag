// RAG App — https://github.com/ramoncalvo

import { useEffect, useState } from "react";
import { api } from "./lib/api";
import SetupScreen from "./components/SetupScreen";
import MainLayout from "./components/MainLayout";

export default function App() {
  const [ready, setReady] = useState(false);
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    // Wait for backend
    for (let i = 0; i < 30; i++) {
      try {
        await api.health();
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    try {
      const status = await api.ollama.status();
      if (
        status.saved_model &&
        status.running &&
        status.models.some((m) =>
          m.startsWith(status.saved_model.split(":")[0])
        )
      ) {
        setModel(status.saved_model);
        setReady(true);
      }
    } catch {}
    setLoading(false);
  }

  function handleReady(m: string) {
    setModel(m);
    setReady(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f0f0f]">
        <div className="text-gray-400 text-lg">Conectando...</div>
      </div>
    );
  }

  if (!ready) {
    return <SetupScreen onReady={handleReady} />;
  }

  return <MainLayout model={model} />;
}
