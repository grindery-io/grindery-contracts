// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Recoverable.sol";

/**
 * @title OwnerRecoverable
 * @dev Implementation of recovery of received ether and ERC20 tokens to owner
 */
contract OwnerRecoverable is Ownable, Recoverable {
  /**
   * @dev Transfer contract's balance of `token` (0x0 for ether) to `recipient`
   *
   * Emits a {Recovered} event
   *
   * Requirements:
   * - Caller must be the `owner`
   * - See {Recoverable-_recover} for other requirements
   */
  function recover(address recipient, address token) external onlyOwner {
    (bool success, uint256 balance) = _recover(recipient, token);
    require(success, "Grindery: recovery failed");
    emit Recovered(recipient, token, balance);
  }
}