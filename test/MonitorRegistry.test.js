const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("MonitorRegistry", function () {
  let monitorRegistry;
  let monitorToken;
  let owner;
  let node1;
  let node2;
  let node3;
  let customer;

  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const MINIMUM_STAKE = ethers.parseEther("100");
  const REWARD_PER_SUBMISSION = ethers.parseEther("1");

  beforeEach(async function () {
    [owner, node1, node2, node3, customer] = await ethers.getSigners();

    // Deploy MonitorToken
    const MonitorToken = await ethers.getContractFactory("MonitorToken");
    monitorToken = await MonitorToken.deploy(INITIAL_SUPPLY);
    await monitorToken.waitForDeployment();

    // Deploy MonitorRegistry
    const MonitorRegistry = await ethers.getContractFactory("MonitorRegistry");
    monitorRegistry = await MonitorRegistry.deploy(monitorToken.target);
    await monitorRegistry.waitForDeployment();

    // Set MonitorRegistry on token
    await monitorToken.setMonitorRegistry(monitorRegistry.target);

    // Distribute tokens to nodes
    await monitorToken.transfer(node1.address, INITIAL_SUPPLY / BigInt(3));
    await monitorToken.transfer(node2.address, INITIAL_SUPPLY / BigInt(3));
    await monitorToken.transfer(node3.address, INITIAL_SUPPLY / BigInt(3));
  });

  describe("Node Registration", function () {
    it("Should register a node with stake", async function () {
      await monitorToken
        .connect(node1)
        .approve(monitorRegistry.target, MINIMUM_STAKE);

      await expect(
        monitorRegistry.connect(node1).registerNode("us-east")
      ).to.emit(monitorRegistry, "NodeRegistered");

      const node = await monitorRegistry.getNode(node1.address);
      expect(node.active).to.equal(true);
      expect(node.region).to.equal("us-east");
      expect(node.stakedAmount).to.equal(MINIMUM_STAKE);
    });

    it("Should track nodes by region", async function () {
      await monitorToken
        .connect(node1)
        .approve(monitorRegistry.target, MINIMUM_STAKE);
      await monitorRegistry.connect(node1).registerNode("us-east");

      await monitorToken
        .connect(node2)
        .approve(monitorRegistry.target, MINIMUM_STAKE);
      await monitorRegistry.connect(node2).registerNode("us-east");

      const regionNodes = await monitorRegistry.getNodesByRegion("us-east");
      expect(regionNodes.length).to.equal(2);
      expect(regionNodes).to.include(node1.address);
      expect(regionNodes).to.include(node2.address);
    });

    it("Should not allow duplicate registration", async function () {
      await monitorToken
        .connect(node1)
        .approve(monitorRegistry.target, MINIMUM_STAKE);
      await monitorRegistry.connect(node1).registerNode("us-east");

      await monitorToken
        .connect(node1)
        .approve(monitorRegistry.target, MINIMUM_STAKE);

      await expect(
        monitorRegistry.connect(node1).registerNode("us-west")
      ).to.be.revertedWith("Node already registered");
    });

    it("Should fail if insufficient approval", async function () {
      await monitorToken
        .connect(node1)
        .approve(monitorRegistry.target, MINIMUM_STAKE / BigInt(2));

      await expect(
        monitorRegistry.connect(node1).registerNode("us-east")
      ).to.be.revertedWith("Insufficient allowance or balance");
    });
  });

  describe("Node Deactivation & Withdrawal", function () {
    beforeEach(async function () {
      await monitorToken
        .connect(node1)
        .approve(monitorRegistry.target, MINIMUM_STAKE);
      await monitorRegistry.connect(node1).registerNode("us-east");
    });

    it("Should deactivate a node", async function () {
      await expect(
        monitorRegistry.connect(node1).deactivateNode()
      ).to.emit(monitorRegistry, "NodeDeactivated");

      const node = await monitorRegistry.getNode(node1.address);
      expect(node.active).to.equal(false);
    });

    it("Should not allow withdrawal before unbonding period", async function () {
      await monitorRegistry.connect(node1).deactivateNode();

      await expect(
        monitorRegistry.connect(node1).withdrawStake()
      ).to.be.revertedWith("Unbonding period not complete");
    });

    it("Should allow withdrawal after unbonding period", async function () {
      await monitorRegistry.connect(node1).deactivateNode();

      const unbondingPeriod = 7 * 24 * 60 * 60; // 7 days
      await time.increase(unbondingPeriod + 1);

      const balanceBefore = await monitorToken.balanceOf(node1.address);
      await monitorRegistry.connect(node1).withdrawStake();
      const balanceAfter = await monitorToken.balanceOf(node1.address);

      expect(balanceAfter).to.equal(balanceBefore + MINIMUM_STAKE);
    });
  });

  describe("Job Creation", function () {
    it("Should create a job", async function () {
      await expect(
        monitorRegistry.createJob("https://example.com", "us-east")
      ).to.emit(monitorRegistry, "JobCreated");

      const job = await monitorRegistry.getJob(0);
      expect(job.targetUrl).to.equal("https://example.com");
      expect(job.region).to.equal("us-east");
      expect(job.settled).to.equal(false);
    });

    it("Should only allow owner to create jobs", async function () {
      await expect(
        monitorRegistry
          .connect(node1)
          .createJob("https://example.com", "us-east")
      ).to.be.revertedWithCustomError(monitorRegistry, "OwnableUnauthorizedAccount");
    });
  });

  describe("Result Submission", function () {
    beforeEach(async function () {
      // Register nodes
      for (const node of [node1, node2, node3]) {
        await monitorToken
          .connect(node)
          .approve(monitorRegistry.target, MINIMUM_STAKE);
        await monitorRegistry.connect(node).registerNode("us-east");
      }

      // Create job
      await monitorRegistry.createJob("https://example.com", "us-east");
    });

    it("Should allow nodes to submit results", async function () {
      const resultHash = ethers.id("result");
      const signature = "0x";

      await expect(
        monitorRegistry
          .connect(node1)
          .submitResult(0, 1, resultHash, signature)
      ).to.emit(monitorRegistry, "ResultSubmitted");

      const submissions = await monitorRegistry.getJobSubmissions(0);
      expect(submissions.length).to.equal(1);
      expect(submissions[0].node).to.equal(node1.address);
      expect(submissions[0].result).to.equal(1);
    });

    it("Should not allow inactive nodes to submit", async function () {
      await monitorRegistry.connect(node1).deactivateNode();

      const resultHash = ethers.id("result");
      const signature = "0x";

      await expect(
        monitorRegistry
          .connect(node1)
          .submitResult(0, 1, resultHash, signature)
      ).to.be.revertedWith("Node is not active");
    });

    it("Should track submission count", async function () {
      const resultHash = ethers.id("result");
      const signature = "0x";

      await monitorRegistry
        .connect(node1)
        .submitResult(0, 1, resultHash, signature);
      await monitorRegistry
        .connect(node2)
        .submitResult(0, 1, resultHash, signature);

      const count = await monitorRegistry.getSubmissionCount(0);
      expect(count).to.equal(2);
    });
  });

  describe("Consensus Settlement", function () {
    beforeEach(async function () {
      // Register 3 nodes
      for (const node of [node1, node2, node3]) {
        await monitorToken
          .connect(node)
          .approve(monitorRegistry.target, MINIMUM_STAKE);
        await monitorRegistry.connect(node).registerNode("us-east");
      }

      // Create job
      await monitorRegistry.createJob("https://example.com", "us-east");
    });

    it("Should reward majority agreeing nodes", async function () {
      const resultHash = ethers.id("result");
      const signature = "0x";

      // node1 and node2 say UP (1), node3 says DOWN (0)
      await monitorRegistry
        .connect(node1)
        .submitResult(0, 1, resultHash, signature);
      await monitorRegistry
        .connect(node2)
        .submitResult(0, 1, resultHash, signature);
      await monitorRegistry
        .connect(node3)
        .submitResult(0, 0, resultHash, signature);

      const balanceBefore1 = await monitorToken.balanceOf(node1.address);
      const balanceBefore3 = await monitorToken.balanceOf(node3.address);

      await expect(
        monitorRegistry.settleConsensus(0)
      ).to.emit(monitorRegistry, "ConsensusSettled");

      const balanceAfter1 = await monitorToken.balanceOf(node1.address);

      // node1 should be rewarded in its wallet
      expect(balanceAfter1).to.equal(balanceBefore1 + REWARD_PER_SUBMISSION);

      // node3 should be slashed: its on-chain staked amount drops by 10%,
      // and those tokens are burned from the registry's custody (wallet unchanged).
      const slashAmount = (MINIMUM_STAKE * BigInt(10)) / BigInt(100);
      const node3After = await monitorRegistry.getNode(node3.address);
      expect(node3After.stakedAmount).to.equal(MINIMUM_STAKE - slashAmount);
    });

    it("Should mark job as settled", async function () {
      const resultHash = ethers.id("result");
      const signature = "0x";

      await monitorRegistry
        .connect(node1)
        .submitResult(0, 1, resultHash, signature);
      await monitorRegistry
        .connect(node2)
        .submitResult(0, 1, resultHash, signature);
      await monitorRegistry
        .connect(node3)
        .submitResult(0, 1, resultHash, signature);

      const jobBefore = await monitorRegistry.getJob(0);
      expect(jobBefore.settled).to.equal(false);

      await monitorRegistry.settleConsensus(0);

      const jobAfter = await monitorRegistry.getJob(0);
      expect(jobAfter.settled).to.equal(true);
      expect(jobAfter.result).to.equal(1); // Majority was 1 (UP)
    });

    it("Should not settle if insufficient submissions", async function () {
      const resultHash = ethers.id("result");
      const signature = "0x";

      await monitorRegistry
        .connect(node1)
        .submitResult(0, 1, resultHash, signature);
      await monitorRegistry
        .connect(node2)
        .submitResult(0, 1, resultHash, signature);

      await expect(
        monitorRegistry.settleConsensus(0)
      ).to.be.revertedWith("Insufficient submissions for consensus (need >= 3)");
    });

    it("Should handle DOWN majority correctly", async function () {
      const resultHash = ethers.id("result");
      const signature = "0x";

      // All three nodes say DOWN
      await monitorRegistry
        .connect(node1)
        .submitResult(0, 0, resultHash, signature);
      await monitorRegistry
        .connect(node2)
        .submitResult(0, 0, resultHash, signature);
      await monitorRegistry
        .connect(node3)
        .submitResult(0, 0, resultHash, signature);

      await monitorRegistry.settleConsensus(0);

      const job = await monitorRegistry.getJob(0);
      expect(job.result).to.equal(0); // DOWN
    });
  });

  describe("View Functions", function () {
    it("Should return correct node count", async function () {
      const countBefore = await monitorRegistry.getNodeCount();
      expect(countBefore).to.equal(0);

      await monitorToken
        .connect(node1)
        .approve(monitorRegistry.target, MINIMUM_STAKE);
      await monitorRegistry.connect(node1).registerNode("us-east");

      const countAfter = await monitorRegistry.getNodeCount();
      expect(countAfter).to.equal(1);
    });

    it("Should return node details", async function () {
      await monitorToken
        .connect(node1)
        .approve(monitorRegistry.target, MINIMUM_STAKE);
      await monitorRegistry.connect(node1).registerNode("us-east");

      const node = await monitorRegistry.getNode(node1.address);
      expect(node.owner).to.equal(node1.address);
      expect(node.region).to.equal("us-east");
      expect(node.active).to.equal(true);
    });
  });
});
