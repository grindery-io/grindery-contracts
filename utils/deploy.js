const deployContract = async (name, args, signer) => {
  const Contract = await hre.ethers.getContractFactory(...[
    name,
    ...(signer?[signer]:[]),
  ]);
  const contract = await Contract.deploy(...(args || []));
  await contract.deployed();
  return contract;
};

const deployContracts = async (names) => {
  return Promise.all(
    (names || []).map(name => deployContract(name))
  );
};

module.exports = {
  deployContract,
  deployContracts,
};