"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { api } from "@/lib/api";

const WorldMap = dynamic(() => import("@/components/WorldMap"), { ssr: false });

export default function Home() {
  const [net, setNet] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const load = () =>
      api("/api/public/network", { auth: false }).then(setNet).catch((e) => setErr(e.message));
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="container">
      <section style={{ textAlign: "center", margin: "20px 0 32px" }}>
        <h1>Uptime monitoring from a real, distributed network</h1>
        <p className="muted" style={{ maxWidth: 620, margin: "10px auto" }}>
          Independent operators on real hardware, in real locations, actually load and
          render your site — and are rewarded on-chain for honest reporting. Consensus
          across nodes catches CDN edge failures and broken SPA renders that cloud
          pingers miss.
        </p>
        <div style={{ marginTop: 16 }}>
          <Link href="/register" className="btn">Monitor a site</Link>{" "}
          <Link href="/nodes" className="btn" style={{ background: "transparent", border: "1px solid var(--border)" }}>
            Run a node
          </Link>
        </div>
      </section>

      {err && <p className="error">Backend unreachable: {err}</p>}

      <div className="grid cols-3" style={{ marginBottom: 20 }}>
        <Stat k="Total nodes" v={net?.totalNodes ?? "—"} />
        <Stat k="Live now" v={net?.liveNodes ?? "—"} />
        <Stat k="Regions covered" v={net?.regionsCovered ?? "—"} />
      </div>

      <div className="card">
        <h2>Live node network</h2>
        <WorldMap regions={net?.regions || []} />
      </div>

      {net?.regions?.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <table>
            <thead>
              <tr><th>Region</th><th>Nodes</th><th>Live</th><th>On-chain</th></tr>
            </thead>
            <tbody>
              {net.regions.map((r) => (
                <tr key={r.region}>
                  <td>{r.label}</td><td>{r.totalNodes}</td><td>{r.liveNodes}</td><td>{r.onChainNodes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ k, v }) {
  return (
    <div className="card stat">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}
