// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Transferable.sol";

/**
 * @title BatchTransferable
 * @dev Implementation of batch transfer of ether and pre-approved ERC20 tokens to multiple recipients
 */
contract BatchTransferable is Transferable {
  /**
   * @dev Emitted when a batch transfer of ether and pre-approved ERC20 tokens from `payer` to `recipients`
   * according to `amounts` and `tokenAddresses` (0x0 for ether) is completed
   */
  event BatchTransfer(address indexed payer, address[] recipients, uint256[] amounts, address[] tokenAddresses);

  /**
   * @dev Throws if
   * - Length of `recipients` is not greater than zero
   * - Length of `recipients` and `amounts` is not the same
   * - Length of `tokenAddresses` is neither zero nor equal to the length of `recipients` and `amounts`
   * - Any value in `amounts` is not greater than zero
   * - Any address in `recipients` is equal to the zero address
   */
  modifier isValidBatchTransfer(address[] memory recipients, uint256[] memory amounts, address[] memory tokenAddresses) {
    require(recipients.length > 0);
    require(recipients.length == amounts.length);
    require(recipients.length == tokenAddresses.length || tokenAddresses.length == 0);

    for (uint i; i < recipients.length; i++) {
      require(amounts[i] > 0);
      require(recipients[i] != address(0));
    }
    _;
  }

  /**
   * @dev Batch transfer ether and ERC20 tokens to `recipients` according to corresponding amount (by index) in `amounts`
   * A corresponding token address in `tokenAddresses` (by index) determines whether it's an ether (0x0) or ERC20 transfer
   * In the case of ERC20 tokens, `payer` determines the source of the tokens
   *
   * Emits a {BatchTransfer} event
   *
   * Requirements:
   * - Length of `recipients` must be greater than zero
   * - Length of `recipients` and `amounts` must be the same
   * - Length of `tokenAddresses` must either be zero or must be equal to the length of `recipients` and `amounts`
   * - All values in `amounts` must be greater than zero
   * - All addresses in `recipients` cannot be the zero address
   * - See {isValidBatchTransfer}
   * - See {Transferable-_transfer} for more requirements
   * - All transfers must succeed
   */
  function _batchTransfer(address payer, address[] memory recipients, uint256[] memory amounts, address[] memory tokenAddresses) internal isValidBatchTransfer(recipients, amounts, tokenAddresses) returns (bool) {
    for (uint i = 0; i < recipients.length; i++) {
      address tokenAddress = (tokenAddresses.length > 0 && tokenAddresses[i] != address(0))?tokenAddresses[i]:address(0);
      bool success = _transfer(recipients[i], amounts[i], tokenAddress, payer);
      require(success);
    }
    emit BatchTransfer(payer, recipients, amounts, tokenAddresses);
    return true;
  }

  /// @dev Returns total `token` amount to be transferred given a batch transfer of matching `amounts` and `tokens` (0x0 for ether)
  function _getTokenTotal(address token, uint256[] memory amounts, address[] memory tokenAddresses) internal pure returns (uint256) {
    uint256 tokenTotal = 0;
    for (uint i; i < amounts.length; i++) {
      if (
        (tokenAddresses.length > i && tokenAddresses[i] == token) ||
        (tokenAddresses.length == 0 && token == address(0))
      ) {
        tokenTotal += amounts[i];
      }
    }
    return tokenTotal;
  }
}