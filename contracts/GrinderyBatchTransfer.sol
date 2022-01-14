// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "./base/BatchTransferable.sol";
import "./base/OwnerRecoverable.sol";

/**
 * @title GrinderyBatchTransfer
 * @dev Implementation of batch transfer of received ether and pre-approved ERC20 tokens to multiple recipients
 */
contract GrinderyBatchTransfer is BatchTransferable, OwnerRecoverable {
  /**
   * @dev Batch transfer received ether and pre-approved ERC20 tokens to accounts in `recipients` according to corresponding amount (by index) in `amounts`
   * A corresponding token address in `tokenAddresses` (by index) determines whether it's an ether (0x0) or ERC20 transfer
   *
   * Emits a {BatchTransfer} event
   *
   * Requirements:
   * - Sent ether must be equal to the total amount of ether to be transferred to `recipients`
   * - See {BatchTransferable._batchTransfer} for other requirements
   */
  function batchTransfer(address[] calldata recipients, uint256[] calldata amounts, address[] calldata tokenAddresses) external payable {
    require(recipients.length == tokenAddresses.length || tokenAddresses.length == 0);
    require(msg.value == _getTokenTotal(address(0), amounts, tokenAddresses));
    bool success = _batchTransfer(msg.sender, recipients, amounts, tokenAddresses);
    require(success);
  }
}