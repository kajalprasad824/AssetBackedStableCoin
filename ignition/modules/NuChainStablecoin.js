const { ethers, upgrades } = require("hardhat");

async function main() {
  const gas = (await ethers.provider.getFeeData()).gasPrice;
  const NuChainStablecoin = await ethers.getContractFactory(
    "NuChainStablecoin"
  );
  console.log("Deploying NuChain Stable Coin Smart Contract .......");

  const NuChainStableCoin = await upgrades.deployProxy(
    NuChainStablecoin,
    [
      "Default ADmin Address",
      "Reserve Auditor Adrress",
      "Treasury wallet Address",
    ],
    {
      gasPrice: gas,
      initializer: "initialize",
    }
  );

  await NuChainStableCoin.waitForDeployment();
  console.log(
    "NuChain Stable coin smart contract is deployed at : ",
    await NuChainStableCoin.getAddress()
  );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
