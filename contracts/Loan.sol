//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

/*
 * Smart contract to facilitate a DeFi loan
 * 
 * This is meant to be a single type of loan (i.e. loans of a fixed length)
 * Have lenders deposit money into the smart contract to earn interest
*/

contract Loan {
    using Counters for Counters.Counter;

    address public usdc;

    Counters.Counter public idCount;

    uint256 public length;
    uint256 public interest;
    uint256 public balance;

    uint256[] public pendingLoanIds;
    mapping(uint256 => LoanAgreement) public pendingLoans;

    struct LoanAgreement {
        uint256 id;
        address requestor;
        uint256 amount;
    }

    constructor(uint256 _length, uint256 _interest, address _usdc) {
        length = _length;
        interest = _interest;
        usdc = _usdc;
    }

    // TODO: Don't allow another loan request if msg.sender has pending loan
    function requestLoan(uint256 _amount) external {
        uint256 _id = idCount.current();
        LoanAgreement storage _loan = pendingLoans[_id];
        _loan.id = _id;
        pendingLoanIds.push(_id);
        _loan.requestor = msg.sender;
        _loan.amount = _amount;
        idCount.increment();
    }

    function deposit(uint256 _amount) external payable {
        IERC20(usdc).transferFrom(msg.sender, address(this), _amount);
        balance += _amount;
    }
}
