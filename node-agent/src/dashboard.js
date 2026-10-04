const http = require("http");
const cfg = require("./config");
const api = require("./api");
const { state } = require("./state");

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>DePIN Node</title>
<meta http-equiv="refresh" content="5">
<style>
body{font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;margin:24px;background:#0b1020;color:#e6e9f0}
h1{font-size:18px} .grid{display:flex;gap:16px;flex-wrap:wrap;margin:16px 0}
.card{background:#151b30;border:1px solid #263050;border-radius:10px;padding:14px 16px;min-width:150px}
.k{color:#8892b0;font-size:12px} .v{font-size:20px;font-weight:600}
table{width:100%;border-collapse:collapse;margin-top:8px} td,th{padding:6px 8px;border-bottom:1px solid #263050;text-align:left}
.up{color:#4ade80} .down{color:#f87171} .muted{color:#8892b0}
</style></head><body>
<h1>DePIN Validator Node <span class="muted">__WALLET__</span></h1>
<div class="grid">
<div class="card"><div class="k">Region</div><div class="v">__REGION__</div></div>
<div class="card"><div class="k">On-chain stake (MON)</div><div class="v">__STAKE__</div></div>
<div class="card"><div class="k">Jobs completed (backend)</div><div class="v">__JOBS_BACKEND__</div></div>
<div class="card"><div class="k">Jobs this session</div><div class="v">__JOBS_SESSION__</div></div>
<div class="card"><div class="k">Earnings (MON)</div><div class="v">__EARNINGS__</div></div>
<div class="card"><div class="k">Last heartbeat</div><div class="v" style="font-size:13px">__HEARTBEAT__</div></div>
</div>
<h3>Recent checks</h3>
<table><tr><th>Time</th><th>URL</th><th>Region</th><th>Status</th><th>ms</th><th>render</th><th>on-chain</th><th>detail</th></tr>__ROWS__</table>
<h3>Errors</h3><div class="muted">__ERRORS__</div>
</body></html>`;

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function render(nodeInfo) {
  const rows = state.recent
    .map(
      (r) =>
        `<tr><td class=muted>${r.at.slice(11, 19)}</td><td>${r.url}</td><td>${r.region}</td>` +
        `<td class="${r.status}">${r.status.toUpperCase()}</td><td>${r.responseTimeMs ?? "-"}</td>` +
        `<td>${r.renderOk}</td><td>${r.onChain ? "✓" : ""}</td>` +
        `<td class=muted style="font-size:12px">${esc(r.detail)}</td></tr>`
    )
    .join("");
  const errs = state.errors.map((e) => `${e.at.slice(11, 19)} — ${e.msg}`).join("<br>") || "none";

  return PAGE.replace("__WALLET__", state.wallet || "(not started)")
    .replace("__REGION__", state.region || cfg.region)
    .replace("__STAKE__", fmt(nodeInfo?.node?.stakedAmount))
    .replace("__JOBS_BACKEND__", nodeInfo?.jobsCompleted ?? "-")
    .replace("__JOBS_SESSION__", state.jobsRun)
    .replace("__EARNINGS__", fmt(nodeInfo?.node?.totalEarnings))
    .replace("__HEARTBEAT__", state.lastHeartbeatAt ? state.lastHeartbeatAt.slice(11, 19) : "-")
    .replace("__ROWS__", rows || `<tr><td colspan=7 class=muted>no checks yet</td></tr>`)
    .replace("__ERRORS__", errs);
}

function fmt(weiStr) {
  if (!weiStr) return "0";
  try {
    return (Number(BigInt(weiStr) / 10n ** 14n) / 10000).toFixed(2);
  } catch {
    return String(weiStr);
  }
}

function startDashboard() {
  const server = http.createServer(async (req, res) => {
    if (req.url === "/api/state") {
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify(state));
    }
    let nodeInfo = null;
    if (state.wallet) nodeInfo = await api.nodeInfo(state.wallet).catch(() => null);
    res.setHeader("content-type", "text/html");
    res.end(render(nodeInfo));
  });
  server.listen(cfg.dashboardPort, () =>
    console.log(`[dashboard] http://localhost:${cfg.dashboardPort}`)
  );
  return server;
}

module.exports = { startDashboard };
