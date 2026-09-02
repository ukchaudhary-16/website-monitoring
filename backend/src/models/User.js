const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    walletAddress: { type: String, default: null, lowercase: true },
    plan: { type: String, enum: ["free", "pro", "enterprise"], default: "free" },
    alertEmail: { type: String, default: null },
    alerts: {
      email: {
        enabled: { type: Boolean, default: true },
        address: { type: String, default: null }, // falls back to alertEmail / email
      },
      slack: {
        enabled: { type: Boolean, default: false },
        webhookUrl: { type: String, default: null },
      },
      webhook: {
        enabled: { type: Boolean, default: false },
        url: { type: String, default: null },
      },
    },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

userSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.toJSON = function () {
  const o = this.toObject();
  delete o.passwordHash;
  return o;
};

module.exports = mongoose.model("User", userSchema);
