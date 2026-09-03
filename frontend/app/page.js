"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { api } from "@/lib/api";

const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 420, borderRadius: 12 }} />,
});

export default function Home() {
  const [net, setNet] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const load = () =>
      api("/api/public/network", { auth: false }).then((d) => { setNet(d); setErr(null); })
        .catch((e) => setErr(e.message));
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="container stack fade-in">
      <section style={{ textAlign: "center", padding: "16px 0 8px" }}>
        <span className="pill" style={{ margin: "0 auto 18px" }}>
          <span className="dot live" /> {net?.liveNodes ?? "—"} nodes reporting now
        </span>
        <h1>
          Uptime monitoring from a{" "}
          <span className="gradient-text">real, distributed network</span>
        </h1>
        <p className="lead" style={{ maxWidth: 640, margin: "12px auto 0" }}>
          Independent operators on real hardware, in real locations, actually load and
          render your site — then reach on-chain consensus and get paid for honest
          reporting. Catches CDN-edge failures and broken SPA renders that cloud
          pingers miss.
        </p>
        <div className="row" style={{ justifyContent: "center", marginTop: 22 }}>
          <Link href="/register" className="btn">Monitor a site →</Link>
          <Link href="/nodes" className="btn secondary">Run a node</Link>
        </div>
      </section>

      {err && <p className="error" style={{ textAlign: "center" }}>Backend unreachable — {err}</p>}

      <div className="grid cols-3">
        <Stat k="Validator nodes" v={net?.totalNodes ?? "—"} sub="registered on the network" />
        <Stat k="Live right now" v={net?.liveNodes ?? "—"} sub="reported in the last 10 min" />
        <Stat k="Regions covered" v={net?.regionsCovered ?? "—"} sub="independent geographies" />
      </div>

      <div className="card">
        <div className="card-title">
          <h2>Live node network</h2>
          <span className="tiny faint">auto-refreshes every 15s</span>
        </div>
        <WorldMap regions={net?.regions || []} />
      </div>

      {net?.regions?.length > 0 && (
        <div className="card">
          <h2>Coverage by region</h2>
          <div className="scroll-x">
            <table className="table-hover">
              <thead>
                <tr><th>Region</th><th>Nodes</th><th>Live</th><th>On-chain</th><th></th></tr>
              </thead>
              <tbody>
                {net.regions.map((r) => (
                  <tr key={r.region}>
                    <td style={{ fontWeight: 600 }}>{r.label}</td>
                    <td>{r.totalNodes}</td>
                    <td>{r.liveNodes}</td>
                    <td>{r.onChainNodes}</td>
                    <td>
                      {r.liveNodes > 0
                        ? <span className="badge up">healthy</span>
                        : <span className="badge unknown">idle</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid cols-3">
        <How n="1" t="Stake to join" d="Operators lock MonitorToken as skin-in-the-game, then declare their region." />
        <How n="2" t="Check & sign" d="Each node runs an HTTP probe plus a headless-browser render check, and signs the result." />
        <How n="3" t="Consensus settles" d="Nodes that agree with the regional majority earn rewards; outliers are slashed." />
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

function How({ n, t, d }) {
  return (
    <div className="card">
      <div className="pill" style={{ marginBottom: 10 }}>Step {n}</div>
      <h3>{t}</h3>
      <p className="muted tiny" style={{ margin: 0 }}>{d}</p>
    </div>
  );
}
