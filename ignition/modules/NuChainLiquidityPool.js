const { ethers, upgrades } = require("hardhat");

async function main() {
  const gas = (await ethers.provider.getFeeData()).gasPrice;
  const nuChainLiquidityPool = await ethers.getContractFactory(
    "NuChainLiquidityPool"
  );

  console.log("Deploying NuChain Liquidity Pool Smart Contract ........");

  const NuChainLiquidityPool = await upgrades.deployProxy(
    nuChainLiquidityPool,
    [
      "0x4b6428460Dc6D016f8dcD8DF2612109539DC1562",
      "0x66DBEEDa3c62c7ad50061B655353f566b63722d1",
      "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      "300",
      "10000000000000000",
      "200",
    ],
    {
      gasPrice: gas,
      initializer: "initialize",
    }
  );

  await NuChainLiquidityPool.waitForDeployment();
  console.log(
    "NuChain Liquidity Pool Smart Contract is deployed at : ",
    await NuChainLiquidityPool.getAddress()
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
