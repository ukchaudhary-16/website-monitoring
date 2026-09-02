const express = require("express");
const Job = require("../models/Job");
const NodeModel = require("../models/Node");
const Result = require("../models/Result");
const { computeResultHash, recoverSigner } = require("../utils/verify");

const router = express.Router();

// Node submits a signed check result. Signature is verified against the node wallet.
router.post("/", async (req, res) => {
  try {
    const { jobId, walletAddress, status, httpStatus, responseTimeMs, renderOk, detail, signature } =
      req.body || {};

    if (!jobId || !walletAddress || !signature) return res.status(400).json({ error: "jobId, walletAddress, signature required" });
    if (!["up", "down"].includes(status)) return res.status(400).json({ error: "status must be up|down" });

    const wallet = walletAddress.toLowerCase();
    const node = await NodeModel.findOne({ walletAddress: wallet });
    if (!node || !node.active) return res.status(403).json({ error: "node not active" });

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: "job not found" });
    if (!["open", "collecting"].includes(job.status)) return res.status(409).json({ error: "job not accepting results" });
    if (job.region !== node.region) return res.status(403).json({ error: "wrong region for this node" });

    const resultHash = computeResultHash({ jobId, status, httpStatus, responseTimeMs, renderOk });
    let recovered;
    try {
      recovered = recoverSigner(resultHash, signature);
    } catch (_) {
      return res.status(400).json({ error: "bad signature encoding" });
    }
    if (recovered.toLowerCase() !== wallet)
      return res.status(401).json({ error: "signature does not match walletAddress" });

    const doc = await Result.findOneAndUpdate(
      { job: job._id, node: node._id },
      {
        job: job._id,
        node: node._id,
        nodeWallet: wallet,
        status,
        httpStatus: httpStatus ?? null,
        responseTimeMs: responseTimeMs ?? null,
        renderOk: renderOk ?? null,
        detail: detail ?? null,
        resultHash,
        signature,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (job.status === "open") {
      job.status = "collecting";
      await job.save();
    }

    res.status(201).json({ result: doc });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: "already submitted for this job" });
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
