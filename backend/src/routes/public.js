const express = require("express");
const NodeModel = require("../models/Node");
const Job = require("../models/Job");

const router = express.Router();

// Approx centroid per region for the homepage world map.
const REGION_COORDS = {
  "us-east": { lat: 39.0, lng: -77.5, label: "US East" },
  "us-west": { lat: 37.4, lng: -122.1, label: "US West" },
  "eu-west": { lat: 53.3, lng: -6.3, label: "EU West" },
  "eu-central": { lat: 50.1, lng: 8.7, label: "EU Central" },
  "ap-south": { lat: 19.1, lng: 72.9, label: "Asia South" },
  "ap-southeast": { lat: 1.35, lng: 103.8, label: "Asia SE" },
  "sa-east": { lat: -23.5, lng: -46.6, label: "South America" },
  "af-south": { lat: -33.9, lng: 18.4, label: "Africa South" },
};

router.get("/network", async (_req, res) => {
  const liveWindow = new Date(Date.now() - 10 * 60 * 1000);
  const agg = await NodeModel.aggregate([
    { $group: {
        _id: "$region",
        total: { $sum: 1 },
        live: { $sum: { $cond: [{ $gte: ["$lastSeenAt", liveWindow] }, 1, 0] } },
        onChain: { $sum: { $cond: ["$onChain", 1, 0] } },
    } },
  ]);

  const regions = agg.map((r) => ({
    region: r._id,
    ...(REGION_COORDS[r._id] || { lat: 0, lng: 0, label: r._id }),
    totalNodes: r.total,
    liveNodes: r.live,
    onChainNodes: r.onChain,
  }));

  const totalNodes = await NodeModel.countDocuments();
  const liveNodes = await NodeModel.countDocuments({ lastSeenAt: { $gte: liveWindow } });
  const settledJobs = await Job.countDocuments({ status: "settled" });

  res.json({ totalNodes, liveNodes, regionsCovered: regions.length, settledJobs, regions });
});

module.exports = router;
