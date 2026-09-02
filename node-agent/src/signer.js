const { ethers } = require("ethers");

// MUST match backend/src/utils/verify.js
function computeResultHash({ jobId, status, httpStatus, responseTimeMs, renderOk }) {
  const statusInt = status === "up" ? 1 : 0;
  return ethers.solidityPackedKeccak256(
    ["string", "uint8", "uint16", "uint32", "bool"],
    [String(jobId), statusInt, Number(httpStatus || 0), Number(responseTimeMs || 0), Boolean(renderOk)]
  );
}

async function signResult(wallet, result) {
  const resultHash = computeResultHash(result);
  const signature = await wallet.signMessage(ethers.getBytes(resultHash));
  return { resultHash, signature };
}

module.exports = { computeResultHash, signResult };
