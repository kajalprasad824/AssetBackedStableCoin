const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Reserve Auditor contract Deployment", function () {
  async function deployAuditorFixture() {
    const [defaultAdmin] = await ethers.getSigners();
    const reserveAuditor = await ethers.deployContract("ReserveAuditor");

    reserveAuditor.initialize(defaultAdmin.address);

    const DEFAULT_ADMIN_ROLE = await reserveAuditor.DEFAULT_ADMIN_ROLE();

    return {
      defaultAdmin,
      reserveAuditor,
      DEFAULT_ADMIN_ROLE
    };
  }

  it("Should set the right DEFAULT_ADMIN_ROLE of smart contract", async function () {
    const { defaultAdmin, reserveAuditor, DEFAULT_ADMIN_ROLE } =
      await loadFixture(deployAuditorFixture);
    expect(
      await reserveAuditor.hasRole(DEFAULT_ADMIN_ROLE, defaultAdmin)
    ).to.equal(true);
  });
});

describe("Set Stable Coin Address Function", function () {
  async function deployAuditorFixture() {
    const [defaultAdmin, manager, stablecoin, addr1] =
      await ethers.getSigners();
    const reserveAuditor = await ethers.deployContract("ReserveAuditor");

    reserveAuditor.initialize(defaultAdmin.address);

    const MANAGER_ROLE = await reserveAuditor.MANAGER_ROLE();
    await reserveAuditor
      .connect(defaultAdmin)
      .grantRole(MANAGER_ROLE, manager.address);

    return {
      defaultAdmin,
      manager,
      reserveAuditor,
      stablecoin,
      addr1,
    };
  }

  it("Should allow defaultAdmin to set stablecoin address", async function () {
    const { defaultAdmin, reserveAuditor, stablecoin } = await loadFixture(
      deployAuditorFixture
    );
    await reserveAuditor.connect(defaultAdmin).setStableCoinAddress(stablecoin);
    expect(await reserveAuditor.stablecoin()).to.equal(stablecoin);
  });

  it("Should allow Manager to set stablecoin address", async function () {
    const { reserveAuditor, manager, stablecoin } = await loadFixture(
      deployAuditorFixture
    );
    await reserveAuditor.connect(manager).setStableCoinAddress(stablecoin);
    expect(await reserveAuditor.stablecoin()).to.equal(stablecoin);
  });

  it("Should not allow other than defaultAdmin and Manager to set stablecoin address", async function () {
    const { reserveAuditor, addr1, stablecoin } = await loadFixture(
      deployAuditorFixture
    );
    await expect(
      reserveAuditor.connect(addr1).setStableCoinAddress(stablecoin)
    ).to.be.revertedWith("Not Authorize to call this function");
  });
});

describe("Record Reserve Function", function () {
    async function deployAuditorFixture() {
      const [defaultAdmin, manager, stablecoin, addr1] =
        await ethers.getSigners();
      const reserveAuditor = await ethers.deployContract("ReserveAuditor");
  
      reserveAuditor.initialize(defaultAdmin.address);
  
      const MANAGER_ROLE = await reserveAuditor.MANAGER_ROLE();
      await reserveAuditor
        .connect(defaultAdmin)
        .grantRole(MANAGER_ROLE, manager.address);

        const reserveAmount = ethers.parseEther("1000");
  
      return {
        defaultAdmin,
        manager,
        reserveAuditor,
        stablecoin,
        addr1,
        reserveAmount
      };
    }
  
    it("Should allow defaultAdmin to record reserve", async function () {
      const { defaultAdmin, reserveAuditor, reserveAmount, stablecoin } = await loadFixture(
        deployAuditorFixture
      );
      await reserveAuditor.connect(defaultAdmin).setStableCoinAddress(stablecoin)
      await reserveAuditor.connect(defaultAdmin).recordReserve(reserveAmount);
      const latestReserve = await reserveAuditor.getLatestReserve();
      expect(await latestReserve.reserveAmount).to.equal(reserveAmount);
    });

    it("Should allow manager to record reserve", async function () {
        const { manager, reserveAuditor, reserveAmount, defaultAdmin, stablecoin } = await loadFixture(
          deployAuditorFixture
        );
        await reserveAuditor.connect(defaultAdmin).setStableCoinAddress(stablecoin)
        await reserveAuditor.connect(manager).recordReserve(reserveAmount);
        const latestReserve = await reserveAuditor.getLatestReserve();
        expect(await latestReserve.reserveAmount).to.equal(reserveAmount);
      });

    it("Should not allow other than defaultAdmin and Manager to set stablecoin address", async function () {
        const { defaultAdmin,reserveAuditor, addr1, reserveAmount, stablecoin } = await loadFixture(
          deployAuditorFixture
        );
        await reserveAuditor.connect(defaultAdmin).setStableCoinAddress(stablecoin)
        await expect(
          reserveAuditor.connect(addr1).recordReserve(reserveAmount)
        ).to.be.revertedWith("Not Authorize to call this function");
      });

      it("Should revert if record reserve is zero", async function () {

        const {reserveAuditor } = await loadFixture(
            deployAuditorFixture
          );
        const recorddReserve = ethers.parseEther("0");

        await expect(
            reserveAuditor.recordReserve(recorddReserve)
        ).to.be.revertedWith("Reserve amount must be greater than zero");
    });

    it("Should revert if stablecoin address is not set before calling this function", async function () {

        const {reserveAuditor } = await loadFixture(
            deployAuditorFixture
          );
        const recorddReserve = ethers.parseEther("500");

        await expect(
            reserveAuditor.recordReserve(recorddReserve)
        ).to.be.revertedWith("Set the stable coin address first");
    });

      it("Should emit event on reserve recording", async function () {
        const { reserveAuditor, defaultAdmin, reserveAmount, stablecoin } = await loadFixture(
            deployAuditorFixture
          );

          await reserveAuditor.connect(defaultAdmin).setStableCoinAddress(stablecoin);

        await expect(reserveAuditor.connect(defaultAdmin).recordReserve(reserveAmount))
            .to.emit(reserveAuditor, "ReserveRecorded");
    });
  
  });

describe("Verify Reserve Function", function () {
    async function deployAuditorFixture() {
      const [defaultAdmin, manager, stablecoin] =
        await ethers.getSigners();
      const reserveAuditor = await ethers.deployContract("ReserveAuditor");
  
      reserveAuditor.initialize(defaultAdmin.address);
  
      const MANAGER_ROLE = await reserveAuditor.MANAGER_ROLE();
      await reserveAuditor
        .connect(defaultAdmin)
        .grantRole(MANAGER_ROLE, manager.address);

        const reserveAmount = ethers.parseEther("1000");

        await reserveAuditor.connect(defaultAdmin).setStableCoinAddress(stablecoin);
  
      return {
        defaultAdmin,
        manager,
        reserveAuditor,
        reserveAmount,
        stablecoin
      };
    }
  
    it("Should verify reserves correctly", async function () {
      const { defaultAdmin, reserveAuditor, reserveAmount } = await loadFixture(
        deployAuditorFixture
      );

      const requiredReserve = ethers.parseEther("500"); 
      await reserveAuditor.connect(defaultAdmin).recordReserve(reserveAmount);
       const isSufficient = await reserveAuditor.verifyReserves(requiredReserve);
      expect(isSufficient).to.equal(true);

    });

    it("Should revert if no reserves are recorded", async function () {

        const {reserveAuditor } = await loadFixture(
            deployAuditorFixture
          );
        const requiredReserve = ethers.parseEther("100");

        await expect(
            reserveAuditor.verifyReserves(requiredReserve)
        ).to.be.revertedWith("No reserve records found");
    });

    it("Should revert if required reserve is zero", async function () {

        const {reserveAuditor } = await loadFixture(
            deployAuditorFixture
          );
        const requiredReserve = ethers.parseEther("0");

        await expect(
            reserveAuditor.verifyReserves(requiredReserve)
        ).to.be.revertedWith("Required reserve must be greater than zero");
    });
  
  });

