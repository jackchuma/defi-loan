const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Loan", function () {
  before(async function() {
    const Loan = await ethers.getContractFactory("Loan");
  });

  context("Deployment", async function() {
    this.beforeEach(async function() {
      this.loan = await Loan.deploy("");
      await this.loan.deployed();
    });
  });
});
