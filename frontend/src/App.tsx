// RAG App — https://github.com/ramoncalvo

import { useEffect, useState } from "react";
import { api } from "./lib/api";
import { useThemeStore } from "./store/theme";
import LoginScreen from "./components/LoginScreen";
import SetupScreen from "./components/SetupScreen";
import MainLayout from "./components/MainLayout";

type Screen = "loading" | "login" | "setup" | "main";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [model, setModel] = useState("");
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    for (let i = 0; i < 30; i++) {
      try {
        await api.health();
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    const loggedIn = localStorage.getItem("rag-app-logged-in");
    if (!loggedIn) {
      setScreen("login");
      return;
    }

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
    setScreen("loading");
    init();
  }

  function handleSetupReady(m: string) {
    setModel(m);
    setScreen("main");
  }

  return (
    <div className={`theme-${theme}`}>
      {screen === "loading" && (
        <div className="flex items-center justify-center h-screen" style={{ background: "var(--bg)" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <span className="text-sm font-bold" style={{ color: "var(--accent-text)" }}>R</span>
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Conectando...</p>
          </div>
        </div>
      )}
      {screen === "login" && <LoginScreen onLogin={handleLogin} />}
      {screen === "setup" && <SetupScreen onReady={handleSetupReady} />}
      {screen === "main" && <MainLayout model={model} />}
    </div>
  );
}
