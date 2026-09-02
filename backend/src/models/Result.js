const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    node: { type: mongoose.Schema.Types.ObjectId, ref: "Node", required: true, index: true },
    nodeWallet: { type: String, required: true, lowercase: true },
    // observed outcome
    status: { type: String, enum: ["up", "down"], required: true },
    httpStatus: { type: Number, default: null },
    responseTimeMs: { type: Number, default: null },
    renderOk: { type: Boolean, default: null }, // headless render check passed
    detail: { type: String, default: null },
    // integrity
    resultHash: { type: String, required: true },
    signature: { type: String, required: true },
    agreedWithConsensus: { type: Boolean, default: null },
  },
  { timestamps: true }
);

resultSchema.index({ job: 1, node: 1 }, { unique: true });

module.exports = mongoose.model("Result", resultSchema);
