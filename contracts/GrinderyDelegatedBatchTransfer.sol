// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./base/Receivable.sol";
import "./base/BatchTransferable.sol";
import "./base/BatchRecoverable.sol";

/**
 * @title GrinderyDelegatedBatchTransfer
 * @dev Implementation of batch transfer of received ether and pre-approved ERC20 tokens to multiple recipients
 */
contract GrinderyDelegatedBatchTransfer is Ownable, BatchTransferable, Receivable, BatchRecoverable {
  // @dev Recipients
  address[] public recipients;

  // @dev Amounts
  uint256[] public amounts;

  // @dev Token Addresses
  address[] public tokenAddresses;

  /**
   * @dev Emitted when a batch transfer of ether and pre-approved ERC20 tokens to `recipients`
   * according to `amounts` and `tokenAddresses` (0x0 for ether) is requested by `account`
   */
  event BatchTransferRequested(address indexed account, address[] recipients, uint256[] amounts, address[] tokenAddresses);

  /**
   * @dev Sets `recipients`, `amounts` and `tokenAddresses`
   *
   * Emits a {BatchTransferRequested} event
   *
   * Requirements:
   * - See {BatchTransferable.isValidBatchTransfer} for requirements
   */
  constructor(address[] memory _recipients, uint256[] memory _amounts, address[] memory _tokenAddresses) isValidBatchTransfer(_recipients, _amounts, _tokenAddresses) {
    recipients = _recipients;
    amounts = _amounts;
    tokenAddresses = _tokenAddresses;

    emit BatchTransferRequested(msg.sender, _recipients, _amounts, _tokenAddresses);
  }

  /**
   * @dev Throws if all tokens have sufficient balance to complete the batch transfer
   */
  modifier isRecoverable() {
    bool hasAnyInsufficientBalance = false;

    // Copy amounts and tokenAddresses into memory to save gas due to multiple reads
    uint256[] memory mAmounts = amounts;
    address[] memory mTokenAddresses = tokenAddresses;
    uint numTokenAddresses = tokenAddresses.length;

    if (numTokenAddresses > 0) {
      for (uint i; i < numTokenAddresses; i++) {
        address token = mTokenAddresses[i];
        if (_balance(token) < _getTokenTotal(token, mAmounts, mTokenAddresses)) {
          hasAnyInsufficientBalance = true;
        }
      }
    } else {
      if (address(this).balance < _getTokenTotal(address(0), mAmounts, mTokenAddresses)) {
        hasAnyInsufficientBalance = true;
      }
    }
    require(hasAnyInsufficientBalance, "Grindery: not recoverable");
    _;
  }

  /**
   * @dev Returns length of recipients array
   */
  function getRecipientsLength() public view returns (uint) {
    return recipients.length;
  }

  /**
   * @dev Returns length of amounts array
   */
  function getAmountsLength() public view returns (uint) {
    return amounts.length;
  }

  /**
   * @dev Returns length of tokenAddresses array
   */
  function getTokenAddressesLength() public view returns (uint) {
    return tokenAddresses.length;
  }

  /**
   * @dev Returns recipients array
   */
  function getRecipients() public view returns (address[] memory) {
    return recipients;
  }

  /**
   * @dev Returns amounts array
   */
  function getAmounts() public view returns (uint256[] memory) {
    return amounts;
  }

  /**
   * @dev Returns tokenAddresses array
   */
  function getTokenAddresses() public view returns (address[] memory) {
    return tokenAddresses;
  }

  /**
   * @dev Complete batch transfer of ether and ERC20 tokens to `recipients` according to corresponding amount (by index) in `amounts`
   * A corresponding token address in `tokenAddresses` (by index) determines whether it's an ether (0x0) or ERC20 transfer
   *
   * Emits a {BatchTransfer} event
   *
   * Requirements:
   * - ether balance must be greater than or equal to the total amount of ether to be transferred to `recipients`
   * - See {BatchTransferable-_batchTransfer} for other requirements
   */
  function completeTransfer() external payable {
    // Copy amounts and tokenAddresses into memory to save gas due to multiple reads
    uint256[] memory mAmounts = amounts;
    address[] memory mTokenAddresses = tokenAddresses;

    uint256 tokenTotal = _getTokenTotal(address(0), mAmounts, mTokenAddresses);
    require(address(this).balance >= tokenTotal || msg.value >= tokenTotal, "Grindery: insufficient balance");
    bool success = _batchTransfer(address(this), recipients, mAmounts, mTokenAddresses);
    require(success, "Grindery: batch transfer failed");
  }

  /**
   * @dev Transfer contract's balance of `tokens` (0x0 for ether) to the contract `owner`
   *
   * Emits a {BatchRecovered} event
   *
   * Requirements:
   * - Caller must be the `owner`
   * - Smart contract must be in a recoverable state
   */
  function batchRecover(address recipient) external onlyOwner isRecoverable {
    uint numTokenAddresses = tokenAddresses.length;
    address[] memory recoveredTokens = new address[](numTokenAddresses > 0 ? numTokenAddresses : 1);
    if (numTokenAddresses > 0) {
      recoveredTokens = tokenAddresses;
    } else {
      recoveredTokens[0] = address(0);
    }
    (bool success, uint256[] memory recoveredAmounts) = _batchRecover(recipient, recoveredTokens);
    require(success, "Grindery: batch recovery failed");
    emit BatchRecovered(recipient, recoveredAmounts, recoveredTokens);
  }
}