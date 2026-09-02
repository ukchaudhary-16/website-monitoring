const express = require("express");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const { PLANS } = require("../config/plans");
const { signToken, requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password, walletAddress } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(409).json({ error: "email already registered" });

    const user = new User({ email, walletAddress: walletAddress || null, alertEmail: email });
    await user.setPassword(password);
    await user.save();
    await Subscription.create({ user: user._id, plan: "free" });

    res.status(201).json({ token: signToken(user), user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user || !(await user.verifyPassword(password || "")))
      return res.status(401).json({ error: "invalid credentials" });
    res.json({ token: signToken(user), user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user, plan: PLANS[req.user.plan] });
});

// MOCK plan selection — no payment. Just records the choice and gates features.
router.post("/subscribe", requireAuth, async (req, res) => {
  const { plan } = req.body || {};
  if (!PLANS[plan]) return res.status(400).json({ error: "unknown plan" });
  req.user.plan = plan;
  await req.user.save();
  await Subscription.updateMany({ user: req.user._id, status: "active" }, { status: "cancelled" });
  await Subscription.create({ user: req.user._id, plan });
  res.json({ user: req.user, plan: PLANS[plan], note: "mock subscription — no charge" });
});

router.get("/plans", (_req, res) => res.json({ plans: Object.values(PLANS) }));

// ---- Alert channel preferences ----
router.get("/alert-settings", requireAuth, (req, res) => {
  res.json({ alerts: req.user.alerts, alertEmail: req.user.alertEmail || req.user.email });
});

router.put("/alert-settings", requireAuth, async (req, res) => {
  const { email, slack, webhook } = req.body || {};
  const a = req.user.alerts || {};
  if (email) a.email = { enabled: !!email.enabled, address: email.address || null };
  if (slack) a.slack = { enabled: !!slack.enabled, webhookUrl: slack.webhookUrl || null };
  if (webhook) a.webhook = { enabled: !!webhook.enabled, url: webhook.url || null };
  req.user.alerts = a;
  req.user.markModified("alerts");
  await req.user.save();
  res.json({ alerts: req.user.alerts });
});

module.exports = router;
