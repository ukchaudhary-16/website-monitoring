// Seeds a demo customer, a website, and a spread of nodes across regions so the
// homepage world map and dashboard have something to show.
require("dotenv").config();
const { connectDB } = require("../config/db");
const mongoose = require("mongoose");
const User = require("../models/User");
const Website = require("../models/Website");
const NodeModel = require("../models/Node");
const Subscription = require("../models/Subscription");
const { ethers } = require("ethers");

const REGIONS = ["us-east", "us-west", "eu-west", "eu-central", "ap-south", "ap-southeast", "sa-east"];

async function main() {
  await connectDB();

  await Promise.all([
    User.deleteMany({ email: "demo@example.com" }),
    Website.deleteMany({}),
    NodeModel.deleteMany({}),
    Subscription.deleteMany({}),
  ]);

  const user = new User({ email: "demo@example.com", plan: "pro", alertEmail: "demo@example.com" });
  await user.setPassword("password123");
  await user.save();
  await Subscription.create({ user: user._id, plan: "pro" });

  await Website.create({
    owner: user._id,
    name: "Example",
    url: "https://example.com",
    expectedSelector: "h1",
    regions: ["us-east", "eu-west", "ap-south"],
    intervalSeconds: 60,
  });

  let n = 0;
  for (const region of REGIONS) {
    const count = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      await NodeModel.create({
        walletAddress: ethers.Wallet.createRandom().address.toLowerCase(),
        region,
        onChain: Math.random() > 0.3,
        stakedAmount: ethers.parseEther("100").toString(),
        lastSeenAt: new Date(Date.now() - Math.random() * 5 * 60 * 1000),
      });
      n++;
    }
  }

  console.log(`Seeded: 1 user (demo@example.com / password123), 1 website, ${n} nodes`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
