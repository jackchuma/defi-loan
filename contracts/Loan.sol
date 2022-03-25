//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

/*
 * Smart contract to facilitate a DeFi loan
 * 
 * This is meant to be a single type of loan (i.e. loans of a fixed length)
 * Have lenders deposit money into the smart contract to earn interest
*/

contract Loan {

    address public usdc;
    uint256 public balance;

    mapping(address => uint256) public userBalances;

    constructor(address _usdc) {
        usdc = _usdc;
    }

    function deposit(uint256 _amount) external {
        IERC20(usdc).transferFrom(msg.sender, address(this), _amount);
        balance += _amount;
        userBalances[msg.sender] += _amount;
    }

    function withdraw(uint256 _amount) external {
        require(_amount <= userBalances[msg.sender], "Nope");
        balance -= _amount;
        userBalances[msg.sender] -= _amount;
        IERC20(usdc).transfer(msg.sender, _amount);
    }

    function borrow(uint256 _amount) external {

    }
}
