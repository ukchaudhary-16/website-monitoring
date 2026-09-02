// Deploys MonitorToken + MonitorRegistry and wires them together.
// Usage:
//   npx hardhat run scripts/deploy.js --network localhost
//   npx hardhat run scripts/deploy.js --network mumbai
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const initialSupply = hre.ethers.parseEther("1000000"); // 1M MON

  const Token = await hre.ethers.getContractFactory("MonitorToken");
  const token = await Token.deploy(initialSupply);
  await token.waitForDeployment();
  console.log("MonitorToken:", token.target);

  const Registry = await hre.ethers.getContractFactory("MonitorRegistry");
  const registry = await Registry.deploy(token.target);
  await registry.waitForDeployment();
  console.log("MonitorRegistry:", registry.target);

  const tx = await token.setMonitorRegistry(registry.target);
  await tx.wait();
  console.log("Linked registry -> token");

  const out = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    MonitorToken: token.target,
    MonitorRegistry: registry.target,
    deployedAt: new Date().toISOString(),
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${hre.network.name}.json`),
    JSON.stringify(out, null, 2)
  );
  console.log("Wrote deployments/" + hre.network.name + ".json");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
