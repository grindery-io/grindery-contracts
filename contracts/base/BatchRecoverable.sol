// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "./Recoverable.sol";

/**
 * @title BatchRecoverable
 * @dev Implementation of batch recovery of received ether and ERC20 tokens to owner
 */
contract BatchRecoverable is Recoverable {
  /// @dev Emitted when `amounts` of `tokens` (0x0 for ether) is recovered to `recipient`
  event BatchRecovered(address indexed recipient, uint256[] amounts, address[] tokens);

  /**
   * @dev Transfer contract's balance of `tokens` (0x0 for ether) to `recipient`
   *
   * Emits a {BatchRecovered} event
   *
   * Requirements:
   * - Caller must be the `owner`
   * - See {Recoverable._recover} for other requirements
   */
  function _batchRecover(address recipient, address[] memory tokens) internal returns (bool, uint256[] memory) {
    uint256[] memory recoveredAmounts = new uint256[](tokens.length > 0 ? tokens.length : 1);
    for (uint i; i < tokens.length; i++) {
      address token = tokens[i];
      (bool success, uint256 balance) = _recover(recipient, token);
      if (!success && balance > 0) {
        return (false, recoveredAmounts);
      }
      recoveredAmounts[i] = balance;
    }
    return (true, recoveredAmounts);
  }
}