const cfg = require("./config");

async function req(method, path, body) {
  const res = await fetch(cfg.backendUrl + path, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data.error || `${method} ${path} -> ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

module.exports = {
  registerNode: (walletAddress, region) =>
    req("POST", "/api/nodes/register", { walletAddress, region }),
  heartbeat: (walletAddress) => req("POST", "/api/nodes/heartbeat", { walletAddress }),
  pollJobs: (walletAddress) =>
    req("GET", `/api/nodes/jobs?walletAddress=${encodeURIComponent(walletAddress)}`),
  submitResult: (payload) => req("POST", "/api/results", payload),
  nodeInfo: (walletAddress) => req("GET", `/api/nodes/${walletAddress}`),
};
