// RAG App — https://github.com/ramoncalvo

import { useState } from "react";

export default function ProfileTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) { setStatus("Completa todos los campos"); return; }
    if (newPassword !== confirmPassword) { setStatus("Las contrasenas no coinciden"); return; }
    if (newPassword.length < 6) { setStatus("La contrasena debe tener al menos 6 caracteres"); return; }

    setSaving(true); setStatus("");
    // TODO: call backend when auth is implemented
    await new Promise((r) => setTimeout(r, 800));
    setStatus("Contrasena actualizada correctamente");
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    setSaving(false);
  }

  return (
    <div className="p-6 overflow-y-auto h-full space-y-5">
      {/* Profile info */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-semibold mb-5 flex items-center gap-2" style={{ color: "var(--text)" }}>
          <svg className="w-4 h-4" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Informacion del perfil
        </h3>

        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--accent-subtle)" }}>
            <svg className="w-8 h-8" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold" style={{ color: "var(--text)" }}>Usuario</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>usuario@ejemplo.com</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: "var(--text-muted)" }}>Nombre</label>
            <input type="text" defaultValue="Usuario" className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none transition"
              style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: "var(--text-muted)" }}>Email</label>
            <input type="email" defaultValue="usuario@ejemplo.com" readOnly className="w-full rounded-lg px-4 py-2.5 text-sm"
              style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }} />
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-semibold mb-5 flex items-center gap-2" style={{ color: "var(--text)" }}>
          <svg className="w-4 h-4" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Cambiar contrasena
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: "var(--text-muted)" }}>Contrasena actual</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••"
              className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none transition"
              style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: "var(--text-muted)" }}>Nueva contrasena</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••"
              className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none transition"
              style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: "var(--text-muted)" }}>Confirmar contrasena</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
              className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none transition"
              style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={handleChangePassword} disabled={saving}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-40"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
              {saving ? "Guardando..." : "Cambiar contrasena"}
            </button>
            {status && <span className="text-xs" style={{ color: status.includes("correctamente") ? "var(--accent)" : "var(--danger)" }}>{status}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
