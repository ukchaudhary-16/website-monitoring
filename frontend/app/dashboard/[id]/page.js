"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
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

  if (loading || (!data && !err))
    return <div className="container"><div className="skeleton" style={{ height: 260 }} /></div>;
  if (err) return <div className="container"><p className="error">{err}</p></div>;

  const { website, uptimePct, totalChecks, series, byRegion, incidents } = data;
  const chart = series.map((p) => ({
    t: new Date(p.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    ms: p.avgResponseMs ? Math.round(p.avgResponseMs) : null,
  }));

  return (
    <div className="container stack fade-in">
      <div>
        <Link href="/dashboard" className="tiny faint">← Dashboard</Link>
        <div className="between" style={{ marginTop: 8 }}>
          <div>
            <h1 style={{ marginBottom: 6 }}>{website.name}</h1>
            <a href={website.url} target="_blank" rel="noreferrer" className="muted tiny mono">{website.url} ↗</a>
          </div>
          <span className={`badge ${website.currentStatus}`} style={{ fontSize: 13, padding: "6px 14px" }}>
            {website.currentStatus}
          </span>
        </div>
      </div>

      <div className="grid cols-3">
        <Stat k="Uptime" v={uptimePct == null ? "—" : `${uptimePct.toFixed(2)}%`} sub="across settled checks" />
        <Stat k="Checks settled" v={totalChecks} sub="consensus rounds" />
        <Stat k="Incidents" v={incidents.length} sub="down periods recorded" />
      </div>

      <div className="card">
        <div className="card-title">
          <h2>Response time</h2>
          <span className="tiny faint">avg across reporting nodes</span>
        </div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={chart} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c8cff" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7c8cff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1c2340" vertical={false} />
              <XAxis dataKey="t" stroke="#6a7498" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#6a7498" fontSize={11} unit="ms" tickLine={false} axisLine={false} width={54} />
              <Tooltip
                contentStyle={{ background: "#161d34", border: "1px solid #242c48", borderRadius: 10, fontSize: 13 }}
                labelStyle={{ color: "#9aa4c6" }}
              />
              <Area type="monotone" dataKey="ms" stroke="#7c8cff" strokeWidth={2}
                fill="url(#g)" connectNulls dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <h2>Alerting</h2>
          <label className="inline" style={{ margin: 0 }}>
            <input type="checkbox" checked={website.alertsEnabled ?? true}
              onChange={(e) => toggleAlerts(e.target.checked)} />
            <span className="tiny">enabled for this site</span>
          </label>
        </div>
        <div className="row">
          <button className="secondary sm" onClick={testAlert}>Send test alert</button>
          {note && <span className="tiny muted">{note}</span>}
        </div>
        {alerts.length > 0 && (
          <div className="scroll-x" style={{ marginTop: 14 }}>
            <table>
              <thead><tr><th>Time</th><th>Transition</th><th>Channels</th></tr></thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a._id}>
                    <td className="tiny muted">{new Date(a.createdAt).toLocaleString()}</td>
                    <td className="tiny mono">{a.transition}{a.region ? ` · ${a.region}` : ""}</td>
                    <td className="tiny muted">
                      {a.channels.map((c) => `${c.channel} ${c.ok ? "✓" : "✗"}`).join("   ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h2>Per-region</h2>
          <table>
            <thead><tr><th>Region</th><th>Up</th><th>Down</th></tr></thead>
            <tbody>
              {Object.entries(byRegion).map(([r, v]) => (
                <tr key={r}>
                  <td className="mono tiny">{r}</td>
                  <td style={{ color: "var(--up)" }}>{v.up}</td>
                  <td style={{ color: "var(--down)" }}>{v.down}</td>
                </tr>
              ))}
              {Object.keys(byRegion).length === 0 && (
                <tr><td colSpan={3} className="muted tiny">No settled checks yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Incident timeline</h2>
          {incidents.length === 0 ? (
            <p className="muted tiny">No incidents recorded. 🎉</p>
          ) : (
            <table>
              <tbody>
                {incidents.map((i, k) => (
                  <tr key={k}>
                    <td><span className="badge down">down</span></td>
                    <td className="mono tiny">{i.region}</td>
                    <td className="tiny muted">
                      {new Date(i.start).toLocaleString()} →{" "}
                      {i.end ? new Date(i.end).toLocaleString() : "ongoing"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ k, v, sub }) {
  return (
    <div className="card stat">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
