#!/usr/bin/env node
const { Command } = require("commander");
const { ethers } = require("ethers");
const cfg = require("./config");
const { getProvider, loadOrCreateWallet } = require("./wallet");
const { stakeAndRegister } = require("./chain");
const api = require("./api");
const { startLoop } = require("./runner");
const { startDashboard } = require("./dashboard");
const { state } = require("./state");

const program = new Command();
program.name("depin-node").description("DePIN uptime monitoring validator node");

program
  .command("register")
  .description("stake on-chain (if configured) and register with the backend")
  .option("-r, --region <region>", "region code", cfg.region)
  .action(async (opts) => {
    const wallet = loadOrCreateWallet(getProvider());
    console.log("Node wallet:", wallet.address);
    console.log("Region:", opts.region);

    let onChain = { onChain: false, stake: "0" };
    try {
      onChain = await stakeAndRegister(wallet, opts.region);
    } catch (e) {
      console.error("[chain] registration failed:", e.message);
      console.error("Continuing with backend-only registration.");
    }

    const { node } = await api.registerNode(wallet.address, opts.region);
    console.log("Backend registered node:", node._id);
    console.log(onChain.onChain ? `On-chain stake: ${ethers.formatEther(onChain.stake || "0")} MON` : "On-chain: skipped");
  });

program
  .command("start")
  .description("poll for jobs, run checks, submit signed results")
  .option("--dashboard", "also serve the local dashboard")
  .action(async (opts) => {
    const wallet = loadOrCreateWallet(getProvider());
    try {
      await api.heartbeat(wallet.address);
    } catch {
      console.log("Node not registered yet — registering now...");
      await api.registerNode(wallet.address, cfg.region);
    }
    if (opts.dashboard) startDashboard();
    await startLoop(wallet);
  });

program
  .command("dashboard")
  .description("serve the local node dashboard only")
  .action(async () => {
    const wallet = loadOrCreateWallet(getProvider());
    state.wallet = wallet.address;
    state.region = cfg.region;
    startDashboard();
  });

program
  .command("status")
  .description("print on-chain + backend status for this node")
  .action(async () => {
    const wallet = loadOrCreateWallet(getProvider());
    console.log("Wallet:", wallet.address);
    try {
      const info = await api.nodeInfo(wallet.address);
      console.log("Backend:", JSON.stringify(info, null, 2));
    } catch (e) {
      console.log("Backend:", e.message);
    }
  });

program.parseAsync(process.argv);
