const { ethers, upgrades } = require("hardhat");

async function main() {
  const gas = (await ethers.provider.getFeeData()).gasPrice;
  const reserveAuditor = await ethers.getContractFactory("ReserveAuditor");

  console.log("Deploying Reserve Auditor Smart Contract ........");

  const ReserveAuditor = await upgrades.deployProxy(
    reserveAuditor,
    ["0x4b6428460Dc6D016f8dcD8DF2612109539DC1562"],
    {
      gasPrice: gas,
      initializer: "initialize",
    }
  );

  await ReserveAuditor.waitForDeployment();
  console.log(
    "Reserve Auditor Smart Contract is deployed at : ",
    await ReserveAuditor.getAddress()
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
