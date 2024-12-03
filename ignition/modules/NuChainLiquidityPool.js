const { ethers, upgrades } = require("hardhat");

async function main() {
  const gas = (await ethers.provider.getFeeData()).gasPrice;
  const nuChainLiquidityPool = await ethers.getContractFactory("NuChainLiquidityPool");

  console.log("Deploying NuChain Staking Smart Contract ........");

  const NuChainLiquidityPool = await upgrades.deployProxy(
    nuChainLiquidityPool,
    ["0x4b6428460Dc6D016f8dcD8DF2612109539DC1562","0x66DBEEDa3c62c7ad50061B655353f566b63722d1","0x7611371eAaFF480CfAbDE75ACE1cA8e4beEE47CA","10","10000000000000000","100"],
    {
      gasPrice: gas,
      initializer: "initialize",
    }
  );

  await NuChainLiquidityPool.waitForDeployment();
  console.log(
    "NuChain Staking Smart Contract is deployed at : ",
    await NuChainLiquidityPool.getAddress()
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
