const { expect } = require("chai");
const { ethers } = require("hardhat");

// End-to-end walkthrough of the on-chain half of the pipeline:
//   deploy -> fund nodes -> register+stake -> job -> submit results
//   -> settleConsensus -> honest nodes minted rewards, bad node slashed.
// This is the "catching a bad node" demo beat, as a repeatable test.
describe("E2E: register -> job -> results -> consensus -> reward/slash", function () {
  let token, registry, owner, honest1, honest2, honest3, liar;
  const STAKE = ethers.parseEther("100");
  const REWARD = ethers.parseEther("1");

  before(async () => {
    [owner, honest1, honest2, honest3, liar] = await ethers.getSigners();

    token = await (await ethers.getContractFactory("MonitorToken")).deploy(ethers.parseEther("1000000"));
    await token.waitForDeployment();
    registry = await (await ethers.getContractFactory("MonitorRegistry")).deploy(token.target);
    await registry.waitForDeployment();
    await token.setMonitorRegistry(registry.target);

    // treasury funds each node operator with enough MON to stake
    for (const n of [honest1, honest2, honest3, liar]) {
      await token.transfer(n.address, ethers.parseEther("150"));
    }
  });

  it("nodes stake and register in a region", async () => {
    for (const n of [honest1, honest2, honest3, liar]) {
      await token.connect(n).approve(registry.target, STAKE);
      await registry.connect(n).registerNode("eu-west");
    }
    expect(await registry.getNodeCount()).to.equal(4);
    expect((await registry.getNodesByRegion("eu-west")).length).to.equal(4);
  });

  it("backend creates a job and nodes submit signed results", async () => {
    await registry.createJob("https://example.com", "eu-west");
    const jobId = 0;

    // 3 honest nodes see UP (1), the liar reports DOWN (0)
    const votes = [
      [honest1, 1],
      [honest2, 1],
      [honest3, 1],
      [liar, 0],
    ];
    for (const [node, result] of votes) {
      const resultHash = ethers.solidityPackedKeccak256(
        ["string", "uint8", "uint16", "uint32", "bool"],
        [String(jobId), result, 200, 123, result === 1]
      );
      const signature = await node.signMessage(ethers.getBytes(resultHash));
      await registry.connect(node).submitResult(jobId, result, resultHash, signature);
    }
    expect(await registry.getSubmissionCount(jobId)).to.equal(4);
  });

  it("settleConsensus rewards the majority and slashes the outlier", async () => {
    const before = {
      h1: await token.balanceOf(honest1.address),
      liarStake: (await registry.getNode(liar.address)).stakedAmount,
    };

    await expect(registry.settleConsensus(0)).to.emit(registry, "ConsensusSettled");

    // honest node minted exactly one reward
    expect(await token.balanceOf(honest1.address)).to.equal(before.h1 + REWARD);

    // job resolved UP
    expect((await registry.getJob(0)).result).to.equal(1);

    // liar lost 10% of stake
    const liarAfter = await registry.getNode(liar.address);
    expect(liarAfter.stakedAmount).to.equal(before.liarStake - (STAKE * 10n) / 100n);

    // total supply grew by 3 rewards and shrank by 1 slash
    // (3 * 1 MON minted) - (10 MON burned) = net -7 MON vs the 1,000,000 start
    expect(await token.totalSupply()).to.equal(
      ethers.parseEther("1000000") + 3n * REWARD - (STAKE * 10n) / 100n
    );
  });

  it("a repeatedly dishonest node can be deactivated and its remaining stake unbonded", async () => {
    await registry.connect(liar).deactivateNode();
    expect((await registry.getNode(liar.address)).active).to.equal(false);
    await expect(registry.connect(liar).withdrawStake()).to.be.revertedWith(
      "Unbonding period not complete"
    );
  });
});
