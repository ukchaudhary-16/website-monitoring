"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import PlanCards from "@/components/PlanCards";
import AlertSettings from "@/components/AlertSettings";

const REGIONS = ["us-east", "us-west", "eu-west", "eu-central", "ap-south", "ap-southeast", "sa-east"];

export default function Dashboard() {
  const { loading, user, plan } = useAuth();
  const [sites, setSites] = useState([]);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({ name: "", url: "", expectedSelector: "", regions: ["us-east"], intervalSeconds: 300 });

  const load = useCallback(() => {
    api("/api/websites").then((d) => setSites(d.websites)).catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    if (!loading && user) load();
  }, [loading, user, load]);

  async function addSite(e) {
    e.preventDefault();
    setErr(null);
    try {
      await api("/api/websites", { method: "POST", body: { ...form, intervalSeconds: Number(form.intervalSeconds) } });
      setForm({ name: "", url: "", expectedSelector: "", regions: ["us-east"], intervalSeconds: plan?.minIntervalSeconds || 300 });
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function del(id) {
    await api(`/api/websites/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <h1>Dashboard</h1>
      <p className="muted">
        {user.email} · plan <b>{plan.name}</b> · {sites.length}/{plan.maxSites} sites ·
        min interval {plan.minIntervalSeconds}s · up to {plan.maxRegions} region(s)
      </p>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Monitored sites</h2>
          {sites.length === 0 && <p className="muted">No sites yet.</p>}
          <table>
            <tbody>
              {sites.map((s) => (
                <tr key={s._id}>
                  <td>
                    <Link href={`/dashboard/${s._id}`}><b>{s.name}</b></Link>
                    <div className="muted" style={{ fontSize: 12 }}>{s.url}</div>
                  </td>
                  <td><span className={`badge ${s.currentStatus}`}>{s.currentStatus}</span></td>
                  <td>{s.regions.join(", ")}</td>
                  <td><button className="secondary" onClick={() => del(s._id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Add a site</h2>
          <form onSubmit={addSite}>
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <label>URL</label>
            <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" required />
            <label>Expected DOM selector (optional — render check)</label>
            <input value={form.expectedSelector} onChange={(e) => setForm({ ...form, expectedSelector: e.target.value })} placeholder="#app, main h1 …" />
            <label>Regions ({form.regions.length}/{plan.maxRegions})</label>
            <select
              multiple
              value={form.regions}
              onChange={(e) => setForm({ ...form, regions: [...e.target.selectedOptions].map((o) => o.value) })}
              style={{ height: 120 }}
            >
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <label>Interval (seconds, min {plan.minIntervalSeconds})</label>
            <input type="number" min={plan.minIntervalSeconds} value={form.intervalSeconds} onChange={(e) => setForm({ ...form, intervalSeconds: e.target.value })} />
            {err && <p className="error">{err}</p>}
            <button style={{ marginTop: 14 }} disabled={sites.length >= plan.maxSites}>
              {sites.length >= plan.maxSites ? "Plan limit reached" : "Add site"}
            </button>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Alert channels</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Fired when node consensus confirms a site changed state (up↔down). Per-site
          toggle is on each site&apos;s page.
        </p>
        <AlertSettings />
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Plan <span className="muted" style={{ fontSize: 13 }}>(mocked — no real payment)</span></h2>
        <PlanCards current={user.plan} onChange={() => window.location.reload()} />
      </div>
    </div>
  );
}
