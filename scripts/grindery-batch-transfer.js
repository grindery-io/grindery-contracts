// Deploys the batch transfer contract
const hre = require("hardhat"),
  {deployContract} = require("../utils/deploy"),
  {CONTRACTS} = require("../utils/constants");

async function main() {
  const batchTransfer = await deployContract(CONTRACTS.GRINDERY_BATCH_TRANSFER);
  console.log("BatchTransfer deployed to:", batchTransfer.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
