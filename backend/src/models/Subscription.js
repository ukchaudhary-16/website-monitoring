const mongoose = require("mongoose");

// MOCKED billing record. No gateway, no charges — this just logs the plan choice
// so an examiner can see the product model and feature-gating in action.
const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: String, enum: ["free", "pro", "enterprise"], required: true },
    status: { type: String, enum: ["active", "cancelled"], default: "active" },
    mock: { type: Boolean, default: true },
    startedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
