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
    <div className="grid cols-3" style={{ marginTop: 12 }}>
      {plans.map((p) => (
        <div key={p.id} className={`card plan ${current === p.id ? "active" : ""}`}>
          <h3>{p.name}</h3>
          <div className="price">${p.priceUsd}<span className="muted" style={{ fontSize: 13 }}>/mo</span></div>
          <p className="muted" style={{ fontSize: 13 }}>
            {p.maxSites} sites · {p.minIntervalSeconds}s min · {p.maxRegions} regions<br />
            {p.alertChannels.join(", ")}
          </p>
          <button
            disabled={current === p.id || busy === p.id}
            onClick={() => select(p.id)}
          >
            {current === p.id ? "Current plan" : busy === p.id ? "…" : "Select"}
          </button>
        </div>
      ))}
    </div>
  );
}
