const { ethers } = require("ethers");

// The node signs keccak256(abi.encode(jobId, status, httpStatus, responseTimeMs, renderOk))
// as an EIP-191 personal message. We recompute the digest and recover the signer.
function computeResultHash({ jobId, status, httpStatus, responseTimeMs, renderOk }) {
  const statusInt = status === "up" ? 1 : 0;
  return ethers.solidityPackedKeccak256(
    ["string", "uint8", "uint16", "uint32", "bool"],
    [
      String(jobId),
      statusInt,
      Number(httpStatus || 0),
      Number(responseTimeMs || 0),
      Boolean(renderOk),
    ]
  );
}

function recoverSigner(resultHash, signature) {
  // resultHash is a 32-byte hex string; node signs the raw bytes.
  return ethers.verifyMessage(ethers.getBytes(resultHash), signature);
}

module.exports = { computeResultHash, recoverSigner };
