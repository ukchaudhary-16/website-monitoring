const mongoose = require("mongoose");

// Mirror of on-chain node registration + liveness bookkeeping for job assignment.
const nodeSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, required: true, unique: true, lowercase: true },
    region: { type: String, required: true, index: true },
    reportedIp: { type: String, default: null },
    geoRegion: { type: String, default: null }, // IP-geolocation cross-check
    onChain: { type: Boolean, default: false },
    stakedAmount: { type: String, default: "0" }, // wei string
    active: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: Date.now, index: true },
    jobsCompleted: { type: Number, default: 0 },
    totalEarnings: { type: String, default: "0" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Node", nodeSchema);
