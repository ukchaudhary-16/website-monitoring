// One-shot local demo bootstrap:
//   1. deploy MonitorToken + MonitorRegistry
//   2. generate N node wallets, fund each with MON, (optionally) lower the stake bar
//   3. write deployments/localhost.json + deployments/demo-nodes.json
//   4. print paste-ready env blocks for backend/.env and each node-agent/.env
//
// Usage: npx hardhat run scripts/demo-setup.js --network localhost
//        NODES=5 STAKE=10 npx hardhat run scripts/demo-setup.js --network localhost
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const REGIONS = ["us-east", "eu-west", "ap-south", "us-west", "sa-east", "ap-southeast"];

async function main() {
  const N = Number(process.env.NODES || 3);
  const stakeMon = process.env.STAKE ? Number(process.env.STAKE) : null;
  const [deployer] = await hre.ethers.getSigners();
  const E = hre.ethers.parseEther.bind(hre.ethers);

  const token = await (await hre.ethers.getContractFactory("MonitorToken")).deploy(E("1000000"));
  await token.waitForDeployment();
  const registry = await (await hre.ethers.getContractFactory("MonitorRegistry")).deploy(token.target);
  await registry.waitForDeployment();
  await (await token.setMonitorRegistry(registry.target)).wait();

  if (stakeMon != null) {
    await (await registry.setMinimumStake(E(String(stakeMon)))).wait();
    console.log(`minimumStake lowered to ${stakeMon} MON`);
  }
  const minStake = await registry.minimumStake();
  const fund = minStake * 3n;

  const nodes = [];
  for (let i = 0; i < N; i++) {
    const w = hre.ethers.Wallet.createRandom();
    await (await token.transfer(w.address, fund)).wait();
    nodes.push({
      address: w.address,
      privateKey: w.privateKey,
      region: REGIONS[i % REGIONS.length],
      fundedMon: hre.ethers.formatEther(fund),
    });
  }

  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  const dep = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    MonitorToken: token.target,
    MonitorRegistry: registry.target,
    deployer: deployer.address,
    deployerKey: process.env.DEPLOYER_KEY_HINT || "Hardhat account #0 (see `npm run node` output)",
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(dir, `${hre.network.name}.json`), JSON.stringify(dep, null, 2));
  fs.writeFileSync(path.join(dir, "demo-nodes.json"), JSON.stringify(nodes, null, 2));

  console.log("\n================  DEPLOYED  ================");
  console.log("MonitorToken   :", token.target);
  console.log("MonitorRegistry:", registry.target);
  console.log("minimumStake   :", hre.ethers.formatEther(minStake), "MON");

  console.log("\n----------  backend/.env  ----------");
  console.log(`CHAIN_RPC_URL=http://127.0.0.1:8545`);
  console.log(`MONITOR_TOKEN_ADDRESS=${token.target}`);
  console.log(`MONITOR_REGISTRY_ADDRESS=${registry.target}`);
  console.log(`# SETTLEMENT_PRIVATE_KEY=<Hardhat account #0 private key from 'npm run node'>`);
  console.log(`CONSENSUS_MIN_SUBMISSIONS=${Math.min(3, N)}`);

  nodes.forEach((n, i) => {
    console.log(`\n----------  node-agent #${i + 1}  (.env)  ----------`);
    console.log(`NODE_REGION=${n.region}`);
    console.log(`BACKEND_URL=http://localhost:4000`);
    console.log(`CHAIN_RPC_URL=http://127.0.0.1:8545`);
    console.log(`MONITOR_TOKEN_ADDRESS=${token.target}`);
    console.log(`MONITOR_REGISTRY_ADDRESS=${registry.target}`);
    console.log(`PRIVATE_KEY=${n.privateKey}`);
    console.log(`WALLET_FILE=./node-wallet-${i + 1}.json`);
    console.log(`DASHBOARD_PORT=${5055 + i}`);
    console.log(`SUBMIT_ONCHAIN=true`);
  });

  console.log("\nSaved deployments/localhost.json and deployments/demo-nodes.json");
  console.log("Next: start backend, then in each node-agent copy the block above into .env and run:");
  console.log("  node src/index.js register && node src/index.js start --dashboard\n");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
