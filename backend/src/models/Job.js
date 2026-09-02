const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    website: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    url: { type: String, required: true },
    expectedSelector: { type: String, default: null },
    region: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["open", "collecting", "settling", "settled", "expired"],
      default: "open",
      index: true,
    },
    // on-chain job id once mirrored to MonitorRegistry (optional for demo)
    onChainJobId: { type: Number, default: null },
    consensusResult: { type: String, enum: ["up", "down", "unknown"], default: "unknown" },
    assignedNodes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Node" }],
    expiresAt: { type: Date, required: true, index: true },
    settledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
