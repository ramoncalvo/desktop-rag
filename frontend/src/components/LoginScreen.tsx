// RAG App — https://github.com/ramoncalvo

import { useState } from "react";

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex items-center justify-center h-screen bg-[#0d1117] halftone relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#c8ff00]/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[#c8ff00]/5 to-transparent rounded-full blur-3xl" />

      <div className="relative z-10 w-[440px]">
        {/* Brand */}
        <div className="bg-[#c8ff00] rounded-2xl px-8 py-6 mb-6 text-center">
          <h1 className="text-4xl font-bold text-[#0d1117] tracking-tight">
            rag-app<span className="text-[#0d1117]/40 text-sm align-super ml-1">®</span>
          </h1>
          <p className="text-[#0d1117]/60 text-sm mt-1">Solutions.</p>
        </div>

        {/* Login form */}
        <div className="bg-[#151b23] border border-[#2a3a4a] rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-gray-200 mb-6 text-center">Iniciar sesion</h2>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                className="w-full bg-[#0d1117] text-gray-200 border border-[#1e2a36] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#c8ff00]/40 transition placeholder:text-gray-600"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-1.5 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0d1117] text-gray-200 border border-[#1e2a36] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#c8ff00]/40 transition placeholder:text-gray-600"
              />
            </div>
          </div>

          <button
            onClick={onLogin}
            className="w-full bg-[#c8ff00] hover:bg-[#d4ff33] text-[#0d1117] py-2.5 rounded-lg text-sm font-semibold transition glow-lime"
          >
            Entrar
          </button>

          <p className="text-center text-[11px] text-gray-600 mt-4">
            Por ahora, solo presiona "Entrar" para acceder
          </p>
        </div>

        <p className="text-center text-[10px] text-gray-600 mt-4">©2025 rag-app</p>
      </div>
    </div>
  );
}
