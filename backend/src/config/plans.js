// Subscription plans are MOCKED — no real payment gateway. The chosen plan is
// stored on the user and used purely for feature gating.
const PLANS = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    maxSites: 1,
    minIntervalSeconds: 300,
    maxRegions: 1,
    alertChannels: ["email"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: 29,
    maxSites: 5,
    minIntervalSeconds: 60,
    maxRegions: 3,
    alertChannels: ["email", "slack", "webhook"],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceUsd: 199,
    maxSites: 100,
    minIntervalSeconds: 30,
    maxRegions: 10,
    alertChannels: ["email", "slack", "webhook", "sms"],
  },
};

module.exports = { PLANS };
