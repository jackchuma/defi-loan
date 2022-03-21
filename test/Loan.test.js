const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Loan", function () {
  before(async function() {
    this.Loan = await ethers.getContractFactory("Loan");
    [this.owner, this.alice, this.bob, this.carol] = await ethers.getSigners();
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

  context("Request loan", async function() {
    this.beforeEach(async function() {
      this.loan = await this.Loan.deploy(120, 5);
      await this.loan.deployed();
    });

    it ("Anyone can request a loan", async function() {
      await this.loan.connect(this.owner).requestLoan(10000);
      await this.loan.connect(this.alice).requestLoan(10000);
      await this.loan.connect(this.bob).requestLoan(10000);
      await this.loan.connect(this.carol).requestLoan(10000);
    });

    it ("requestLoan increments idCount", async function() {
      expect((await this.loan.idCount()).toNumber()).to.equal(0);
      await this.loan.connect(this.owner).requestLoan(10000);
      expect((await this.loan.idCount()).toNumber()).to.equal(1);
      await this.loan.connect(this.alice).requestLoan(10000);
      expect((await this.loan.idCount()).toNumber()).to.equal(2);
    });
  });
});
