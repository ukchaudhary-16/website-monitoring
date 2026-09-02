export const metadata = { title: "Run a node — DePIN Monitor" };

export default function Nodes() {
  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <h1>Run a validator node</h1>
      <p className="muted">
        Any machine can run a node. You stake MonitorToken (MON) as skin-in-the-game,
        receive check jobs for your region, run an HTTP + headless-browser render
        check, and earn MON for results that agree with regional consensus. Dishonest
        or broken nodes are slashed.
      </p>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Quick start</h2>
        <pre style={{ overflowX: "auto", background: "#0e1428", padding: 14, borderRadius: 8 }}>{`git clone <repo> && cd node-agent
npm install
cp .env.example .env      # set NODE_REGION, BACKEND_URL, contract addresses
node src/index.js register
node src/index.js start --dashboard   # dashboard: http://localhost:5055`}</pre>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>How rewards work</h2>
        <ol className="muted">
          <li>Stake ≥ minimum MON via <code>MonitorRegistry.registerNode(region)</code>.</li>
          <li>Poll the backend for jobs in your region.</li>
          <li>Run both checks, sign the result with your node key, submit it.</li>
          <li>Once ≥ 3 nodes report, consensus settles: agreeing nodes are minted a
              reward, outliers lose a slice of stake.</li>
        </ol>
      </div>
    </div>
  );
}
