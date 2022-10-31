// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Transferable.sol";

/**
 * @title Recoverable
 * @dev Implementation of recovery of received ether and ERC20 tokens
 */
contract Recoverable is Transferable {
  /// @dev Emitted when `amount` of `token` (0x0 for ether) is recovered to `recipient`
  event Recovered(address indexed recipient, address indexed token, uint256 amount);

  /// @dev Get balance of `token` (0x0 for ether)
  function _balance(address token) view internal returns (uint256) {
    return token == address(0) ? address(this).balance : IERC20(token).balanceOf(address(this));
  }

  /**
   * @dev Transfer contract's balance of `token` (0x0 for ether) to `recipient`
   *
   * Requirements:
   * - token balance must be greater than zero
   * - See {Transferable-_transfer} for more requirements
   */
  function _recover(address recipient, address token) internal isTransferableRecipient(recipient) returns (bool, uint256) {
    uint256 balance = _balance(token);
    bool success = false;
    if (balance > 0) {
      success = _transfer(recipient, balance, token);
    }
    return (success, balance);
  }
}