const {
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { expect } = require("chai");
  const { ethers, upgrades } = require("hardhat");

  describe("Nuchain Stable Coin contract Deployment", function () {
    async function deployAuditorFixture() {
      const [defaultAdmin] = await ethers.getSigners();
      
      const stableCoinContract = await ethers.getContractFactory("NuChainStablecoin");
      const stableCoin = await upgrades.deployProxy(stableCoinContract,[defaultAdmin.address], {
          initializer: "initialize",
      })
  
      const DEFAULT_ADMIN_ROLE = await reserveAuditor.DEFAULT_ADMIN_ROLE();
  
      return {
        defaultAdmin,
        stableCoin,
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
  