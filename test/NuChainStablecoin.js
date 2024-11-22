const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Nuchain Stable Coin contract Deployment", function () {
  async function deployStableCoinFixture() {
    const gas = (await ethers.provider.getFeeData()).gasPrice;
    const [defaultAdmin] = await ethers.getSigners();

    const reserveAuditorContract = await ethers.getContractFactory(
      "ReserveAuditor"
    );
    const reserveAuditor = await upgrades.deployProxy(
      reserveAuditorContract,
      [defaultAdmin.address],
      {
        gasPrice: gas,
        initializer: "initialize",
      }
    );

    const stableCoinContract = await ethers.getContractFactory(
      "NuChainStablecoin"
    );

    const reserveAuditorAddress = await reserveAuditor.getAddress() ;
    const stableCoin = await upgrades.deployProxy(
      stableCoinContract,
      [defaultAdmin.address, reserveAuditorAddress , defaultAdmin.address],
      {
        gasPrice: gas,
        initializer: "initialize",
      }
    );

    const DEFAULT_ADMIN_ROLE = await reserveAuditor.DEFAULT_ADMIN_ROLE();

    return {
      defaultAdmin,
      stableCoin,
      DEFAULT_ADMIN_ROLE,
    };
  }

  it("Should set the right DEFAULT_ADMIN_ROLE of smart contract", async function () {
    const { defaultAdmin, stableCoin, DEFAULT_ADMIN_ROLE } =
      await loadFixture(deployStableCoinFixture);
    expect(
      await stableCoin.hasRole(DEFAULT_ADMIN_ROLE, defaultAdmin)
    ).to.equal(true);
  });

  it("Should set the right name", async function () {
    const { stableCoin } =
      await loadFixture(deployStableCoinFixture);
    expect(await stableCoin.name()).to.equal("NuChain Stablecoin");
  });

  it("Should set the right symbol", async function () {
    const { stableCoin } =
      await loadFixture(deployStableCoinFixture);
    expect(await stableCoin.symbol()).to.equal("USDN");
  });

  it("Should set the right reserve ratio", async function () {
    const { stableCoin } =
      await loadFixture(deployStableCoinFixture);
    expect(await stableCoin.reserveRatio()).to.equal(ethers.parseEther("1"));
  });
});
