// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

/**
 * @title Receivable
 * @dev Implements a receive function and emits a Received event
 */
contract Receivable {
  // @dev Emitted when `amount` ether is received from `sender`
  event Received(address indexed sender, uint256 amount);

  /**
   * @dev Allows this contract to receive ether
     *
     * Emits a {Received} event
     */
  receive() external payable {
    if (msg.value > 0) {
      emit Received(msg.sender, msg.value);
    }
  }
}