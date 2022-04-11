//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

/*
 * Smart contract to facilitate peer to peer lending
 *
*/

contract Loan {

    address public usdc;
    uint256 public balance;
    address[] private stakedAddresses;

    mapping(address => uint256) public stakedBalances; // address values to check how much can be borrowed (80% of this value can be borrowed)
    mapping(address => uint256) public userBalances; // user's total balance
    mapping(address => uint256) public amountOwed; // principal amount each address owes to contract
    mapping(address => uint256) public feeOwed; // Interest owed before principal is payed down

    constructor(address _usdc) {
        usdc = _usdc;
    }

    /**
     * @notice To be called by user who wants to deposit funds in this contract
     * @dev Can only be called if user does not owe money to contract
     * @dev Transfers funds to contract, then updates contracts state and adds msg.sender to stakedAddresses if not already there
     * @param _amount Amount of tokens to deposit
    */
    function deposit(uint256 _amount) external {
        require(amountOwed[msg.sender] == 0, "Must pay amount owed");
        IERC20(usdc).transferFrom(msg.sender, address(this), _amount);
        balance += _amount;
        userBalances[msg.sender] += _amount;
        if (stakedBalances[msg.sender] == 0) stakedAddresses.push(msg.sender);
        stakedBalances[msg.sender] += _amount;
    }

    /**
     * @notice To be called by user who wants to withdraw funds from contract
     * @dev Can only withdraw if user does not owe money to contract
     * @dev Can withdraw up to user's total balance held in contract
     * @dev Updates contracts state and then transfers funds to user to avoid reentrancy
     * @param _amount Amount of tokens to withdraw
    */
    function withdraw(uint256 _amount) external {
        require(amountOwed[msg.sender] == 0, "Must pay amount owed");
        require(_amount <= userBalances[msg.sender], "Nope");
        balance -= _amount;
        userBalances[msg.sender] -= _amount;
        stakedBalances[msg.sender] -= _amount;
        if (stakedBalances[msg.sender] == 0) _removeAddress(msg.sender, stakedAddresses);
        IERC20(usdc).transfer(msg.sender, _amount);
    }

    /**
     * @notice To be called by a user with a staked balance in this contract that wants to borrow money
     * @dev Can only borrow up to 80% of their staked balance
     * @dev Updates contract state and then transfers funds
     * @param _amount Amount of tokens to borrow
    */
    function borrow(uint256 _amount) external {
        uint256 _upAmount = _amount * 5 / 4;
        require(_upAmount <= stakedBalances[msg.sender], "Not enough staked");
        balance -= _amount;
        stakedBalances[msg.sender] -= _upAmount;
        if (stakedBalances[msg.sender] == 0) _removeAddress(msg.sender, stakedAddresses);
        userBalances[msg.sender] -= _amount;
        amountOwed[msg.sender] += _amount;
        feeOwed[msg.sender] += (_amount / 10);
        IERC20(usdc).transfer(msg.sender, _amount);
    }

    /**
     * @notice To be called by a user that wants to pay back a loan to the contract
     * @dev User must owe money to contract, and cannot pay more than they owe
     * @dev Transfers funds then updates contract state
     * @dev If full loan is paid back, adds msg.sender to stakedAddresses array and updates their staked balance
     * @param _amount Amount of tokens to pay
    */
    function pay(uint256 _amount) external {
        require(amountOwed[msg.sender] > 0, "No money owed");
        uint256 _totalOwed = amountOwed[msg.sender] + feeOwed[msg.sender];
        require(_amount <= _totalOwed, "More than amount owed");
        IERC20(usdc).transferFrom(msg.sender, address(this), _amount);
        balance += _amount;

        if (feeOwed[msg.sender] > 0) _payFee(_amount);
        else _payPrincipal(_amount);

        if (amountOwed[msg.sender] == 0) {
            if (stakedBalances[msg.sender] == 0) stakedAddresses.push(msg.sender);
            stakedBalances[msg.sender] = userBalances[msg.sender];
        }
    }

    /**
     * @notice Pays the fee portion of a user's loan
     * @dev Will pay overflow funds into principal portion of loan
     * @param _amount Amount of funds being paid
    */
    function _payFee(uint256 _amount) private {
        uint _add = _amount <= feeOwed[msg.sender] ? _amount / stakedAddresses.length : feeOwed[msg.sender] / stakedAddresses.length;

        for (uint i=0; i<stakedAddresses.length; i++) {
            stakedBalances[stakedAddresses[i]] += _add;
        }

        if (_amount <= feeOwed[msg.sender]) {
            feeOwed[msg.sender] -= _amount;
        } else {
            uint256 _leftOver = _amount - feeOwed[msg.sender];
            feeOwed[msg.sender] = 0;
            amountOwed[msg.sender] -= _leftOver;
            userBalances[msg.sender] += _leftOver;
        }
    }

    /**
     * @notice Pays the principal portion of a user's loan if they have already paid their fee
     * @param _amount Amount of funds being paid
    */
    function _payPrincipal(uint256 _amount) private {
        amountOwed[msg.sender] -= _amount;
        userBalances[msg.sender] += _amount;
    }

    /**
     * @notice Removes a specific address from a list of addresses
     * @dev Does not check for duplicates
     * @param _rem Address to remove
     * @param _list List of addresses
    */
    function _removeAddress(address _rem, address[] storage _list) private {
        for (uint i=0; i<_list.length; i++) {
            if (_list[i] == _rem) {
                _list[i] = _list[_list.length - 1];
                _list.pop();
                break;
            }
        }
    }

    /**
     * @dev Helper function that returns stakedAddresses array
    */
    function getStakedAddresses() external view returns (address[] memory) {
        return stakedAddresses;
    }
}
