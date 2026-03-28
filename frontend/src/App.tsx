// RAG App — https://github.com/ramoncalvo

import { useEffect, useState } from "react";
import { api } from "./lib/api";
import LoginScreen from "./components/LoginScreen";
import SetupScreen from "./components/SetupScreen";
import MainLayout from "./components/MainLayout";

type Screen = "loading" | "login" | "setup" | "main";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [model, setModel] = useState("");

  useEffect(() => {
    init();
  }, []);

  async function init() {
    // Wait for backend
    for (let i = 0; i < 30; i++) {
      try {
        await api.health();
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Check if logged in (for now, check localStorage)
    const loggedIn = localStorage.getItem("rag-app-logged-in");
    if (!loggedIn) {
      setScreen("login");
      return;
    }

    // Check Ollama
    try {
      const status = await api.ollama.status();
      if (
        status.saved_model &&
        status.running &&
        status.models.some((m) => m.startsWith(status.saved_model.split(":")[0]))
      ) {
        setModel(status.saved_model);
        setScreen("main");
        return;
      }
    } catch {}

    setScreen("setup");
  }

  function handleLogin() {
    localStorage.setItem("rag-app-logged-in", "true");
    // Check Ollama status next
    setScreen("loading");
    init();
  }

  function handleSetupReady(m: string) {
    setModel(m);
    setScreen("main");
  }

  if (screen === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d1117]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-[#c8ff00] rounded-lg flex items-center justify-center">
            <span className="text-[#0d1117] text-sm font-bold">R</span>
          </div>
          <p className="text-gray-500 text-sm">Conectando...</p>
        </div>
      </div>
    );
  }

  if (screen === "login") {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (screen === "setup") {
    return <SetupScreen onReady={handleSetupReady} />;
  }

  return <MainLayout model={model} />;
}
