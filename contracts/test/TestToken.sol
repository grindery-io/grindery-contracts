// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestToken
 * @dev Implementation of ERC20 token for tests
 */
contract TestToken is ERC20 {
  constructor (string memory _name, string memory _symbol, uint256 initialBalance) ERC20(_name, _symbol) {
    _mint(msg.sender, initialBalance);
  }
}