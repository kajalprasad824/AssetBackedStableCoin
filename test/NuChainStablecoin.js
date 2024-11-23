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

    const reserveAuditorAddress = await reserveAuditor.getAddress();
    const stableCoin = await upgrades.deployProxy(
      stableCoinContract,
      [defaultAdmin.address, reserveAuditorAddress, defaultAdmin.address],
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
    const { defaultAdmin, stableCoin, DEFAULT_ADMIN_ROLE } = await loadFixture(
      deployStableCoinFixture
    );
    expect(await stableCoin.hasRole(DEFAULT_ADMIN_ROLE, defaultAdmin)).to.equal(
      true
    );
  });

  it("Should set the right name", async function () {
    const { stableCoin } = await loadFixture(deployStableCoinFixture);
    expect(await stableCoin.name()).to.equal("NuChain Stablecoin");
  });

  it("Should set the right symbol", async function () {
    const { stableCoin } = await loadFixture(deployStableCoinFixture);
    expect(await stableCoin.symbol()).to.equal("USDN");
  });

  it("Should set the right reserve ratio", async function () {
    const { stableCoin } = await loadFixture(deployStableCoinFixture);
    expect(await stableCoin.reserveRatio()).to.equal(ethers.parseEther("1"));
  });

  it("Should set the right treasury wallet address", async function () {
    const { stableCoin, defaultAdmin } = await loadFixture(
      deployStableCoinFixture
    );
    expect(await stableCoin.treasuryWallet()).to.equal(defaultAdmin);
  });

  it("Should set the right total supply", async function () {
    const { stableCoin } = await loadFixture(deployStableCoinFixture);
    expect(await stableCoin.totalSupply()).to.equal(
      ethers.parseEther("1000000000")
    );
  });

  it("Should set the right MAX_SUPPLY", async function () {
    const { stableCoin } = await loadFixture(deployStableCoinFixture);
    expect(await stableCoin.MAX_SUPPLY()).to.equal(
      ethers.parseEther("2000000000")
    );
  });
});

describe("Mint Function", function () {
  async function deployStableCoinFixture() {
    const gas = (await ethers.provider.getFeeData()).gasPrice;
    const [defaultAdmin, admin, supplyControllerRole, otherRole, stablecoin] =
      await ethers.getSigners();

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

    const reserveAuditorAddress = await reserveAuditor.getAddress();
    const stableCoin = await upgrades.deployProxy(
      stableCoinContract,
      [defaultAdmin.address, reserveAuditorAddress, defaultAdmin.address],
      {
        gasPrice: gas,
        initializer: "initialize",
      }
    );

    const ADMIN_ROLE = await stableCoin.ADMIN_ROLE();
    await stableCoin.connect(defaultAdmin).grantRole(ADMIN_ROLE, admin.address);

    const SUPPLY_CONTROLLER_ROLE = await stableCoin.SUPPLY_CONTROLLER_ROLE();
    await stableCoin
      .connect(defaultAdmin)
      .grantRole(SUPPLY_CONTROLLER_ROLE, supplyControllerRole.address);

    const amountToMint = ethers.parseEther("500");
    const totalReserve = ethers.parseEther("2000000000");

    await stableCoin.connect(defaultAdmin).updateReserves(totalReserve);
    await reserveAuditor.connect(defaultAdmin).setStableCoinAddress(stablecoin);
    await reserveAuditor.connect(defaultAdmin).recordReserve(totalReserve);

    return {
      defaultAdmin,
      admin,
      supplyControllerRole,
      otherRole,
      stableCoin,
      reserveAuditor,
      amountToMint,
    };
  }

  it("should mint tokens successfully by default admin", async function () {
    const { defaultAdmin, stableCoin, otherRole, amountToMint } =
      await loadFixture(deployStableCoinFixture);
    await stableCoin
      .connect(defaultAdmin)
      .mint(otherRole.address, amountToMint);

    expect(await stableCoin.balanceOf(otherRole.address)).to.equal(
      amountToMint
    );
    expect(await stableCoin.totalSupply()).to.equal(
      ethers.parseEther("1000000500")
    );
    expect(await stableCoin.totalReserves()).to.equal(
      ethers.parseEther("1999999500")
    );
  });

  it("Should mint tokens successfully by admin", async function () {
    const { admin, stableCoin, otherRole, amountToMint } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(admin).mint(otherRole.address, amountToMint);

    expect(await stableCoin.balanceOf(otherRole.address)).to.equal(
      amountToMint
    );
    expect(await stableCoin.totalSupply()).to.equal(
      ethers.parseEther("1000000500")
    );
    expect(await stableCoin.totalReserves()).to.equal(
      ethers.parseEther("1999999500")
    );
  });

  it("Should mint tokens successfully by supply controller role", async function () {
    const { supplyControllerRole, stableCoin, otherRole, amountToMint } =
      await loadFixture(deployStableCoinFixture);
    await stableCoin
      .connect(supplyControllerRole)
      .mint(otherRole.address, amountToMint);

    expect(await stableCoin.balanceOf(otherRole.address)).to.equal(
      amountToMint
    );
    expect(await stableCoin.totalSupply()).to.equal(
      ethers.parseEther("1000000500")
    );
    expect(await stableCoin.totalReserves()).to.equal(
      ethers.parseEther("1999999500")
    );
  });

  it("Should mint tokens successfully by supply controller role", async function () {
    const { supplyControllerRole, stableCoin, otherRole, amountToMint } =
      await loadFixture(deployStableCoinFixture);
    await stableCoin
      .connect(supplyControllerRole)
      .mint(otherRole.address, amountToMint);

    expect(await stableCoin.balanceOf(otherRole.address)).to.equal(
      amountToMint
    );
    expect(await stableCoin.totalSupply()).to.equal(
      ethers.parseEther("1000000500")
    );
    expect(await stableCoin.totalReserves()).to.equal(
      ethers.parseEther("1999999500")
    );
  });

  it("Should not allow others to mint tokens successfully", async function () {
    const { stableCoin, otherRole, amountToMint } = await loadFixture(
      deployStableCoinFixture
    );
    await expect(
      stableCoin.connect(otherRole).mint(otherRole.address, amountToMint)
    ).to.be.revertedWith("Not Authorize to call this function");
  });

  it("Should revert if paused", async function () {
    const { stableCoin, admin, amountToMint, otherRole } = await loadFixture(
      deployStableCoinFixture
    );

    await stableCoin.paused();
    expect(stableCoin.connect(admin).mint(otherRole.address, amountToMint)).to
      .be.revertedWithCustomError;
  });

  it("Should revert if minting exceeds MAX_SUPPLY", async function () {
    const { stableCoin, admin, otherRole } = await loadFixture(
      deployStableCoinFixture
    );

    const maxSupply = await stableCoin.MAX_SUPPLY();
    await expect(
      stableCoin.connect(admin).mint(otherRole.address, maxSupply)
    ).to.be.revertedWith("Mint exceeds MAX_SUPPLY");
  });

  it("Should revert if reserves are insufficient", async function () {
    const { stableCoin, admin, amountToMint, otherRole } = await loadFixture(
      deployStableCoinFixture
    );

    await stableCoin.updateReserves(ethers.parseEther("100"));
    await expect(
      stableCoin.connect(admin).mint(otherRole.address, amountToMint)
    ).to.be.revertedWith("Insufficient reserves");
  });

  it("Should revert if reserve verification fail", async function () {
    const {
      stableCoin,
      admin,
      defaultAdmin,
      amountToMint,
      otherRole,
      reserveAuditor,
    } = await loadFixture(deployStableCoinFixture);

    const recordReserve = ethers.parseEther("10");

    await reserveAuditor.connect(defaultAdmin).recordReserve(recordReserve);
    await expect(
      stableCoin.connect(admin).mint(otherRole.address, amountToMint)
    ).to.be.revertedWith("Reserve verification failed");
  });

  it("Should correctly emit Minted event", async function () {
    const { stableCoin, admin, amountToMint, otherRole } = await loadFixture(
      deployStableCoinFixture
    );

    await stableCoin.updateReserves(ethers.parseEther("1000"));
    await expect(
      stableCoin.connect(admin).mint(otherRole.address, amountToMint)
    ).to.emit(stableCoin, "Minted");
  });

  it("Should deduct the correct amount from reserves", async function () {
    const { stableCoin, admin, amountToMint, otherRole } = await loadFixture(
      deployStableCoinFixture
    );

    await stableCoin.updateReserves(ethers.parseEther("1000"));
    await stableCoin.connect(admin).mint(otherRole.address, amountToMint);
    expect(await stableCoin.totalReserves()).to.equal(ethers.parseEther("500"));
  });
});

describe("Burn Function", function () {
  async function deployStableCoinFixture() {
    const gas = (await ethers.provider.getFeeData()).gasPrice;
    const [defaultAdmin, admin, supplyControllerRole, otherRole, stablecoin] =
      await ethers.getSigners();

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

    const reserveAuditorAddress = await reserveAuditor.getAddress();
    const stableCoin = await upgrades.deployProxy(
      stableCoinContract,
      [defaultAdmin.address, reserveAuditorAddress, defaultAdmin.address],
      {
        gasPrice: gas,
        initializer: "initialize",
      }
    );

    const ADMIN_ROLE = await stableCoin.ADMIN_ROLE();
    await stableCoin.connect(defaultAdmin).grantRole(ADMIN_ROLE, admin.address);

    const SUPPLY_CONTROLLER_ROLE = await stableCoin.SUPPLY_CONTROLLER_ROLE();
    await stableCoin
      .connect(defaultAdmin)
      .grantRole(SUPPLY_CONTROLLER_ROLE, supplyControllerRole.address);

    const amountToBurn = ethers.parseEther("500");
    const totalReserve = ethers.parseEther("1000000000");

    await stableCoin.connect(defaultAdmin).updateReserves(totalReserve);
    await reserveAuditor.connect(defaultAdmin).setStableCoinAddress(stablecoin);
    await reserveAuditor.connect(defaultAdmin).recordReserve(totalReserve);

    return {
      defaultAdmin,
      admin,
      supplyControllerRole,
      otherRole,
      stableCoin,
      reserveAuditor,
      amountToBurn,
    };
  }

  it("Should burn tokens successfully by default admin", async function () {
    const { defaultAdmin, stableCoin, amountToBurn } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(defaultAdmin).burn(amountToBurn);

    expect(await stableCoin.totalSupply()).to.equal(
      ethers.parseEther("999999500")
    );
    expect(await stableCoin.totalReserves()).to.equal(
      ethers.parseEther("1000000500")
    );
  });

  it("Should burn tokens successfully by admin", async function () {
    const { defaultAdmin, admin, stableCoin, amountToBurn } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(defaultAdmin).transfer(admin, amountToBurn);
    await stableCoin.connect(admin).burn(amountToBurn);

    expect(await stableCoin.totalSupply()).to.equal(
      ethers.parseEther("999999500")
    );
    expect(await stableCoin.totalReserves()).to.equal(
      ethers.parseEther("1000000500")
    );
  });

  it("Should burn tokens successfully by supply controller role", async function () {
    const { defaultAdmin, supplyControllerRole, stableCoin, amountToBurn } =
      await loadFixture(deployStableCoinFixture);
    await stableCoin
      .connect(defaultAdmin)
      .transfer(supplyControllerRole, amountToBurn);
    await stableCoin.connect(supplyControllerRole).burn(amountToBurn);

    expect(await stableCoin.totalSupply()).to.equal(
      ethers.parseEther("999999500")
    );
    expect(await stableCoin.totalReserves()).to.equal(
      ethers.parseEther("1000000500")
    );
  });

  it("Should not allow others to burn tokens successfully", async function () {
    const { stableCoin, otherRole, amountToBurn } = await loadFixture(
      deployStableCoinFixture
    );
    await expect(
      stableCoin.connect(otherRole).burn(amountToBurn)
    ).to.be.revertedWith("Not Authorize to call this function");
  });

  it("Should revert if paused", async function () {
    const { stableCoin, admin, amountToBurn } = await loadFixture(
      deployStableCoinFixture
    );

    await stableCoin.paused();
    expect(stableCoin.connect(admin).burn(amountToBurn)).to.be
      .revertedWithCustomError;
  });

  it("Should adjust total supply correctly", async function () {
    const { defaultAdmin, stableCoin, amountToBurn } = await loadFixture(
      deployStableCoinFixture
    );

    await stableCoin.connect(defaultAdmin).burn(amountToBurn);

    expect(await stableCoin.totalSupply()).to.equal(
      ethers.parseEther("999999500")
    );
  });

  it("Should adjust total reserves correctly", async function () {
    const { defaultAdmin, stableCoin, amountToBurn } = await loadFixture(
      deployStableCoinFixture
    );

    await stableCoin.connect(defaultAdmin).burn(amountToBurn);

    expect(await stableCoin.totalReserves()).to.equal(
      ethers.parseEther("1000000500")
    );
  });

  it("Should correctly emit Burned event", async function () {
    const { defaultAdmin, stableCoin, amountToBurn } = await loadFixture(
      deployStableCoinFixture
    );

    await expect(stableCoin
      .connect(defaultAdmin)
      .burn(amountToBurn))
      .to.emit(stableCoin,"Burned");
  });
});
