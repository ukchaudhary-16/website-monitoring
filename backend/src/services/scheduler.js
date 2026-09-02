const cron = require("node-cron");
const Website = require("../models/Website");
const Job = require("../models/Job");
const { getRegistry } = require("../config/chain");

// Collection window: how long a job stays open for nodes to answer.
const COLLECTION_WINDOW_MS = 120 * 1000;

async function generateJobs() {
  const sites = await Website.find({ active: true });
  let created = 0;

  for (const site of sites) {
    for (const region of site.regions) {
      const since = new Date(Date.now() - site.intervalSeconds * 1000);
      const recent = await Job.findOne({
        website: site._id,
        region,
        createdAt: { $gt: since },
      });
      if (recent) continue;

      const job = await Job.create({
        website: site._id,
        url: site.url,
        expectedSelector: site.expectedSelector,
        region,
        status: "open",
        expiresAt: new Date(Date.now() + COLLECTION_WINDOW_MS),
      });
      created++;

      // Best-effort on-chain mirror (optional; needs owner signer configured).
      const registry = getRegistry({ withSigner: true });
      if (registry) {
        try {
          const tx = await registry.createJob(site.url, region);
          const rc = await tx.wait();
          const ev = rc.logs
            .map((l) => {
              try { return registry.interface.parseLog(l); } catch { return null; }
            })
            .find((p) => p && p.name === "JobCreated");
          if (ev) {
            job.onChainJobId = Number(ev.args.jobId);
            await job.save();
          }
        } catch (e) {
          console.warn("[scheduler] on-chain createJob failed:", e.shortMessage || e.message);
        }
      }
    }
  }
  if (created) console.log(`[scheduler] created ${created} job(s)`);
}

function startScheduler() {
  const expr = process.env.JOB_SCHEDULER_CRON || "*/1 * * * *";
  cron.schedule(expr, () => generateJobs().catch((e) => console.error("[scheduler]", e)));
  console.log("[scheduler] started:", expr);
}

module.exports = { startScheduler, generateJobs };
