// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Transferable
 * @dev Implementation of transfer of ether and ERC20 tokens to recipient
 */
contract Transferable {
  using SafeERC20 for IERC20;

  /**
   * @dev Throws if `amount` is less than zero
   */
  modifier isTransferableAmount(uint256 amount) {
    require(amount > 0, "Grindery: transfer amount is zero");
    _;
  }

  /**
   * @dev Throws if `recipient` is either the zero address or this contract's address
   */
  modifier isTransferableRecipient(address recipient) {
    require(recipient != address(0), "Grindery: recipient is address(0)");
    require(recipient != address(this), "Grindery: recipient is this contract");
    _;
  }

  /**
   * @dev Transfer `amount` of ether to `recipient`
   *
   * Requirements:
   * - See {isTransferableRecipient} and {isTransferableAmount} modifiers
   */
  function _transfer(address recipient, uint256 amount) internal isTransferableRecipient(recipient) isTransferableAmount(amount) returns (bool) {
    (bool success,) = payable(recipient).call{value : amount}("");
    return success;
  }

  /**
   * @dev Transfer `amount` of `token` (0x0 for ether) to `recipient`
   *
   * Requirements:
   * - See {isTransferableRecipient} and {isTransferableAmount} modifiers
   */
  function _transfer(address recipient, uint256 amount, address token) internal isTransferableRecipient(recipient) isTransferableAmount(amount) returns (bool) {
    if (token == address(0)) {
      // Ether transfer
      return _transfer(recipient, amount);
    }
    // Direct token transfer because this contract is the payer
    IERC20(token).safeTransfer(recipient, amount); // reverts if token transfer fails
    return true;
  }

  /**
   * @dev Transfer `amount` of `token` (0x0 for ether) to `recipient` from `payer`
   *
   * Requirements:
   * - See {isTransferableRecipient} and {isTransferableAmount} modifiers
   */
  function _transfer(address recipient, uint256 amount, address token, address payer) internal isTransferableRecipient(recipient) isTransferableAmount(amount) returns (bool) {
    if (token != address(0) && payer != address(this) && payer != address(0)) {
      // Delegated token transfer
      IERC20(token).safeTransferFrom(payer, recipient, amount); // reverts if token transfer fails
      return true;
    }
    return _transfer(recipient, amount, token);
  }
}