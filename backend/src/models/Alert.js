const mongoose = require("mongoose");

// Log of notifications we attempted to send, for the dashboard + debugging.
const alertSchema = new mongoose.Schema(
  {
    website: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    transition: { type: String, required: true }, // "up->down" | "down->up"
    fromStatus: String,
    toStatus: String,
    region: String,
    channels: [
      {
        channel: { type: String }, // email | slack | webhook | console
        ok: Boolean,
        detail: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Alert", alertSchema);
