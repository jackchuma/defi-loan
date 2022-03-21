//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

/*
 * Smart contract to facilitate a DeFi loan
 * 
 * This is meant to be a single type of loan.  Would include an interface so any DeFi bank can utilize
*/

contract Loan {
    uint256 public length;
    uint256 public interest;

    constructor(uint256 _length, uint256 _interest) {
        length = _length;
        interest = _interest;
    }
}
