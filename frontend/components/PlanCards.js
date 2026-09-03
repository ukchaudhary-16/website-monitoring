"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function PlanCards({ current, onChange }) {
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    api("/api/auth/plans", { auth: false }).then((d) => setPlans(d.plans)).catch(() => {});
  }, []);

  async function select(id) {
    setBusy(id);
    try {
      await api("/api/auth/subscribe", { method: "POST", body: { plan: id } });
      onChange?.(id);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid cols-3" style={{ marginTop: 4 }}>
      {plans.map((p) => {
        const active = current === p.id;
        return (
          <div
            key={p.id}
            className="card"
            style={{
              textAlign: "center",
              borderColor: active ? "var(--accent)" : undefined,
              boxShadow: active ? "0 0 0 1px var(--accent), var(--shadow)" : undefined,
            }}
          >
            {active && <div className="pill" style={{ marginBottom: 10 }}>Current plan</div>}
            <h3 style={{ marginBottom: 2 }}>{p.name}</h3>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-.02em" }}>
              ${p.priceUsd}
              <span className="faint" style={{ fontSize: 13, fontWeight: 500 }}> /mo</span>
            </div>
            <ul style={{
              listStyle: "none", padding: 0, margin: "12px 0 16px",
              fontSize: 13, color: "var(--muted)", textAlign: "left", display: "grid", gap: 6,
            }}>
              <li>✓ {p.maxSites} monitored site{p.maxSites > 1 ? "s" : ""}</li>
              <li>✓ {p.minIntervalSeconds}s minimum interval</li>
              <li>✓ up to {p.maxRegions} region{p.maxRegions > 1 ? "s" : ""}</li>
              <li>✓ {p.alertChannels.join(", ")}</li>
            </ul>
            <button
              className={active ? "secondary" : ""}
              style={{ width: "100%" }}
              disabled={active || busy === p.id}
              onClick={() => select(p.id)}
            >
              {active ? "Selected" : busy === p.id ? "…" : "Choose " + p.name}
            </button>
          </div>
        );
      })}
    </div>
  );
}
