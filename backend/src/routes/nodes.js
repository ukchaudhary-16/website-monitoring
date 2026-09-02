const express = require("express");
const NodeModel = require("../models/Node");
const Job = require("../models/Job");
const Result = require("../models/Result");
const { getRegistry, ethers } = require("../config/chain");

const router = express.Router();

// Node self-registers with the backend (it stakes on-chain separately via its wallet).
router.post("/register", async (req, res) => {
  try {
    const { walletAddress, region } = req.body || {};
    if (!ethers.isAddress(walletAddress || "")) return res.status(400).json({ error: "valid walletAddress required" });
    if (!region) return res.status(400).json({ error: "region required" });

    const wallet = walletAddress.toLowerCase();
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

    let onChain = false;
    let stakedAmount = "0";
    const registry = getRegistry();
    if (registry) {
      try {
        const n = await registry.getNode(walletAddress);
        onChain = n.owner && n.owner !== ethers.ZeroAddress;
        stakedAmount = n.stakedAmount.toString();
      } catch (_) {}
    }

    const node = await NodeModel.findOneAndUpdate(
      { walletAddress: wallet },
      {
        walletAddress: wallet,
        region,
        reportedIp: ip,
        onChain,
        stakedAmount,
        active: true,
        lastSeenAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ node });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/heartbeat", async (req, res) => {
  const { walletAddress } = req.body || {};
  const node = await NodeModel.findOneAndUpdate(
    { walletAddress: (walletAddress || "").toLowerCase() },
    { lastSeenAt: new Date(), active: true },
    { new: true }
  );
  if (!node) return res.status(404).json({ error: "node not registered" });
  res.json({ node });
});

// Node polls for jobs matching its region that it hasn't answered yet.
router.get("/jobs", async (req, res) => {
  const wallet = (req.query.walletAddress || "").toLowerCase();
  const node = await NodeModel.findOne({ walletAddress: wallet });
  if (!node) return res.status(404).json({ error: "node not registered" });

  node.lastSeenAt = new Date();
  await node.save();

  const openJobs = await Job.find({
    region: node.region,
    status: { $in: ["open", "collecting"] },
    expiresAt: { $gt: new Date() },
  }).limit(20);

  const answered = new Set(
    (await Result.find({ node: node._id, job: { $in: openJobs.map((j) => j._id) } })).map((r) =>
      String(r.job)
    )
  );

  const jobs = openJobs
    .filter((j) => !answered.has(String(j._id)))
    .map((j) => ({
      id: j._id,
      url: j.url,
      expectedSelector: j.expectedSelector,
      region: j.region,
      onChainJobId: j.onChainJobId,
      expiresAt: j.expiresAt,
    }));

  res.json({ jobs });
});

router.get("/:wallet", async (req, res) => {
  const node = await NodeModel.findOne({ walletAddress: req.params.wallet.toLowerCase() });
  if (!node) return res.status(404).json({ error: "node not found" });
  const jobsCompleted = await Result.countDocuments({ node: node._id });
  res.json({ node, jobsCompleted });
});

module.exports = router;
