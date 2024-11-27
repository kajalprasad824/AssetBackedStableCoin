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
      "0x4b6428460Dc6D016f8dcD8DF2612109539DC1562",
      "0xbD7C5d7eE2c48815cd32ed4f1E925BeC1FEC1f37",
      "0x4b6428460Dc6D016f8dcD8DF2612109539DC1562",
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
