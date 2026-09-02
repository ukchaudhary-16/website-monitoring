const mongoose = require("mongoose");

const websiteSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    // DOM selector / text the render-check must find for the page to count as "up"
    expectedSelector: { type: String, default: null },
    regions: { type: [String], default: ["us-east"] },
    intervalSeconds: { type: Number, default: 300, min: 30 },
    active: { type: Boolean, default: true },
    // rolling status derived from consensus results
    currentStatus: { type: String, enum: ["up", "down", "unknown"], default: "unknown" },
    lastCheckedAt: { type: Date, default: null },

    // alerting
    alertsEnabled: { type: Boolean, default: true },
    // flap protection: a new status must be confirmed by N consecutive settlements
    pendingStatus: { type: String, enum: ["up", "down", null], default: null },
    pendingCount: { type: Number, default: 0 },
    lastAlertAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Website", websiteSchema);
