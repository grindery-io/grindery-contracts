module.exports = {
  CONTRACTS: {
    GRINDERY_BATCH_TRANSFER: 'GrinderyBatchTransfer',
    GRINDERY_DELEGATED_BATCH_TRANSFER: 'GrinderyDelegatedBatchTransfer',
    TEST_TOKEN: 'TestToken',
  },
  ERROR_MESSAGES: {
    INSUFFICIENT_BALANCE: 'Grindery: insufficient balance',
    INSUFFICIENT_TOKEN_BALANCE: 'ERC20: transfer amount exceeds balance',
    INSUFFICIENT_TOKEN_ALLOWANCE: 'ERC20: insufficient allowance',
    MISMATCH_RECIPIENTS_AND_AMOUNTS: 'Grindery: recipients and amounts arrays are not equal length',
    MISMATCH_TOKEN_ADDRESSES_LENGTH: 'Grindery: recipients and tokenAddresses arrays are not equal length and tokenAddresses is not empty',
    NO_RECIPIENTS: 'Grindery: no recipients',
    NOT_OWNER: 'Ownable: caller is not the owner',
    WRONG_ETHER_AMOUNT: 'Grindery: wrong ether amount',
    ZERO_AMOUNT_TRANSFER: 'Grindery: transfer amount is zero',
    ZERO_ADDRESS_RECIPIENT: 'Grindery: recipient is address(0)',
  },
  EVENTS: {
    BATCH_TRANSFER_REQUESTED: 'BatchTransferRequested',
    BATCH_TRANSFER: 'BatchTransfer',
    BATCH_RECOVERED: 'BatchRecovered',
    RECOVERED: 'Recovered',
  },
  GAS_OVERPAY: 1000000,
  MIN_BATCH_SIZE: 5,
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
}