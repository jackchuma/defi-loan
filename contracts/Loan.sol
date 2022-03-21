//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Loan {
    uint256 public length;

    constructor(uint256 _length) {
        length = _length;
    }
}
