const express = require("express");
const Website = require("../models/Website");
const Job = require("../models/Job");
const Result = require("../models/Result");
const Alert = require("../models/Alert");
const { requireAuth } = require("../middleware/auth");
const { PLANS } = require("../config/plans");
const { sendStatusAlert } = require("../services/alerts");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const sites = await Website.find({ owner: req.user._id }).sort("-createdAt");
  res.json({ websites: sites });
});

router.post("/", async (req, res) => {
  try {
    const plan = PLANS[req.user.plan];
    const count = await Website.countDocuments({ owner: req.user._id });
    if (count >= plan.maxSites)
      return res.status(403).json({ error: `plan '${plan.id}' allows ${plan.maxSites} site(s)` });

    const { name, url, expectedSelector, regions, intervalSeconds } = req.body || {};
    if (!name || !url) return res.status(400).json({ error: "name and url required" });

    const reqRegions = Array.isArray(regions) && regions.length ? regions : ["us-east"];
    if (reqRegions.length > plan.maxRegions)
      return res.status(403).json({ error: `plan allows ${plan.maxRegions} region(s)` });

    const interval = Math.max(Number(intervalSeconds) || plan.minIntervalSeconds, plan.minIntervalSeconds);

    const site = await Website.create({
      owner: req.user._id,
      name,
      url,
      expectedSelector: expectedSelector || null,
      regions: reqRegions,
      intervalSeconds: interval,
    });
    res.status(201).json({ website: site });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id", loadSite, (req, res) => res.json({ website: req.site }));

router.patch("/:id", loadSite, async (req, res) => {
  const allowed = ["name", "url", "expectedSelector", "regions", "intervalSeconds", "active", "alertsEnabled"];
  for (const k of allowed) if (k in (req.body || {})) req.site[k] = req.body[k];
  await req.site.save();
  res.json({ website: req.site });
});

router.delete("/:id", loadSite, async (req, res) => {
  await Job.deleteMany({ website: req.site._id });
  await req.site.deleteOne();
  res.json({ ok: true });
});

// uptime %, response-time series, incident timeline, per-region breakdown
router.get("/:id/stats", loadSite, async (req, res) => {
  const jobs = await Job.find({ website: req.site._id, status: "settled" }).sort("-settledAt").limit(500);
  const jobIds = jobs.map((j) => j._id);
  const results = await Result.find({ job: { $in: jobIds } });

  const total = jobs.length;
  const up = jobs.filter((j) => j.consensusResult === "up").length;
  const uptimePct = total ? (up / total) * 100 : null;

  const series = jobs
    .slice()
    .reverse()
    .map((j) => {
      const rs = results.filter((r) => String(r.job) === String(j._id) && r.responseTimeMs);
      const avg = rs.length ? rs.reduce((a, r) => a + r.responseTimeMs, 0) / rs.length : null;
      return { at: j.settledAt, status: j.consensusResult, avgResponseMs: avg, region: j.region };
    });

  const byRegion = {};
  for (const j of jobs) {
    byRegion[j.region] = byRegion[j.region] || { up: 0, down: 0 };
    byRegion[j.region][j.consensusResult === "up" ? "up" : "down"]++;
  }

  // incidents: consecutive down stretches
  const incidents = [];
  let open = null;
  for (const point of series) {
    if (point.status === "down" && !open) open = { start: point.at, region: point.region };
    else if (point.status === "up" && open) {
      incidents.push({ ...open, end: point.at });
      open = null;
    }
  }
  if (open) incidents.push({ ...open, end: null });

  res.json({
    website: req.site,
    uptimePct,
    totalChecks: total,
    series,
    byRegion,
    incidents: incidents.reverse(),
  });
});

// recent alert history for a site
router.get("/:id/alerts", loadSite, async (req, res) => {
  const alerts = await Alert.find({ website: req.site._id }).sort("-createdAt").limit(50);
  res.json({ alerts });
});

// send a test notification through the owner's configured channels
router.post("/:id/test-alert", loadSite, async (req, res) => {
  try {
    await sendStatusAlert({
      site: req.site,
      from: req.site.currentStatus === "down" ? "down" : "up",
      to: req.site.currentStatus === "down" ? "up" : "down",
      region: "test",
    });
    res.json({ ok: true, note: "test alert dispatched (check channels / server logs)" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function loadSite(req, res, next) {
  const site = await Website.findOne({ _id: req.params.id, owner: req.user._id });
  if (!site) return res.status(404).json({ error: "website not found" });
  req.site = site;
  next();
}

module.exports = router;
