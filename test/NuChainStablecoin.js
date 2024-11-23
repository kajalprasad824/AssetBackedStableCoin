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

  it("Should not allow unauthorized users to mint tokens successfully", async function () {
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

  it("Should not allow unauthorized users to burn tokens successfully", async function () {
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

    await expect(stableCoin.connect(defaultAdmin).burn(amountToBurn)).to.emit(
      stableCoin,
      "Burned"
    );
  });
});

describe("Update Reserves", function () {
  async function deployStableCoinFixture() {
    const gas = (await ethers.provider.getFeeData()).gasPrice;
    const [defaultAdmin, admin, otherRole] = await ethers.getSigners();

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

    const reserveAmount = ethers.parseEther("1000000000");

    return {
      defaultAdmin,
      admin,
      otherRole,
      stableCoin,
      reserveAmount,
    };
  }

  it("Should allow default admin to update reserves", async function () {
    const { defaultAdmin, stableCoin, reserveAmount } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(defaultAdmin).updateReserves(reserveAmount);

    expect(await stableCoin.totalReserves()).to.equal(reserveAmount);
  });

  it("Should allow admin to update reserves", async function () {
    const { admin, stableCoin, reserveAmount } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(admin).updateReserves(reserveAmount);

    expect(await stableCoin.totalReserves()).to.equal(reserveAmount);
  });

  it("should not allow unauthorized users to update reserves", async () => {
    const { otherRole, stableCoin, reserveAmount } = await loadFixture(
      deployStableCoinFixture
    );

    await expect(
      stableCoin.connect(otherRole).updateReserves(reserveAmount)
    ).to.be.revertedWith("Not Authorize to call this function");
  });

  it("Should correctly emit ReserveUpdated event", async () => {
    const { stableCoin, reserveAmount } = await loadFixture(
      deployStableCoinFixture
    );

    await expect(stableCoin.updateReserves(reserveAmount)).to.emit(
      stableCoin,
      "ReserveUpdated"
    );
  });

  it("Should revert if new reserves value is zero", async function () {
    const { admin, stableCoin } = await loadFixture(deployStableCoinFixture);
    await expect(
      stableCoin.connect(admin).updateReserves(0)
    ).to.be.revertedWith("New Reserve value can't be equal to zero");
  });

  it("Should allow repeated updates to reserves with valid values", async function () {
    const { admin, stableCoin, reserveAmount } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(admin).updateReserves(reserveAmount);
    expect(await stableCoin.totalReserves()).to.equal(reserveAmount);

    const reserveAmount2 = ethers.parseEther("600");
    await stableCoin.connect(admin).updateReserves(reserveAmount2);
    expect(await stableCoin.totalReserves()).to.equal(reserveAmount2);
  });
});

describe("Set Reserve Ratio Function", function () {
  async function deployStableCoinFixture() {
    const gas = (await ethers.provider.getFeeData()).gasPrice;
    const [defaultAdmin, admin, otherRole] = await ethers.getSigners();

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

    const reserveRatio = ethers.parseEther("1");

    return {
      defaultAdmin,
      admin,
      otherRole,
      stableCoin,
      reserveRatio,
    };
  }

  it("Should allow default admin to update reserves", async function () {
    const { defaultAdmin, stableCoin, reserveRatio } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(defaultAdmin).setReserveRatio(reserveRatio);

    expect(await stableCoin.reserveRatio()).to.equal(reserveRatio);
  });

  it("Should allow admin to update reserves", async function () {
    const { admin, stableCoin, reserveRatio } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(admin).setReserveRatio(reserveRatio);

    expect(await stableCoin.reserveRatio()).to.equal(reserveRatio);
  });

  it("should not allow unauthorized users to update reserves", async () => {
    const { otherRole, stableCoin, reserveRatio } = await loadFixture(
      deployStableCoinFixture
    );

    await expect(
      stableCoin.connect(otherRole).setReserveRatio(reserveRatio)
    ).to.be.revertedWith("Not Authorize to call this function");
  });

  it("Should correctly emit ReserveRatioUpdated event", async () => {
    const { stableCoin, reserveRatio } = await loadFixture(
      deployStableCoinFixture
    );

    await expect(stableCoin.setReserveRatio(reserveRatio)).to.emit(
      stableCoin,
      "ReserveRatioUpdated"
    );
  });

  it("should not allow setting the reserve ratio to zero", async function () {
    const { admin, stableCoin } = await loadFixture(deployStableCoinFixture);
    await expect(
      stableCoin.connect(admin).setReserveRatio(0)
    ).to.be.revertedWith("Reserve ratio must be greater than zero");
  });

  it("Should allow repeated valid updates to the reserve ratio", async function () {
    const { admin, stableCoin, reserveRatio } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(admin).setReserveRatio(reserveRatio);
    expect(await stableCoin.reserveRatio()).to.equal(reserveRatio);

    const reserveRatio2 = ethers.parseEther("0.5");
    await stableCoin.connect(admin).setReserveRatio(reserveRatio2);
    expect(await stableCoin.reserveRatio()).to.equal(reserveRatio2);
  });
});

describe("Freeze Function", function () {
  async function deployStableCoinFixture() {
    const gas = (await ethers.provider.getFeeData()).gasPrice;
    const [defaultAdmin, admin, assetProtectionRole, otherRole, addr1, addr2] =
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

    const ASSET_PROTECTION_ROLE = await stableCoin.ASSET_PROTECTION_ROLE();
    await stableCoin
      .connect(defaultAdmin)
      .grantRole(ASSET_PROTECTION_ROLE, assetProtectionRole.address);

    return {
      defaultAdmin,
      admin,
      otherRole,
      addr1,
      addr2,
      stableCoin,
      assetProtectionRole,
    };
  }

  it("Should allow default admin to freeze account", async function () {
    const { defaultAdmin, stableCoin, addr1 } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(defaultAdmin).freeze(addr1.address);

    expect(await stableCoin._frozen(addr1.address)).to.be.true;
  });

  it("Should allow admin to freeze account", async function () {
    const { admin, stableCoin, addr1 } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(admin).freeze(addr1.address);

    expect(await stableCoin._frozen(addr1.address)).to.be.true;
  });

  it("Should allow asset protector role to freeze account", async function () {
    const { assetProtectionRole, stableCoin, addr1 } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(assetProtectionRole).freeze(addr1.address);

    expect(await stableCoin._frozen(addr1.address)).to.be.true;
  });

  it("should not allow unauthorized users to freeze account", async () => {
    const { otherRole, stableCoin, addr1 } = await loadFixture(
      deployStableCoinFixture
    );

    await expect(
      stableCoin.connect(otherRole).freeze(addr1.address)
    ).to.be.revertedWith("Not Authorize to call this function");
  });

  it("Should correctly emit AddressFrozen event", async () => {
    const { stableCoin, addr1 } = await loadFixture(deployStableCoinFixture);

    await expect(stableCoin.freeze(addr1.address)).to.emit(
      stableCoin,
      "AddressFrozen"
    );
  });

  it("should not allow freezing an already frozen account", async function () {
    const { admin, stableCoin, addr1 } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(admin).freeze(addr1.address);
    await expect(
      stableCoin.connect(admin).freeze(addr1.address)
    ).to.be.revertedWith("Account already frozen");
  });

  it("Should handle freezing multiple accounts correctly", async function () {
    const { admin, stableCoin, addr1, addr2 } = await loadFixture(
      deployStableCoinFixture
    );

    await stableCoin.connect(admin).freeze(addr1.address);
    await stableCoin.connect(admin).freeze(addr2.address);

    expect(await stableCoin._frozen(addr1.address)).to.be.true;
    expect(await stableCoin._frozen(addr2.address)).to.be.true;
  });
});

describe("Unfreeze Function", function () {
  async function deployStableCoinFixture() {
    const gas = (await ethers.provider.getFeeData()).gasPrice;
    const [defaultAdmin, admin, assetProtectionRole, otherRole, addr1, addr2] =
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

    const ASSET_PROTECTION_ROLE = await stableCoin.ASSET_PROTECTION_ROLE();
    await stableCoin
      .connect(defaultAdmin)
      .grantRole(ASSET_PROTECTION_ROLE, assetProtectionRole.address);

    return {
      defaultAdmin,
      admin,
      otherRole,
      addr1,
      addr2,
      stableCoin,
      assetProtectionRole,
    };
  }

  it("Should allow default admin to unfreeze account", async function () {
    const { defaultAdmin, stableCoin, addr1 } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(defaultAdmin).freeze(addr1.address);
    expect(await stableCoin._frozen(addr1.address)).to.be.true;
    await stableCoin.connect(defaultAdmin).unfreeze(addr1.address);

    expect(await stableCoin._frozen(addr1.address)).to.be.false;
  });

  it("Should allow admin to unfreeze account", async function () {
    const { admin, stableCoin, addr1 } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(admin).freeze(addr1.address);
    expect(await stableCoin._frozen(addr1.address)).to.be.true;
    await stableCoin.connect(admin).unfreeze(addr1.address);

    expect(await stableCoin._frozen(addr1.address)).to.be.false;
  });

  it("Should allow asset protector role to unfreeze account", async function () {
    const { assetProtectionRole, stableCoin, addr1 } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(assetProtectionRole).freeze(addr1.address);
    expect(await stableCoin._frozen(addr1.address)).to.be.true;
    await stableCoin.connect(assetProtectionRole).unfreeze(addr1.address);

    expect(await stableCoin._frozen(addr1.address)).to.be.false;
  });

  it("should not allow unauthorized users to unfreeze account", async () => {
    const { admin, otherRole, stableCoin, addr1 } = await loadFixture(
      deployStableCoinFixture
    );

    await stableCoin.connect(admin).freeze(addr1.address);
    expect(await stableCoin._frozen(addr1.address)).to.be.true;
    await expect(
      stableCoin.connect(otherRole).unfreeze(addr1.address)
    ).to.be.revertedWith("Not Authorize to call this function");
  });

  it("Should correctly emit AddressUnfrozen event", async () => {
    const {admin, stableCoin, addr1 } = await loadFixture(deployStableCoinFixture);

    await stableCoin.connect(admin).freeze(addr1.address);
    await expect(stableCoin.unfreeze(addr1.address)).to.emit(
      stableCoin,
      "AddressUnfrozen"
    );
  });

  it("Should not allow unfreezing an account that is not frozen", async function () {
    const { admin, stableCoin, addr1 } = await loadFixture(
      deployStableCoinFixture
    );
    
    await expect(
      stableCoin.connect(admin).unfreeze(addr1.address)
    ).to.be.revertedWith("Account is not frozen");
  });

  it("Should handle unfreezing multiple accounts correctly", async function () {
    const { admin, stableCoin, addr1, addr2 } = await loadFixture(
      deployStableCoinFixture
    );

    await stableCoin.connect(admin).freeze(addr1.address);
    await stableCoin.connect(admin).freeze(addr2.address);

    expect(await stableCoin._frozen(addr1.address)).to.be.true;
    expect(await stableCoin._frozen(addr2.address)).to.be.true;

    await stableCoin.connect(admin).unfreeze(addr1.address);
    await stableCoin.connect(admin).unfreeze(addr2.address);

    expect(await stableCoin._frozen(addr1.address)).to.be.false;
    expect(await stableCoin._frozen(addr2.address)).to.be.false;
  });
});

describe("Wipe Frozen Address Function", function () {
  async function deployStableCoinFixture() {
    const gas = (await ethers.provider.getFeeData()).gasPrice;
    const [defaultAdmin, admin, assetProtectionRole, otherRole, addr1, addr2] =
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

    const ASSET_PROTECTION_ROLE = await stableCoin.ASSET_PROTECTION_ROLE();
    await stableCoin
      .connect(defaultAdmin)
      .grantRole(ASSET_PROTECTION_ROLE, assetProtectionRole.address);

      await stableCoin.connect(defaultAdmin).transfer(addr1.address,1000000000000);
      await stableCoin.connect(defaultAdmin).freeze(addr1.address);

    return {
      defaultAdmin,
      admin,
      otherRole,
      addr1,
      addr2,
      stableCoin,
      assetProtectionRole,
    };
  }

  it("Should allow default admin to wipe a frozen account", async function () {
    const { defaultAdmin, stableCoin, addr1 } = await loadFixture(
      deployStableCoinFixture
    );
    const balance = await stableCoin.balanceOf(addr1.address);
    const totalSupply = await stableCoin.totalSupply();
    const remainTotalSupply =  totalSupply - balance;
    await stableCoin.connect(defaultAdmin).wipeFrozenAddress(addr1.address);

    expect(await stableCoin.balanceOf(addr1.address)).to.equal(0);
    expect(await stableCoin.totalSupply()).to.equal(remainTotalSupply);
    
  });

  it("Should allow admin to wipe a frozen account", async function () {
    const { admin, stableCoin, addr1 } = await loadFixture(
      deployStableCoinFixture
    );
    const balance = await stableCoin.balanceOf(addr1.address);
    const totalSupply = await stableCoin.totalSupply();
    const remainTotalSupply =  totalSupply - balance;
    await stableCoin.connect(admin).wipeFrozenAddress(addr1.address);

    expect(await stableCoin.balanceOf(addr1.address)).to.equal(0);
    expect(await stableCoin.totalSupply()).to.equal(remainTotalSupply);
  });

  it("Should allow asset protector role to wipe a frozen account", async function () {
    const { assetProtectionRole, stableCoin, addr1 } = await loadFixture(
      deployStableCoinFixture
    );
    const balance = await stableCoin.balanceOf(addr1.address);
    const totalSupply = await stableCoin.totalSupply();
    const remainTotalSupply =  totalSupply - balance;
    await stableCoin.connect(assetProtectionRole).wipeFrozenAddress(addr1.address);

    expect(await stableCoin.balanceOf(addr1.address)).to.equal(0);
    expect(await stableCoin.totalSupply()).to.equal(remainTotalSupply);
  });

  it("should not allow unauthorized users to wipe a frozen account", async () => {
    const { otherRole, stableCoin, addr1 } = await loadFixture(
      deployStableCoinFixture
    );

    await expect (stableCoin.connect(otherRole).wipeFrozenAddress(addr1.address)).to.be.revertedWith("Not Authorize to call this function");

  });

  it("Should correctly emit FrozenAddressWiped  event", async () => {
    const {stableCoin, addr1 } = await loadFixture(deployStableCoinFixture);
    
    await expect(stableCoin.wipeFrozenAddress(addr1.address)).to.emit(
      stableCoin,
      "FrozenAddressWiped"
    );
  });

  it("Should not allow wiping an account that is not frozen", async function () {
    const { admin, stableCoin, addr2 } = await loadFixture(
      deployStableCoinFixture
    );
    
    await expect(
      stableCoin.connect(admin).wipeFrozenAddress(addr2.address)
    ).to.be.revertedWith("Account is not frozen");
  });

  it("Should correctly reduce total supply when wiping a frozen account", async function () {
    const { assetProtectionRole, stableCoin, addr1 } = await loadFixture(
      deployStableCoinFixture
    );
    const balance = await stableCoin.balanceOf(addr1.address);
    const totalSupply = await stableCoin.totalSupply();
    const remainTotalSupply =  totalSupply - balance;
    await stableCoin.connect(assetProtectionRole).wipeFrozenAddress(addr1.address);

    expect(await stableCoin.totalSupply()).to.equal(remainTotalSupply);
  });

});

describe("Set Transaction Fee Function", function () {
  async function deployStableCoinFixture() {
    const gas = (await ethers.provider.getFeeData()).gasPrice;
    const [defaultAdmin, admin, treasuryRole, otherRole] =
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

    const TREASURY_ROLE = await stableCoin.TREASURY_ROLE();
    await stableCoin
      .connect(defaultAdmin)
      .grantRole(TREASURY_ROLE, treasuryRole.address);

    return {
      defaultAdmin,
      admin,
      otherRole,
      stableCoin,
      treasuryRole,
    };
  }

  it("Should allow default admin to set transaction fee", async function () {
    const { defaultAdmin, stableCoin } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(defaultAdmin).setTransactionFee(500);
    expect (await stableCoin.transactionFeePercentage()).to.equal(500);
    
  });

  it("Should allow admin to set transaction fee", async function () {
    const { admin, stableCoin } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(admin).setTransactionFee(500);
    expect (await stableCoin.transactionFeePercentage()).to.equal(500);
  });

  it("Should allow treasury role to set transaction fee", async function () {
    const { treasuryRole, stableCoin } = await loadFixture(
      deployStableCoinFixture
    );
    await stableCoin.connect(treasuryRole).setTransactionFee(500);
    expect (await stableCoin.transactionFeePercentage()).to.equal(500);
  });

  it("should not allow unauthorized users to set transaction fee", async () => {
    const { otherRole, stableCoin } = await loadFixture(
      deployStableCoinFixture
    );

    await expect (stableCoin.connect(otherRole).setTransactionFee(500)).to.be.revertedWith("Not Authorize to call this function");

  });

  it("Should correctly emit FeePercentageUpdated  event", async () => {
    const {stableCoin } = await loadFixture(deployStableCoinFixture);
    
    await expect(stableCoin.setTransactionFee(500)).to.emit(
      stableCoin,
      "FeePercentageUpdated"
    );
  });

  it("should revert if fee percentage is greater than 10%", async () => {
    const {stableCoin } = await loadFixture(
      deployStableCoinFixture
    );

    await expect (stableCoin.setTransactionFee(10000)).to.be.revertedWith("Fee cannot exceed 10%");

  });

  it("Should correctly update transaction fee percentage", async function () {
    const { treasuryRole, stableCoin } = await loadFixture(
      deployStableCoinFixture
    );
    
    await stableCoin.connect(treasuryRole).setTransactionFee(500);
    expect (await stableCoin.transactionFeePercentage()).to.equal(500);
  });

});
