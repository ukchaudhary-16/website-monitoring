const { ethers } = require("ethers");

// Minimal ABIs — only what the settlement worker / API needs.
const REGISTRY_ABI = [
  "function createJob(string targetUrl, string region) external",
  "function submitResult(uint256 jobId, uint8 result, bytes32 resultHash, bytes signature) external",
  "function settleConsensus(uint256 jobId) external",
  "function jobCounter() view returns (uint256)",
  "function getNode(address) view returns (tuple(address owner,string region,uint256 stakedAmount,uint256 registrationTime,bool active,uint256 unbondingTime,uint256 totalEarnings,uint256 totalJobs))",
  "function getSubmissionCount(uint256) view returns (uint256)",
  "event JobCreated(uint256 indexed jobId, string targetUrl, string region)",
  "event ConsensusSettled(uint256 indexed jobId, uint8 majorityResult, uint256 rewarded, uint256 slashed)",
];

const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
];

let _provider = null;
let _signer = null;

function getProvider() {
  if (_provider) return _provider;
  _provider = new ethers.JsonRpcProvider(process.env.CHAIN_RPC_URL || "http://127.0.0.1:8545");
  return _provider;
}

function getSigner() {
  if (_signer) return _signer;
  const pk = process.env.SETTLEMENT_PRIVATE_KEY;
  if (!pk) return null;
  _signer = new ethers.Wallet(pk, getProvider());
  return _signer;
}

function getRegistry({ withSigner = false } = {}) {
  const addr = process.env.MONITOR_REGISTRY_ADDRESS;
  if (!addr) return null;
  const runner = withSigner ? getSigner() : getProvider();
  if (!runner) return null;
  return new ethers.Contract(addr, REGISTRY_ABI, runner);
}

function getToken() {
  const addr = process.env.MONITOR_TOKEN_ADDRESS;
  if (!addr) return null;
  return new ethers.Contract(addr, TOKEN_ABI, getProvider());
}

module.exports = { ethers, getProvider, getSigner, getRegistry, getToken, REGISTRY_ABI, TOKEN_ABI };
