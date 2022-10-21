// SPDX-License-Identifier: MIT
pragma solidity >=0.6.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Erc20Test is ERC20 {
  uint256 constant INITIAL_SUPPLY = 1000000 * 10**uint256(18);

  constructor(string memory name, string memory symbol) public ERC20(name, symbol) {
    _mint(msg.sender, INITIAL_SUPPLY);
  }
}
