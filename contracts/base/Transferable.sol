// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Transferable
 * @dev Implementation of transfer of ether and ERC20 tokens to recipient
 */
contract Transferable {
  /**
   * @dev Throws if `amount` is less than zero
   */
  modifier isTransferableAmount(uint256 amount) {
    require(amount > 0);
    _;
  }

  /**
   * @dev Throws if `recipient` is either the zero address or this contract's address
   */
  modifier isTransferableRecipient(address recipient) {
    require(recipient != address(0));
    require(recipient != address(this));
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
    return IERC20(token).transfer(recipient, amount);
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
      return IERC20(token).transferFrom(payer, recipient, amount);
    }
    return _transfer(recipient, amount, token);
  }
}