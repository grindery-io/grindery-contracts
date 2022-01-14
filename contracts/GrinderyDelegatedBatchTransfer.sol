// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

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
  address[] recipients;

  // @dev Amounts
  uint256[] amounts;

  // @dev Token Addresses
  address[] tokenAddresses;

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
    uint256 tokenTotal = _getTokenTotal(address(0), amounts, tokenAddresses);
    require(address(this).balance >= tokenTotal || msg.value >= tokenTotal);
    bool success = _batchTransfer(address(this), recipients, amounts, tokenAddresses);
    require(success);
  }

  /**
   * @dev Throws if all tokens have sufficient balance to complete the batch transfer
   */
  modifier isRecoverable() {
    bool hasAnyInsufficientBalance = false;
    if (tokenAddresses.length > 0) {
      for (uint i; i < tokenAddresses.length; i++) {
        address token = tokenAddresses[i];
        if (_balance(token) < _getTokenTotal(token, amounts, tokenAddresses)) {
          hasAnyInsufficientBalance = true;
        }
      }
    } else {
      if (address(this).balance < _getTokenTotal(address(0), amounts, tokenAddresses)) {
        hasAnyInsufficientBalance = true;
      }
    }
    require(hasAnyInsufficientBalance);
    _;
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
    address[] memory recoveredTokens = new address[](tokenAddresses.length > 0 ? tokenAddresses.length : 1);
    if (tokenAddresses.length > 0) {
      recoveredTokens = tokenAddresses;
    } else {
      recoveredTokens[0] = address(0);
    }
    (bool success, uint256[] memory recoveredAmounts) = _batchRecover(recipient, recoveredTokens);
    require(success);
    emit BatchRecovered(recipient, recoveredAmounts, recoveredTokens);
  }
}