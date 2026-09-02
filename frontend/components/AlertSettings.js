"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AlertSettings() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api("/api/auth/alert-settings").then((d) => setS(normalize(d))).catch(() => {});
  }, []);

  function normalize(d) {
    const a = d.alerts || {};
    return {
      fallbackEmail: d.alertEmail,
      email: { enabled: a.email?.enabled ?? true, address: a.email?.address || "" },
      slack: { enabled: a.slack?.enabled ?? false, webhookUrl: a.slack?.webhookUrl || "" },
      webhook: { enabled: a.webhook?.enabled ?? false, url: a.webhook?.url || "" },
    };
  }

  async function save() {
    setMsg(null);
    try {
      const d = await api("/api/auth/alert-settings", {
        method: "PUT",
        body: { email: s.email, slack: s.slack, webhook: s.webhook },
      });
      setS((p) => ({ ...p, ...normalize({ alerts: d.alerts, alertEmail: p.fallbackEmail }) }));
      setMsg("Saved.");
    } catch (e) {
      setMsg(e.message);
    }
  }

  if (!s) return <p className="muted">Loading alert settings…</p>;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label>
          <input type="checkbox" checked={s.email.enabled}
            onChange={(e) => setS({ ...s, email: { ...s.email, enabled: e.target.checked } })} /> Email
        </label>
        <input placeholder={s.fallbackEmail || "alert address"} value={s.email.address}
          onChange={(e) => setS({ ...s, email: { ...s.email, address: e.target.value } })} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>
          <input type="checkbox" checked={s.slack.enabled}
            onChange={(e) => setS({ ...s, slack: { ...s.slack, enabled: e.target.checked } })} /> Slack webhook
        </label>
        <input placeholder="https://hooks.slack.com/services/…" value={s.slack.webhookUrl}
          onChange={(e) => setS({ ...s, slack: { ...s.slack, webhookUrl: e.target.value } })} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>
          <input type="checkbox" checked={s.webhook.enabled}
            onChange={(e) => setS({ ...s, webhook: { ...s.webhook, enabled: e.target.checked } })} /> Generic webhook (JSON POST)
        </label>
        <input placeholder="https://your-endpoint.example/hook" value={s.webhook.url}
          onChange={(e) => setS({ ...s, webhook: { ...s.webhook, url: e.target.value } })} />
      </div>
      <button onClick={save}>Save alert settings</button>
      {msg && <span className="muted" style={{ marginLeft: 10 }}>{msg}</span>}
    </div>
  );
}
