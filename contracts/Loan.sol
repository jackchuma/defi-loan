//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/*
 * Smart contract to facilitate a DeFi loan
 * 
 * This is meant to be a single type of loan (i.e. loans of a fixed length)
*/

contract Loan {
    using Counters for Counters.Counter;

    Counters.Counter public idCount;

    uint256 public length;
    uint256 public interest;

    mapping(uint256 => LoanAgreement) public pendingLoans;

    struct LoanAgreement {
        uint256 id;
        uint256 amount;
        uint256 monthlyPayment;
    }

    constructor(uint256 _length, uint256 _interest) {
        length = _length;
        interest = _interest;
    }

    // TODO: Don't allow another loan request if msg.sender has pending loan
    function requestLoan(uint256 _amount) external {
        uint256 _id = idCount.current();
        LoanAgreement storage _loan = pendingLoans[_id];
        _loan.id = _id;
        _loan.amount = _amount;
        idCount.increment();
    }
}
