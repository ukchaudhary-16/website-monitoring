const cfg = require("./config");
const api = require("./api");
const { runJob } = require("./checks/runner");
const { signResult } = require("./signer");
const { submitResultOnChain } = require("./chain");
const { closeBrowser } = require("./checks/render");
const { state, pushRecent, pushError } = require("./state");

let running = false;

async function tick(wallet) {
  try {
    await api.heartbeat(wallet.address);
    state.lastHeartbeatAt = new Date().toISOString();
  } catch (e) {
    pushError(`heartbeat: ${e.message}`);
  }

  let jobs = [];
  try {
    ({ jobs } = await api.pollJobs(wallet.address));
  } catch (e) {
    pushError(`pollJobs: ${e.message}`);
    return;
  }

  for (const job of jobs) {
    try {
      const result = await runJob(job);

      // DEMO ONLY: FORCE_STATUS=up|down makes this node lie, so an examiner can
      // watch consensus catch it and settleConsensus slash its stake.
      const forced = (process.env.FORCE_STATUS || "").toLowerCase();
      if (forced === "up" || forced === "down") {
        result.status = forced;
        result.detail = `[FORCED ${forced}] ` + result.detail;
      }

      const { resultHash, signature } = await signResult(wallet, { jobId: job.id, ...result });

      await api.submitResult({
        jobId: job.id,
        walletAddress: wallet.address,
        status: result.status,
        httpStatus: result.httpStatus,
        responseTimeMs: result.responseTimeMs,
        renderOk: result.renderOk,
        detail: result.detail,
        signature,
      });

      let onChain = false;
      if (cfg.submitOnchain && job.onChainJobId != null) {
        try {
          onChain = await submitResultOnChain(
            wallet,
            job.onChainJobId,
            result.status === "up" ? 1 : 0,
            resultHash,
            signature
          );
        } catch (e) {
          pushError(`on-chain submit job ${job.onChainJobId}: ${e.shortMessage || e.message}`);
        }
      }

      state.jobsRun++;
      pushRecent({
        url: job.url,
        region: job.region,
        status: result.status,
        responseTimeMs: result.responseTimeMs,
        renderOk: result.renderOk,
        submitted: true,
        onChain,
      });
      console.log(
        `[job ${String(job.id).slice(-6)}] ${job.url} -> ${result.status.toUpperCase()} ` +
          `(${result.responseTimeMs ?? "?"}ms, render=${result.renderOk})${onChain ? " [on-chain]" : ""}`
      );
    } catch (e) {
      pushError(`job ${job.id}: ${e.message}`);
      console.warn(`[job ${String(job.id).slice(-6)}] failed: ${e.message}`);
    }
  }
}

async function startLoop(wallet) {
  running = true;
  state.wallet = wallet.address;
  state.region = cfg.region;
  state.startedAt = new Date().toISOString();
  console.log(`Node ${wallet.address} polling ${cfg.backendUrl} every ${cfg.pollIntervalMs / 1000}s`);

  const stop = async () => {
    running = false;
    console.log("\nshutting down...");
    await closeBrowser();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  while (running) {
    await tick(wallet);
    await new Promise((r) => setTimeout(r, cfg.pollIntervalMs));
  }
}

module.exports = { startLoop, tick };
