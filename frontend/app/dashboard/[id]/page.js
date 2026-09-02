"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export default function SiteDetail() {
  const { loading } = useAuth();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [err, setErr] = useState(null);
  const [note, setNote] = useState(null);

  const loadAlerts = () =>
    api(`/api/websites/${id}/alerts`).then((d) => setAlerts(d.alerts)).catch(() => {});

  useEffect(() => {
    if (loading) return;
    const load = () =>
      api(`/api/websites/${id}/stats`).then(setData).catch((e) => setErr(e.message));
    load();
    loadAlerts();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [loading, id]);

  async function toggleAlerts(enabled) {
    await api(`/api/websites/${id}`, { method: "PATCH", body: { alertsEnabled: enabled } });
    setData((d) => ({ ...d, website: { ...d.website, alertsEnabled: enabled } }));
  }
  async function testAlert() {
    setNote("sending…");
    try {
      const r = await api(`/api/websites/${id}/test-alert`, { method: "POST" });
      setNote(r.note || "sent");
      setTimeout(loadAlerts, 1000);
    } catch (e) {
      setNote(e.message);
    }
  }

  if (loading || (!data && !err)) return <div className="container">Loading…</div>;
  if (err) return <div className="container"><p className="error">{err}</p></div>;

  const { website, uptimePct, totalChecks, series, byRegion, incidents } = data;
  const chart = series.map((p) => ({
    t: new Date(p.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    ms: p.avgResponseMs ? Math.round(p.avgResponseMs) : null,
    up: p.status === "up" ? 1 : 0,
  }));

  return (
    <div className="container">
      <h1>{website.name}</h1>
      <p className="muted">{website.url} · <span className={`badge ${website.currentStatus}`}>{website.currentStatus}</span></p>

      <div className="grid cols-3" style={{ margin: "16px 0" }}>
        <Stat k="Uptime" v={uptimePct == null ? "—" : `${uptimePct.toFixed(2)}%`} />
        <Stat k="Checks settled" v={totalChecks} />
        <Stat k="Incidents" v={incidents.length} />
      </div>

      <div className="card">
        <h2>Response time (avg across nodes)</h2>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={chart}>
              <CartesianGrid stroke="#263050" />
              <XAxis dataKey="t" stroke="#8892b0" fontSize={12} />
              <YAxis stroke="#8892b0" fontSize={12} unit="ms" />
              <Tooltip contentStyle={{ background: "#151b30", border: "1px solid #263050" }} />
              <Line type="monotone" dataKey="ms" stroke="#6366f1" dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Alerting</h2>
        <label>
          <input type="checkbox" checked={website.alertsEnabled ?? true}
            onChange={(e) => toggleAlerts(e.target.checked)} /> Alert on confirmed status changes for this site
        </label>
        <div style={{ marginTop: 10 }}>
          <button className="secondary" onClick={testAlert}>Send test alert</button>
          {note && <span className="muted" style={{ marginLeft: 10 }}>{note}</span>}
        </div>
        <table style={{ marginTop: 12 }}>
          <tbody>
            {alerts.map((a) => (
              <tr key={a._id}>
                <td className="muted">{new Date(a.createdAt).toLocaleString()}</td>
                <td>{a.transition}{a.region ? ` · ${a.region}` : ""}</td>
                <td className="muted">{a.channels.map((c) => `${c.channel}:${c.ok ? "✓" : "✗"}`).join("  ")}</td>
              </tr>
            ))}
            {alerts.length === 0 && <tr><td className="muted">No alerts sent yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="grid cols-2" style={{ marginTop: 20 }}>
        <div className="card">
          <h2>Per-region</h2>
          <table>
            <thead><tr><th>Region</th><th>Up</th><th>Down</th></tr></thead>
            <tbody>
              {Object.entries(byRegion).map(([r, v]) => (
                <tr key={r}><td>{r}</td><td>{v.up}</td><td>{v.down}</td></tr>
              ))}
              {Object.keys(byRegion).length === 0 && <tr><td colSpan={3} className="muted">no settled checks yet</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Incident timeline</h2>
          <table>
            <tbody>
              {incidents.map((i, k) => (
                <tr key={k}>
                  <td><span className="badge down">down</span></td>
                  <td>{i.region}</td>
                  <td className="muted">
                    {new Date(i.start).toLocaleString()} → {i.end ? new Date(i.end).toLocaleString() : "ongoing"}
                  </td>
                </tr>
              ))}
              {incidents.length === 0 && <tr><td className="muted">No incidents 🎉</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ k, v }) {
  return <div className="card stat"><div className="k">{k}</div><div className="v">{v}</div></div>;
}
