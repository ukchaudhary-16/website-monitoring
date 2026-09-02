require("dotenv").config();
const path = require("path");

module.exports = {
  privateKey: process.env.PRIVATE_KEY || "",
  walletFile: path.resolve(process.env.WALLET_FILE || "./node-wallet.json"),
  region: process.env.NODE_REGION || "us-east",
  backendUrl: (process.env.BACKEND_URL || "http://localhost:4000").replace(/\/$/, ""),
  rpcUrl: process.env.CHAIN_RPC_URL || "http://127.0.0.1:8545",
  registryAddress: process.env.MONITOR_REGISTRY_ADDRESS || "",
  tokenAddress: process.env.MONITOR_TOKEN_ADDRESS || "",
  submitOnchain: String(process.env.SUBMIT_ONCHAIN || "false") === "true",
  pollIntervalMs: Number(process.env.POLL_INTERVAL_SECONDS || 15) * 1000,
  headless: String(process.env.HEADLESS || "true") === "true",
  puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "",
  renderTimeoutMs: Number(process.env.RENDER_TIMEOUT_MS || 20000),
  dashboardPort: Number(process.env.DASHBOARD_PORT || 5055),
};
