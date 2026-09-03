export const metadata = { title: "Run a node — DePIN Monitor" };

export default function Nodes() {
  return (
    <div className="container stack fade-in" style={{ maxWidth: 820 }}>
      <div>
        <span className="pill" style={{ marginBottom: 14 }}>For operators</span>
        <h1>Run a validator node</h1>
        <p className="lead">
          Any machine can run a node. Stake MonitorToken (MON) as skin-in-the-game,
          receive check jobs for your region, run an HTTP + headless-browser render
          check, and earn MON for results that agree with regional consensus.
          Dishonest or broken nodes are slashed.
        </p>
      </div>

      <div className="grid cols-3">
        <div className="card"><h3>No special hardware</h3><p className="muted tiny" style={{ margin: 0 }}>A laptop or a cheap VM is enough. Node.js + a headless Chrome.</p></div>
        <div className="card"><h3>Geographic bonus</h3><p className="muted tiny" style={{ margin: 0 }}>Under-represented regions earn a reward multiplier.</p></div>
        <div className="card"><h3>Transparent payout</h3><p className="muted tiny" style={{ margin: 0 }}>Rewards and slashing settle on-chain, verifiable on PolygonScan.</p></div>
      </div>

      <div className="card">
        <h2>Quick start</h2>
        <pre>{`git clone <repo> && cd node-agent
npm install
cp .env.example .env      # set NODE_REGION, BACKEND_URL, contract addresses
node src/index.js register
node src/index.js start --dashboard   # local dashboard on :5055`}</pre>
      </div>

      <div className="card">
        <h2>How rewards work</h2>
        <ol className="muted" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, fontSize: 14 }}>
          <li>Stake ≥ the minimum MON via <code>MonitorRegistry.registerNode(region)</code>.</li>
          <li>Poll the backend for jobs in your declared region.</li>
          <li>Run both checks, sign the result with your node key, submit it.</li>
          <li>Once enough nodes report, consensus settles: agreeing nodes are minted a
            reward, outliers lose a slice of stake.</li>
        </ol>
      </div>
    </div>
  );
}
