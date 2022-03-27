//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

/*
 * Smart contract to facilitate peer to peer lending
 *
 * TODO: add address array to keep track of address with a stakedBalance
 * TODO: add functionality to disperse fees paid to all addresses with a stakedBalance
 * TODO: Fee dispersal should be proportional to size of stakedBalance
*/

contract Loan {

    address public usdc;
    uint256 public balance;

    mapping(address => uint256) public stakedBalances; // address values to check how much can be borrowed (80% of this value can be borrowed)
    mapping(address => uint256) public userBalances; // user's total balance
    mapping(address => uint256) public amountOwed; // principal amount each address owes to contract
    mapping(address => uint256) public feeOwed; // Interest owed before principal is payed down

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
        amountOwed[msg.sender] += _amount;
        feeOwed[msg.sender] += (_amount / 10);
        IERC20(usdc).transfer(msg.sender, _amount);
    }

    function pay(uint256 _amount) external {
        require(amountOwed[msg.sender] > 0, "No money owed");
        uint256 _totalOwed = amountOwed[msg.sender] + feeOwed[msg.sender];
        require(_amount <= _totalOwed, "More than amount owed");
        IERC20(usdc).transferFrom(msg.sender, address(this), _amount);
        balance += _amount;

        if (feeOwed[msg.sender] > 0) _payFee(_amount);
        else _payPrincipal(_amount);

        if (amountOwed[msg.sender] == 0) {
            stakedBalances[msg.sender] = userBalances[msg.sender];
        }
    }

    function _payFee(uint256 _amount) private {
        if (_amount <= feeOwed[msg.sender]) {
            feeOwed[msg.sender] -= _amount;
        } else {
            uint256 _leftOver = _amount - feeOwed[msg.sender];
            feeOwed[msg.sender] = 0;
            amountOwed[msg.sender] -= _leftOver;
            userBalances[msg.sender] += _leftOver;
        }
    }

    function _payPrincipal(uint256 _amount) private {
        amountOwed[msg.sender] -= _amount;
        userBalances[msg.sender] += _amount;
    }
}
