const cron = require("node-cron");
const Job = require("../models/Job");
const Result = require("../models/Result");
const Website = require("../models/Website");
const NodeModel = require("../models/Node");
const { getRegistry } = require("../config/chain");
const { sendStatusAlert } = require("./alerts");

const MIN_SUBMISSIONS = Number(process.env.CONSENSUS_MIN_SUBMISSIONS || 3);
// A new consensus status must repeat this many times before we flip + alert.
const CONFIRM_THRESHOLD = Math.max(1, Number(process.env.ALERT_CONFIRM_THRESHOLD || 2));

async function settleReadyJobs() {
  const now = new Date();
  const jobs = await Job.find({
    status: { $in: ["open", "collecting"] },
  });

  for (const job of jobs) {
    const results = await Result.find({ job: job._id });
    const expired = job.expiresAt <= now;

    // Settle when we have quorum, or the window closed with >= 3 answers.
    if (results.length < MIN_SUBMISSIONS) {
      if (expired && results.length === 0) {
        job.status = "expired";
        await job.save();
      }
      continue;
    }
    if (!expired && results.length < MIN_SUBMISSIONS) continue;

    job.status = "settling";
    await job.save();

    const up = results.filter((r) => r.status === "up").length;
    const down = results.length - up;
    const majority = up >= down ? "up" : "down"; // ties -> up

    await Promise.all(
      results.map((r) => {
        r.agreedWithConsensus = r.status === majority;
        return r.save();
      })
    );

    // Node bookkeeping (rewards/slashing happen on-chain; this mirrors counts).
    for (const r of results) {
      await NodeModel.updateOne(
        { _id: r.node },
        { $inc: { jobsCompleted: 1 } }
      );
    }

    job.status = "settled";
    job.consensusResult = majority;
    job.settledAt = new Date();
    await job.save();

    const site = await Website.findById(job.website);
    if (site) {
      site.lastCheckedAt = job.settledAt;
      const confirmed = site.currentStatus;

      if (majority === confirmed) {
        // status held — clear any pending flip
        site.pendingStatus = null;
        site.pendingCount = 0;
      } else if (site.pendingStatus === majority) {
        site.pendingCount += 1;
      } else {
        site.pendingStatus = majority;
        site.pendingCount = 1;
      }

      const firstReading = confirmed === "unknown";
      if (
        majority !== confirmed &&
        (firstReading || site.pendingCount >= CONFIRM_THRESHOLD)
      ) {
        site.currentStatus = majority;
        site.pendingStatus = null;
        site.pendingCount = 0;
        site.lastAlertAt = new Date();
        await site.save();

        // Alert on any confirmed transition, and on a first reading that is DOWN
        // (a site that's broken from the moment you add it is worth knowing about).
        // A first reading that is UP is silent — that's just "monitoring started".
        const shouldAlert = site.alertsEnabled && (!firstReading || majority === "down");
        if (shouldAlert) {
          sendStatusAlert({
            site,
            from: firstReading ? "unknown" : confirmed,
            to: majority,
            region: job.region,
          }).catch((e) => console.error("[alerts]", e.message));
        }
      } else {
        await site.save();
      }
    }

    // Best-effort on-chain settlement (needs nodes to have submitted on-chain too).
    const registry = getRegistry({ withSigner: true });
    if (registry && job.onChainJobId != null) {
      try {
        const count = await registry.getSubmissionCount(job.onChainJobId);
        if (Number(count) >= MIN_SUBMISSIONS) {
          const tx = await registry.settleConsensus(job.onChainJobId);
          await tx.wait();
          console.log(`[settlement] on-chain settled job ${job.onChainJobId}`);
        }
      } catch (e) {
        console.warn("[settlement] on-chain settle failed:", e.shortMessage || e.message);
      }
    }

    console.log(`[settlement] job ${job._id} -> ${majority} (${up}up/${down}down)`);
  }
}

function startSettlementWorker() {
  const expr = process.env.SETTLEMENT_CRON || "*/2 * * * *";
  cron.schedule(expr, () => settleReadyJobs().catch((e) => console.error("[settlement]", e)));
  console.log("[settlement] worker started:", expr);
}

module.exports = { startSettlementWorker, settleReadyJobs };
