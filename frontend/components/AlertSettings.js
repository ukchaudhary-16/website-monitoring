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

  if (!s) return <div className="skeleton" style={{ height: 120 }} />;

  const Channel = ({ on, onToggle, label, children }) => (
    <div className="card" style={{ background: "var(--surface)", padding: 16 }}>
      <label className="inline" style={{ margin: 0, fontWeight: 600 }}>
        <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} />
        {label}
      </label>
      <div style={{ marginTop: on ? 10 : 0, maxHeight: on ? 80 : 0, overflow: "hidden", transition: ".2s" }}>
        {children}
      </div>
    </div>
  );

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="grid cols-3">
        <Channel on={s.email.enabled} label="Email"
          onToggle={(v) => setS({ ...s, email: { ...s.email, enabled: v } })}>
          <input placeholder={s.fallbackEmail || "alert address"} value={s.email.address}
            onChange={(e) => setS({ ...s, email: { ...s.email, address: e.target.value } })} />
        </Channel>
        <Channel on={s.slack.enabled} label="Slack"
          onToggle={(v) => setS({ ...s, slack: { ...s.slack, enabled: v } })}>
          <input className="mono" placeholder="hooks.slack.com/services/…" value={s.slack.webhookUrl}
            onChange={(e) => setS({ ...s, slack: { ...s.slack, webhookUrl: e.target.value } })} />
        </Channel>
        <Channel on={s.webhook.enabled} label="Webhook"
          onToggle={(v) => setS({ ...s, webhook: { ...s.webhook, enabled: v } })}>
          <input className="mono" placeholder="https://your-endpoint/hook" value={s.webhook.url}
            onChange={(e) => setS({ ...s, webhook: { ...s.webhook, url: e.target.value } })} />
        </Channel>
      </div>
      <div className="row">
        <button className="sm" onClick={save}>Save alert settings</button>
        {msg && <span className="tiny muted">{msg}</span>}
      </div>
    </div>
  );
}
