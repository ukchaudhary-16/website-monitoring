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

  useEffect(() => {
    if (plan) setForm((f) => ({ ...f, intervalSeconds: plan.minIntervalSeconds }));
  }, [plan]);

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
    if (!confirm("Delete this site and its check history?")) return;
    await api(`/api/websites/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <div className="container"><div className="skeleton" style={{ height: 200 }} /></div>;

  const atLimit = sites.length >= plan.maxSites;

  return (
    <div className="container stack fade-in">
      <div className="between">
        <div>
          <h1 style={{ marginBottom: 6 }}>Dashboard</h1>
          <p className="muted tiny" style={{ margin: 0 }}>{user.email}</p>
        </div>
        <div className="row">
          <span className="pill">Plan · <b style={{ color: "var(--text)" }}>{plan.name}</b></span>
          <span className="pill">{sites.length}/{plan.maxSites} sites</span>
          <span className="pill">min {plan.minIntervalSeconds}s</span>
          <span className="pill">{plan.maxRegions} region{plan.maxRegions > 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="grid side">
        <div className="card">
          <div className="card-title">
            <h2>Monitored sites</h2>
            <span className="tiny faint">{sites.length} total</span>
          </div>
          {sites.length === 0 ? (
            <p className="muted tiny">No sites yet — add one on the right to start monitoring.</p>
          ) : (
            <div className="scroll-x">
              <table className="table-hover">
                <thead>
                  <tr><th>Site</th><th>Status</th><th>Regions</th><th>Interval</th><th></th></tr>
                </thead>
                <tbody>
                  {sites.map((s) => (
                    <tr key={s._id}>
                      <td>
                        <Link href={`/dashboard/${s._id}`} style={{ fontWeight: 600 }}>{s.name}</Link>
                        <div className="faint tiny mono">{s.url}</div>
                      </td>
                      <td><span className={`badge ${s.currentStatus}`}>{s.currentStatus}</span></td>
                      <td className="tiny muted">{s.regions.join(", ")}</td>
                      <td className="tiny muted">{s.intervalSeconds}s</td>
                      <td><button className="ghost sm" onClick={() => del(s._id)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Add a site</h2>
          <form onSubmit={addSite}>
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="My app" />
            <label>URL</label>
            <input type="url" className="mono" value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" required />
            <label>Expected DOM selector <span className="faint">(optional)</span></label>
            <input className="mono" value={form.expectedSelector}
              onChange={(e) => setForm({ ...form, expectedSelector: e.target.value })} placeholder="#app, main h1 …" />
            <label>Regions <span className="faint">({form.regions.length}/{plan.maxRegions})</span></label>
            <select multiple value={form.regions} style={{ height: 132 }}
              onChange={(e) => setForm({ ...form, regions: [...e.target.selectedOptions].map((o) => o.value) })}>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <label>Interval — seconds <span className="faint">(min {plan.minIntervalSeconds})</span></label>
            <input type="number" min={plan.minIntervalSeconds} value={form.intervalSeconds}
              onChange={(e) => setForm({ ...form, intervalSeconds: e.target.value })} />
            {err && <p className="error">{err}</p>}
            <button style={{ marginTop: 16, width: "100%" }} disabled={atLimit}>
              {atLimit ? "Plan limit reached" : "Add site"}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <h2>Alert channels</h2>
          <span className="tiny faint">consensus-confirmed status changes only</span>
        </div>
        <p className="muted tiny">
          Fires when node consensus confirms a site changed state (up ↔ down). The
          per-site on/off toggle lives on each site&apos;s page.
        </p>
        <div className="divider" />
        <AlertSettings />
      </div>

      <div className="card">
        <div className="card-title">
          <h2>Plan</h2>
          <span className="pill">mocked — no real payment</span>
        </div>
        <PlanCards current={user.plan} onChange={() => window.location.reload()} />
      </div>
    </div>
  );
}
