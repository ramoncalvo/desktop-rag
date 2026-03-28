// RAG App — https://github.com/ramoncalvo

import { useState } from "react";

const PLANS = [
  {
    id: "personal",
    name: "Personal",
    price: "$9",
    period: "/mes",
    features: [
      "1 usuario",
      "Hasta 100 documentos",
      "Modelos Ollama locales",
      "5 GB almacenamiento",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "$29",
    period: "/mes",
    features: [
      "Hasta 5 usuarios",
      "Documentos ilimitados",
      "Modelos Ollama + LLM comercial",
      "50 GB almacenamiento",
      "Soporte prioritario",
    ],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$99",
    period: "/mes",
    features: [
      "Usuarios ilimitados",
      "Documentos ilimitados",
      "Todos los modelos LLM",
      "Almacenamiento ilimitado",
      "SSO + soporte dedicado",
      "SLA 99.9%",
    ],
  },
];

export default function BillingTab() {
  const [currentPlan] = useState("personal");
  const [selectedPlan, setSelectedPlan] = useState("personal");

  return (
    <div className="p-6 overflow-y-auto h-full space-y-5">
      {/* Current plan */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--text)" }}>
          <svg className="w-4 h-4" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Plan actual
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold" style={{ color: "var(--text)" }}>Personal</span>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
            style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>Activo</span>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Proximo cobro: 1 de abril, 2025</p>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isActive = plan.id === currentPlan;
          const isSelected = plan.id === selectedPlan;

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className="rounded-xl p-5 cursor-pointer transition relative"
              style={{
                background: "var(--bg-secondary)",
                border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
              }}
            >
              {plan.popular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] px-3 py-0.5 rounded-full font-semibold"
                  style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
                  Popular
                </div>
              )}

              <h4 className="text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>{plan.name}</h4>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>{plan.price}</span>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-5">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
                    <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {isActive ? (
                <div className="w-full py-2 rounded-lg text-sm font-medium text-center"
                  style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                  Plan actual
                </div>
              ) : (
                <button className="w-full py-2 rounded-lg text-sm font-semibold transition"
                  style={{ background: "var(--accent)", color: "var(--accent-text)" }}>
                  Cambiar plan
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment method */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text)" }}>
          <svg className="w-4 h-4" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Metodo de pago
        </h3>

        <div className="flex items-center gap-4 px-4 py-3 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <div className="w-10 h-7 rounded flex items-center justify-center" style={{ background: "var(--accent-subtle)" }}>
            <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>VISA</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>•••• •••• •••• 4242</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Expira 12/2027</p>
          </div>
          <button className="text-[12px] px-3 py-1.5 rounded-lg transition"
            style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            Cambiar
          </button>
        </div>
      </div>

      {/* Invoice history */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text)" }}>
          <svg className="w-4 h-4" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
          Historial de facturas
        </h3>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-left" style={{ color: "var(--text-muted)" }}>
              <th className="pb-2 font-medium">Fecha</th>
              <th className="pb-2 font-medium">Concepto</th>
              <th className="pb-2 font-medium">Monto</th>
              <th className="pb-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {[
              { date: "Mar 1, 2025", concept: "Plan Personal", amount: "$9.00", status: "Pagado" },
              { date: "Feb 1, 2025", concept: "Plan Personal", amount: "$9.00", status: "Pagado" },
              { date: "Ene 1, 2025", concept: "Plan Personal", amount: "$9.00", status: "Pagado" },
            ].map((inv, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                <td className="py-2.5" style={{ color: "var(--text)" }}>{inv.date}</td>
                <td className="py-2.5" style={{ color: "var(--text-secondary)" }}>{inv.concept}</td>
                <td className="py-2.5 font-medium" style={{ color: "var(--text)" }}>{inv.amount}</td>
                <td className="py-2.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>{inv.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
