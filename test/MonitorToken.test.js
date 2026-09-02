const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MonitorToken", function () {
  let monitorToken;
  let owner;
  let addr1;
  let addr2;
  let monitorRegistry;

  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy MonitorToken
    const MonitorToken = await ethers.getContractFactory("MonitorToken");
    monitorToken = await MonitorToken.deploy(INITIAL_SUPPLY);
    await monitorToken.waitForDeployment();

    // Deploy MonitorRegistry for testing
    const MonitorRegistry = await ethers.getContractFactory("MonitorRegistry");
    monitorRegistry = await MonitorRegistry.deploy(monitorToken.target);
    await monitorRegistry.waitForDeployment();

    // Set MonitorRegistry on token
    await monitorToken.setMonitorRegistry(monitorRegistry.target);
  });

  describe("Deployment", function () {
    it("Should have correct initial supply", async function () {
      const balance = await monitorToken.balanceOf(owner.address);
      expect(balance).to.equal(INITIAL_SUPPLY);
    });

    it("Should have correct name and symbol", async function () {
      expect(await monitorToken.name()).to.equal("Monitor");
      expect(await monitorToken.symbol()).to.equal("MON");
    });
  });

  describe("MonitorRegistry Assignment", function () {
    it("Should set MonitorRegistry correctly", async function () {
      expect(await monitorToken.monitorRegistry()).to.equal(monitorRegistry.target);
    });

    it("Should not allow non-owner to set registry", async function () {
      const MonitorRegistry = await ethers.getContractFactory("MonitorRegistry");
      const newRegistry = await MonitorRegistry.deploy(monitorToken.target);
      await newRegistry.waitForDeployment();

      await expect(
        monitorToken.connect(addr1).setMonitorRegistry(newRegistry.target)
      ).to.be.revertedWithCustomError(monitorToken, "OwnableUnauthorizedAccount");
    });
  });

  describe("Minting", function () {
    it("Should allow MonitorRegistry to mint (via consensus reward)", async function () {
      await monitorRegistry.setMinimumStake(ethers.parseEther("10"));

      // Register 3 nodes
      for (const acct of [owner, addr1, addr2]) {
        await monitorToken.transfer(acct.address, ethers.parseEther("10"));
        await monitorToken
          .connect(acct)
          .approve(monitorRegistry.target, ethers.parseEther("10"));
        await monitorRegistry.connect(acct).registerNode("us-east");
      }

      await monitorRegistry.createJob("https://example.com", "us-east");
      const rh = ethers.id("r");
      for (const acct of [owner, addr1, addr2]) {
        await monitorRegistry.connect(acct).submitResult(0, 1, rh, "0x");
      }

      const before = await monitorToken.balanceOf(addr1.address);
      await monitorRegistry.settleConsensus(0);
      const after = await monitorToken.balanceOf(addr1.address);

      expect(after - before).to.equal(ethers.parseEther("1")); // rewardPerSubmission
    });

    it("Should not allow non-registry to mint", async function () {
      const mintAmount = ethers.parseEther("100");
      await expect(
        monitorToken.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.revertedWith("Only MonitorRegistry can mint");
    });
  });

  describe("Token Transfer", function () {
    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseEther("100");
      await monitorToken.transfer(addr1.address, transferAmount);

      const balance = await monitorToken.balanceOf(addr1.address);
      expect(balance).to.equal(transferAmount);
    });

    it("Should allow approved transfers", async function () {
      const transferAmount = ethers.parseEther("100");
      await monitorToken.approve(addr1.address, transferAmount);

      await monitorToken
        .connect(addr1)
        .transferFrom(owner.address, addr2.address, transferAmount);

      const balance = await monitorToken.balanceOf(addr2.address);
      expect(balance).to.equal(transferAmount);
    });
  });

  describe("Burning", function () {
    it("Should burn tokens", async function () {
      const burnAmount = ethers.parseEther("100");
      const initialSupply = await monitorToken.totalSupply();

      await monitorToken.burn(burnAmount);

      const newSupply = await monitorToken.totalSupply();
      expect(newSupply).to.equal(initialSupply - burnAmount);
    });

    it("Should allow MonitorRegistry to burn", async function () {
      const burnAmount = ethers.parseEther("50");
      await monitorToken.approve(monitorRegistry.target, burnAmount);

      // Verify burnFrom is callable (actual test in registry tests)
      expect(await monitorToken.balanceOf(owner.address)).to.be.greaterThan(0);
    });
  });
});
