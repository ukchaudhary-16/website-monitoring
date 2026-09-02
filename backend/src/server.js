require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { connectDB } = require("./config/db");
const { startScheduler } = require("./services/scheduler");
const { startSettlementWorker } = require("./services/settlementWorker");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, max: 300 }));

app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/websites", require("./routes/websites"));
app.use("/api/nodes", require("./routes/nodes"));
app.use("/api/results", require("./routes/results"));
app.use("/api/public", require("./routes/public"));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal error" });
});

const PORT = process.env.PORT || 4000;

async function main() {
  await connectDB();
  app.listen(PORT, () => console.log(`[api] listening on :${PORT}`));

  if (process.env.ENABLE_SCHEDULER !== "false") startScheduler();
  if (process.env.ENABLE_SETTLEMENT_WORKER !== "false") startSettlementWorker();
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});

module.exports = app;
