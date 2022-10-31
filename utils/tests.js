const _ = require("lodash"),
  {BigNumber} = require("ethers"),
  { waffle } = require("hardhat"),
  {deployContract} = require("./deploy"),
  {CONTRACTS, MIN_BATCH_SIZE} = require("./constants");

const getAccountAddress = account => account.address || account;

const getAccountAddresses = accounts => {
  return (accounts || []).map(getAccountAddress);
};

const cleanAmount = amount => typeof amount === "number"?amount:BigNumber.from(amount).toNumber();

const cleanAmounts = amounts => {
  return (amounts || []).map(cleanAmount);
};

const getAmountSum = amounts => {
  return (amounts || []).reduce((x, y) => cleanAmount(x) + cleanAmount(y));
};

const filterMatchingItemsByTokenIndex = (token, items, tokens) => {
  return (items || []).filter((item, idx) => tokens[idx] && tokens[idx].address === token.address)
};

const setUpTokens = async (recipients, amounts, creator) => {
  // Deploy batch test ERC20 tokens and set the corresponding amount for payer
  let tokens = [];
  for (const [idx,] of recipients.entries()) {
    // Parallel deployment via Promise.all leads to reused nonces
    tokens.push(
      await deployContract(
        CONTRACTS.TEST_TOKEN,
        [`Test Token #${idx+1}`, `TKN${idx+1}`, Math.max(amounts[idx], 1000000)],
        creator
      )
    );
  }
  return tokens;
};

const approveTokens = async (address, tokens, amounts) => {
  // Set allowances for address
  let results = [];
  for (const [idx, token] of tokens.entries()) {
    // Parallel approvals via Promise.all leads to reused nonces
    results.push(
      await token.approve(address, amounts[idx])
    );
  }
  return results;
};

const transferTokens = async (address, tokens, amounts) => {
  // Transfer tokens to address
  let results = [];
  for (const [idx, token] of tokens.entries()) {
    // Parallel transfers via Promise.all leads to reused nonces
    results.push(
      await token.transfer(address, amounts[idx])
    );
  }
  return results;
};

const parseBatchSize = () => {
  // Reads batch size from env or sets a default
  const batchSize = process.env.BATCH_SIZE;
  return Math.max(/^\d+$/.test(batchSize) && parseInt(batchSize) || MIN_BATCH_SIZE, MIN_BATCH_SIZE);
};

const generateRecipients = (wallets) => {
  const batchSize = parseBatchSize();
  return _.range(0, batchSize).map(idx => wallets && wallets[idx] || waffle.provider.createEmptyWallet());
};

const generateAmounts = () => {
  const batchSize = parseBatchSize();
  return _.range(0, batchSize).map((idx) => Math.min((idx+1)*10, 100));
};

module.exports = {
  getAccountAddress,
  getAccountAddresses,
  cleanAmount,
  cleanAmounts,
  getAmountSum,
  filterMatchingItemsByTokenIndex,
  setUpTokens,
  approveTokens,
  transferTokens,
  parseBatchSize,
  generateRecipients,
  generateAmounts,
};