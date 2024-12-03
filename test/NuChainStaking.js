const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("MyToken and NuChainStaking Contracts", function () {
  async function deployFixture() {
    const gas = (await ethers.provider.getFeeData()).gasPrice;
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const reserveAuditorContract = await ethers.getContractFactory(
      "ReserveAuditor"
    );
    const reserveAuditor = await upgrades.deployProxy(
      reserveAuditorContract,
      [owner.address],
      {
        gasPrice: gas,
        initializer: "initialize",
      }
    );

    const mytoken = await ethers.getContractFactory("NuChainStablecoin");

    const MyToken = await upgrades.deployProxy(
      mytoken,
      [owner.address, reserveAuditor.target, owner.address],
      {
        gasPrice: gas,
        initializer: "initialize",
      }
    );

    const nuchainStacking = await ethers.getContractFactory("NuChainStaking");

    const NuChainStaking = await upgrades.deployProxy(
      nuchainStacking,
      [MyToken.target, owner.address, "100000", ethers.parseEther("10")],
      {
        gasPrice: gas,
        initializer: "initialize",
      }
    );

    await MyToken.approve(NuChainStaking.target, ethers.parseEther("10000000"));

    return { MyToken, NuChainStaking, owner, addr1, addr2, addr3 };
  }

  describe("NuChainStaking Contract", function () {
    it("Should deploy correctly with the correct admin role assigned", async function () {
      const { NuChainStaking, owner } = await loadFixture(deployFixture);

      const adminRole = await NuChainStaking.DEFAULT_ADMIN_ROLE();
      expect(await NuChainStaking.hasRole(adminRole, owner.address)).to.be.true;
    });

    it("Should set the correct staking token address", async function () {
      const { NuChainStaking, MyToken } = await loadFixture(deployFixture);

      const stakingTokenAddress = await NuChainStaking.stakingToken();
      expect(stakingTokenAddress).to.equal(MyToken.target);
    });

    it("Should allow the admin to update the reward rate multiple times", async function () {
      const { NuChainStaking } = await loadFixture(deployFixture);

      let newRewardRate = 10;
      await expect(NuChainStaking.updateRewardRate(newRewardRate))
        .to.emit(NuChainStaking, "RewardRateUpdated")
        .withArgs(newRewardRate);

      expect(await NuChainStaking.rewardRatePerDay()).to.equal(newRewardRate);

      newRewardRate = 100;
      await expect(NuChainStaking.updateRewardRate(newRewardRate))
        .to.emit(NuChainStaking, "RewardRateUpdated")
        .withArgs(newRewardRate);

      expect(await NuChainStaking.rewardRatePerDay()).to.equal(newRewardRate);
    });

    it("Should allow the admin to update the minimumTransactionAmount multiple times", async function () {
      const { NuChainStaking } = await loadFixture(deployFixture);

      let minAmount = 10; // 10$
      let minimumTransactionAmount = ethers.parseEther("10");
      await expect(NuChainStaking.updateTransactionAmount(minAmount))
        .to.emit(NuChainStaking, "MinimumTransactionAmountUpdated")
        .withArgs(minAmount);

      expect(await NuChainStaking.minTransactionAmount()).to.equal(
        minimumTransactionAmount
      );

      minAmount = 100; // 100$
      minimumTransactionAmount = ethers.parseEther("100");
      await expect(NuChainStaking.updateTransactionAmount(minAmount))
        .to.emit(NuChainStaking, "MinimumTransactionAmountUpdated")
        .withArgs(minAmount);

      expect(await NuChainStaking.minTransactionAmount()).to.equal(
        minimumTransactionAmount
      );
    });

    it("Should revert if a non-admin tries to update the reward rate and minimumTransactionAmount", async function () {
      const { NuChainStaking, addr1 } = await loadFixture(deployFixture);

      const newRewardRate = 10;
      const minAmount = 100;

      // Correct custom error for access control
      await expect(
        NuChainStaking.connect(addr1).updateRewardRate(newRewardRate)
      )
        .to.be.revertedWithCustomError(
          NuChainStaking,
          "AccessControlUnauthorizedAccount"
        )
        .withArgs(addr1.address, await NuChainStaking.DEFAULT_ADMIN_ROLE());

      await expect(
        NuChainStaking.connect(addr1).updateTransactionAmount(minAmount)
      )
        .to.be.revertedWithCustomError(
          NuChainStaking,
          "AccessControlUnauthorizedAccount"
        )
        .withArgs(addr1.address, await NuChainStaking.DEFAULT_ADMIN_ROLE());
    });
  });

  describe("Stacking Tokens", function () {
    it("Should allow staking tokens", async function () {
      const { NuChainStaking, MyToken, owner } = await deployFixture();

      const stakeAmount = ethers.parseEther("500");

      // Approve tokens for staking
      await MyToken.approve(NuChainStaking.target, stakeAmount);

      // Stake tokens
      await expect(NuChainStaking.stake(stakeAmount))
        .to.emit(NuChainStaking, "Staked")
        .withArgs(owner.address, stakeAmount);

      const stakerInfo = await NuChainStaking.stakers(owner.address);
      expect(stakerInfo.amount).to.equal(stakeAmount);
    });

    it("Should handle multiple staking transactions", async function () {
      const { NuChainStaking, owner } = await deployFixture();

      const firstStakeAmount = ethers.parseEther("200");
      const secondStakeAmount = ethers.parseEther("300");

      // First staking transaction
      await NuChainStaking.stake(firstStakeAmount);
      const firstStakerInfo = await NuChainStaking.stakers(owner.address);
      expect(firstStakerInfo.amount).to.equal(firstStakeAmount);

      // Second staking transaction
      await NuChainStaking.stake(secondStakeAmount);
      const secondStakerInfo = await NuChainStaking.stakers(owner.address);
      expect(secondStakerInfo.amount).to.equal(
        firstStakeAmount + secondStakeAmount
      );
    });

    it("Should calculate and claim rewards correctly", async function () {
      const { NuChainStaking, MyToken, owner } = await deployFixture();

      const stakeAmount = ethers.parseEther("500");
      const rewardRatePerDay = 100000; // Reward rate (100% daily)

      // Stake tokens
      await NuChainStaking.stake(stakeAmount);

      // Simulate passage of time (1 day)
      await ethers.provider.send("evm_increaseTime", [86400]); // 86400 seconds = 1 day
      await ethers.provider.send("evm_mine");

      // Check pending rewards
      const stakerInfoBefore = await NuChainStaking.stakers(owner.address);
      const expectedReward =
        stakerInfoBefore.amount * BigInt(rewardRatePerDay / 100000); // Using BigNumber operations
      const pendingRewards = await NuChainStaking.viewPendingReward(
        owner.address
      );

      // Validate pending rewards
      expect(pendingRewards).to.equal(expectedReward);

      // Claim reward
      const ownerBalanceBefore = await MyToken.balanceOf(owner.address);
      await NuChainStaking.claimReward();
      const ownerBalanceAfter = await MyToken.balanceOf(owner.address);

      // Validate rewards added to owner's balance
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(expectedReward);

      // Validate that pending rewards are reset
      const pendingRewardsAfterClaim = await NuChainStaking.viewPendingReward(
        owner.address
      );
      expect(pendingRewardsAfterClaim).to.equal(0);
    });

    it("Should allow withdrawal of staked tokens", async function () {
      const { NuChainStaking, MyToken, owner } = await deployFixture();

      const stakeAmount = ethers.parseEther("500");

      // Stake tokens
      await NuChainStaking.stake(stakeAmount);

      // Fetch the owner's token balance before withdrawal
      const initialBalance = await MyToken.balanceOf(owner.address);

      // Withdraw staked tokens
      await expect(NuChainStaking.withdraw(stakeAmount))
        .to.emit(NuChainStaking, "Withdrawn")
        .withArgs(owner.address, stakeAmount);

      // Validate staker info is reset
      const stakerInfo = await NuChainStaking.stakers(owner.address);
      expect(stakerInfo.amount).to.equal(0); // All tokens withdrawn

      // Validate the final balance
      const finalBalance = await MyToken.balanceOf(owner.address);
      expect(finalBalance).to.equal(initialBalance + stakeAmount); // Balance restored correctly
    });

    it("Should fail if staking amount is below the minimum transaction amount", async function () {
      const { NuChainStaking, MyToken, owner } = await deployFixture();

      const stakeAmount = ethers.parseEther("5"); // Below minTransactionAmount (10 tokens)

      await MyToken.approve(NuChainStaking.target, stakeAmount);

      await expect(NuChainStaking.stake(stakeAmount)).to.be.revertedWith(
        "Amount too low"
      );
    });

    it("Should update reward rate and transaction amount by admin", async function () {
      const { NuChainStaking, owner } = await deployFixture();

      const newRewardRate = 500; // 50%
      const newTransactionAmount = 20;

      // Update reward rate
      await NuChainStaking.updateRewardRate(newRewardRate);
      expect(await NuChainStaking.rewardRatePerDay()).to.equal(newRewardRate);

      // Update transaction amount
      await NuChainStaking.updateTransactionAmount(newTransactionAmount);
      expect(await NuChainStaking.minTransactionAmount()).to.equal(
        ethers.parseEther("20")
      );
    });
  });

  describe("Withdrawing Tokens", function () {
    it("Should allow withdrawal of staked tokens", async function () {
      const { NuChainStaking, owner } = await loadFixture(deployFixture);
      const stakeAmount = ethers.parseEther("500");

      // Stake tokens first
      await NuChainStaking.stake(stakeAmount);

      // Now withdraw tokens
      await expect(NuChainStaking.withdraw(stakeAmount))
        .to.emit(NuChainStaking, "Withdrawn")
        .withArgs(owner.address, stakeAmount);

      const stakerInfo = await NuChainStaking.stakers(owner.address);
      expect(stakerInfo.amount).to.equal(0);
    });

    it("Should revert when attempting to withdraw more than staked amount", async function () {
      const { NuChainStaking } = await loadFixture(deployFixture);
      const stakeAmount = ethers.parseEther("500");
      const withdrawAmount = ethers.parseEther("600");

      // Stake tokens first
      await NuChainStaking.stake(stakeAmount);

      // Attempt to withdraw more than staked amount
      await expect(NuChainStaking.withdraw(withdrawAmount)).to.be.revertedWith(
        "Insufficient balance"
      );
    });

    it("Should revert when attempting to withdraw without staking", async function () {
      const { NuChainStaking, owner } = await loadFixture(deployFixture);
      const withdrawAmount = ethers.parseEther("500");

      // Attempt to withdraw without staking
      await expect(NuChainStaking.withdraw(withdrawAmount)).to.be.revertedWith(
        "Insufficient balance"
      );
    });

    it("Should allow partial withdrawal of staked tokens", async function () {
      const { NuChainStaking, owner } = await loadFixture(deployFixture);
      const stakeAmount = ethers.parseEther("500");
      const partialWithdrawAmount = ethers.parseEther("300");

      // Stake tokens first
      await NuChainStaking.stake(stakeAmount);

      // Now withdraw partial tokens
      await expect(NuChainStaking.withdraw(partialWithdrawAmount))
        .to.emit(NuChainStaking, "Withdrawn")
        .withArgs(owner.address, partialWithdrawAmount);

      const stakerInfo = await NuChainStaking.stakers(owner.address);
      expect(stakerInfo.amount).to.equal(ethers.parseEther("200")); // Remaining stake is 200
    });

    it("Should revert when withdrawing zero amount", async function () {
      const { NuChainStaking, owner } = await loadFixture(deployFixture);
      const stakeAmount = ethers.parseEther("500");

      // Stake tokens first
      await NuChainStaking.stake(stakeAmount);

      // Attempt to withdraw zero tokens
      await expect(NuChainStaking.withdraw(0)).to.be.revertedWith(
        "Amount too low"
      );
    });

    it("Should allow withdrawal after staking multiple times", async function () {
      const { NuChainStaking, owner } = await loadFixture(deployFixture);
      const stakeAmount1 = ethers.parseEther("300");
      const stakeAmount2 = ethers.parseEther("200");
      const totalStake = stakeAmount1 + stakeAmount2;

      // Stake tokens twice
      await NuChainStaking.stake(stakeAmount1);
      await NuChainStaking.stake(stakeAmount2);

      // Now withdraw all tokens
      await expect(NuChainStaking.withdraw(totalStake))
        .to.emit(NuChainStaking, "Withdrawn")
        .withArgs(owner.address, totalStake);

      const stakerInfo = await NuChainStaking.stakers(owner.address);
      expect(stakerInfo.amount).to.equal(0);
    });

    it("Should emit Withdrawn event on withdrawal", async function () {
      const { NuChainStaking, owner } = await loadFixture(deployFixture);
      const stakeAmount = ethers.parseEther("500");

      // Stake tokens first
      await NuChainStaking.stake(stakeAmount);

      // Now withdraw tokens and check for event
      await expect(NuChainStaking.withdraw(stakeAmount))
        .to.emit(NuChainStaking, "Withdrawn")
        .withArgs(owner.address, stakeAmount);
    });

    it("Should handle multiple different withdrawal amounts correctly", async function () {
      const { NuChainStaking, owner } = await loadFixture(deployFixture);
      const stakeAmount1 = ethers.parseEther("100");
      const stakeAmount2 = ethers.parseEther("200");
      const stakeAmount3 = ethers.parseEther("300");

      // Stake different amounts
      await NuChainStaking.stake(stakeAmount1);
      await NuChainStaking.stake(stakeAmount2);
      await NuChainStaking.stake(stakeAmount3);

      // Now withdraw first amount
      await expect(NuChainStaking.withdraw(stakeAmount1))
        .to.emit(NuChainStaking, "Withdrawn")
        .withArgs(owner.address, stakeAmount1);

      // Withdraw second amount
      await expect(NuChainStaking.withdraw(stakeAmount2))
        .to.emit(NuChainStaking, "Withdrawn")
        .withArgs(owner.address, stakeAmount2);

      // Withdraw remaining amount
      await expect(NuChainStaking.withdraw(stakeAmount3))
        .to.emit(NuChainStaking, "Withdrawn")
        .withArgs(owner.address, stakeAmount3);

      const stakerInfo = await NuChainStaking.stakers(owner.address);
      expect(stakerInfo.amount).to.equal(0);
    });
  });

  describe("Pending Rewards", function () {
    it("Should return correct pending reward for a staked amount", async function () {
      const { NuChainStaking, stakingToken, owner } = await loadFixture(
        deployFixture
      );
      const stakeAmount = ethers.parseEther("500");

      await NuChainStaking.stake(stakeAmount);
      await ethers.provider.send("evm_increaseTime", [86400]); // Increase time by 1 day
      await ethers.provider.send("evm_mine", []);

      const pendingReward = await NuChainStaking.viewPendingReward(
        owner.address
      );
      expect(pendingReward).to.be.gt(0); // Assert there is some pending reward
    });

    it("Should return zero pending reward for users with no stakes", async function () {
      const { NuChainStaking, owner } = await loadFixture(deployFixture);

      const pendingReward = await NuChainStaking.viewPendingReward(
        owner.address
      );
      expect(pendingReward).to.equal(0);
    });

    it("Should return correct pending reward after staking but before claiming", async function () {
      const { NuChainStaking, owner } = await loadFixture(deployFixture);
      const stakeAmount = ethers.parseEther("500");

      await NuChainStaking.stake(stakeAmount);
      await ethers.provider.send("evm_increaseTime", [86400]); // Increase time by 1 day
      await ethers.provider.send("evm_mine", []);

      const pendingReward = await NuChainStaking.viewPendingReward(
        owner.address
      );
      expect(pendingReward).to.be.gt(0); // Assert that some reward is pending
    });

    it("Should return correct pending reward after withdrawal", async function () {
      const { NuChainStaking, owner, MyToken } = await loadFixture(
        deployFixture
      );
      const stakeAmount = ethers.parseEther("500");
      const withdrawAmount = ethers.parseEther("300");

      // Transfer tokens to the contract to ensure it has enough balance for reward payouts
      await MyToken.transfer(NuChainStaking.target, ethers.parseEther("1000")); // Transfer tokens to contract for staking

      // Stake tokens
      await NuChainStaking.stake(stakeAmount);

      // Increase time by 1 day to accumulate rewards
      await ethers.provider.send("evm_increaseTime", [86400]); // Increase time by 1 day
      await ethers.provider.send("evm_mine", []); // Mine a new block

      const pendingRewardBefore = await NuChainStaking.viewPendingReward(
        owner.address
      );

      // Withdraw part of the staked amount
      await NuChainStaking.withdraw(withdrawAmount);

      const pendingRewardAfter = await NuChainStaking.viewPendingReward(
        owner.address
      );

      // Assert the pending reward is calculated correctly before and after withdrawal
      expect(pendingRewardBefore).to.be.gt(0);
      expect(pendingRewardAfter).to.equal(0);
    });

    it("Should correctly reflect pending reward after partial withdrawal", async function () {
      const { NuChainStaking, owner, MyToken } = await loadFixture(
        deployFixture
      );
      const stakeAmount = ethers.parseEther("7000");

      // Transfer tokens to the contract to ensure it has enough balance for reward payouts
      await MyToken.transfer(NuChainStaking.target, ethers.parseEther("1000")); // Transfer tokens to contract for staking

      await NuChainStaking.stake(stakeAmount);

      await ethers.provider.send("evm_increaseTime", [86400]); // Increase time by 1 day
      await ethers.provider.send("evm_mine", []);

      const pendingRewardBefore = await NuChainStaking.viewPendingReward(
        owner.address
      );

      // Withdraw part of the staked amount
      const withdrawAmount = ethers.parseEther("100");

      await NuChainStaking.withdraw(withdrawAmount);

      const pendingRewardAfter = await NuChainStaking.viewPendingReward(
        owner.address
      );
      expect(pendingRewardAfter).to.be.lt(pendingRewardBefore);
    });
  });
});
