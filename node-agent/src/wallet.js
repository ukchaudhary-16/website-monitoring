const fs = require("fs");
const { ethers } = require("ethers");
const cfg = require("./config");

// Resolution order: PRIVATE_KEY env -> WALLET_FILE -> generate + persist.
function loadOrCreateWallet(provider) {
  if (cfg.privateKey) {
    return new ethers.Wallet(cfg.privateKey, provider);
  }
  if (fs.existsSync(cfg.walletFile)) {
    const { privateKey } = JSON.parse(fs.readFileSync(cfg.walletFile, "utf8"));
    return new ethers.Wallet(privateKey, provider);
  }
  const w = ethers.Wallet.createRandom();
  fs.writeFileSync(
    cfg.walletFile,
    JSON.stringify({ address: w.address, privateKey: w.privateKey }, null, 2)
  );
  fs.chmodSync(cfg.walletFile, 0o600);
  console.log(`Generated new node wallet -> ${cfg.walletFile}`);
  console.log(`Address: ${w.address}`);
  return new ethers.Wallet(w.privateKey, provider);
}

function getProvider() {
  return new ethers.JsonRpcProvider(cfg.rpcUrl);
}

module.exports = { loadOrCreateWallet, getProvider };
