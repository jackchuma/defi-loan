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

    mapping(address => uint256) public stakedBalances; // address values to check how much can be borrowed (80% of this value can be borrowed)
    mapping(address => uint256) public userBalances; // total balance of user available to withdraw
    mapping(address => uint256) public amountOwed; // total amount each address owes to contract

    constructor(address _usdc) {
        usdc = _usdc;
    }

    function deposit(uint256 _amount) external {
        require(amountOwed[msg.sender] == 0, "Must pay amount owed");
        IERC20(usdc).transferFrom(msg.sender, address(this), _amount);
        balance += _amount;
        userBalances[msg.sender] += _amount;
        stakedBalances[msg.sender] += _amount;
    }

    function withdraw(uint256 _amount) external {
        require(amountOwed[msg.sender] == 0, "Must pay amount owed");
        require(_amount <= userBalances[msg.sender], "Nope");
        balance -= _amount;
        userBalances[msg.sender] -= _amount;
        IERC20(usdc).transfer(msg.sender, _amount);
    }

    function borrow(uint256 _amount) external {
        uint256 _upAmount = _amount * 5 / 4;
        require(_upAmount <= stakedBalances[msg.sender], "Not enough staked");
        balance -= _amount;
        stakedBalances[msg.sender] -= _upAmount;
        userBalances[msg.sender] -= _amount;
        amountOwed[msg.sender] += (_amount * 11 / 10);
        IERC20(usdc).transfer(msg.sender, _amount);
    }

    // what if amount is greater than amount owed
    function pay(uint256 _amount) external {
        require(amountOwed[msg.sender] > 0, "No money owed");
        IERC20(usdc).transferFrom(msg.sender, address(this), _amount);
    }
}
