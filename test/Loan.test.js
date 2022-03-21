const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Loan", function () {
  before(async function() {
    this.Loan = await ethers.getContractFactory("Loan");
  });

  context("Deployment", async function() {
    it ("Should save term of loan (in months) on deployment", async function() {
      const loan = await this.Loan.deploy(120, 5);
      await loan.deployed();
      expect((await loan.length()).toNumber()).to.equal(120);
    });

    it ("Should save interest rate on deployment", async function() {
      const loan = await this.Loan.deploy(120, 5);
      await loan.deployed();
      expect((await loan.interest()).toNumber()).to.equal(5);
    });
  });
});
