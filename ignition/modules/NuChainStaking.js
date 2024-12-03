const { ethers, upgrades } = require("hardhat");

async function main() {
  const gas = (await ethers.provider.getFeeData()).gasPrice;
  const nuChainStaking = await ethers.getContractFactory("NuChainStaking");

  console.log("Deploying NuChain Staking Smart Contract ........");

  const NuChainStaking = await upgrades.deployProxy(
    nuChainStaking,
    ["0x66DBEEDa3c62c7ad50061B655353f566b63722d1","0x4b6428460Dc6D016f8dcD8DF2612109539DC1562","10","10000000000000000000"],
    {
      gasPrice: gas,
      initializer: "initialize",
    }
  );

  await NuChainStaking.waitForDeployment();
  console.log(
    "NuChain Staking Smart Contract is deployed at : ",
    await NuChainStaking.getAddress()
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
