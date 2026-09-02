const { ethers } = require("ethers");
const cfg = require("./config");

const REGISTRY_ABI = [
  "function minimumStake() view returns (uint256)",
  "function registerNode(string region) external",
  "function submitResult(uint256 jobId, uint8 result, bytes32 resultHash, bytes signature) external",
  "function getNode(address) view returns (tuple(address owner,string region,uint256 stakedAmount,uint256 registrationTime,bool active,uint256 unbondingTime,uint256 totalEarnings,uint256 totalJobs))",
];
const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

function registry(runner) {
  if (!cfg.registryAddress) return null;
  return new ethers.Contract(cfg.registryAddress, REGISTRY_ABI, runner);
}
function token(runner) {
  if (!cfg.tokenAddress) return null;
  return new ethers.Contract(cfg.tokenAddress, TOKEN_ABI, runner);
}

// Approve stake + registerNode on-chain. No-op if contracts not configured.
async function stakeAndRegister(wallet, region) {
  const reg = registry(wallet);
  const tok = token(wallet);
  if (!reg || !tok) {
    console.log("[chain] contract addresses not set — skipping on-chain registration");
    return { onChain: false };
  }

  const existing = await reg.getNode(wallet.address);
  if (existing.owner !== ethers.ZeroAddress) {
    console.log("[chain] already registered on-chain, stake:", ethers.formatEther(existing.stakedAmount));
    return { onChain: true, stake: existing.stakedAmount.toString() };
  }

  const stake = await reg.minimumStake();
  const bal = await tok.balanceOf(wallet.address);
  if (bal < stake) {
    throw new Error(
      `insufficient MON: need ${ethers.formatEther(stake)}, have ${ethers.formatEther(bal)}. ` +
        `Fund ${wallet.address} from the token treasury.`
    );
  }

  const allowance = await tok.allowance(wallet.address, cfg.registryAddress);
  if (allowance < stake) {
    console.log("[chain] approving stake...");
    await (await tok.approve(cfg.registryAddress, stake)).wait();
  }
  console.log("[chain] registerNode...");
  await (await reg.registerNode(region)).wait();
  console.log("[chain] registered on-chain, staked", ethers.formatEther(stake), "MON");
  return { onChain: true, stake: stake.toString() };
}

async function submitResultOnChain(wallet, onChainJobId, statusInt, resultHash, signature) {
  const reg = registry(wallet);
  if (!reg || onChainJobId == null) return false;
  await (await reg.submitResult(onChainJobId, statusInt, resultHash, signature)).wait();
  return true;
}

module.exports = { stakeAndRegister, submitResultOnChain, registry, token };
