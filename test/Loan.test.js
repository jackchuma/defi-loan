const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Loan", function () {
  before(async function() {
    this.Loan = await ethers.getContractFactory("Loan");
    this.USDC = await ethers.getContractFactory("USDC");
    [this.owner, this.alice, this.bob, this.carol] = await ethers.getSigners();
  });

  context("Deployment", async function() {
    it ("Should save term of loan (in months) on deployment", async function() {
      const usdc = await this.USDC.deploy();
      await usdc.deployed();
      const loan = await this.Loan.deploy(120, 5, usdc.address);
      await loan.deployed();
      expect((await loan.length()).toNumber()).to.equal(120);
    });

    it ("Should save interest rate on deployment", async function() {
      const usdc = await this.USDC.deploy();
      await usdc.deployed();
      const loan = await this.Loan.deploy(120, 5, usdc.address);
      await loan.deployed();
      expect((await loan.interest()).toNumber()).to.equal(5);
    });

    it ("Should save usdc address on deployment", async function() {
      const usdc = await this.USDC.deploy();
      await usdc.deployed();
      const loan = await this.Loan.deploy(120, 5, usdc.address);
      await loan.deployed();
      expect(await loan.usdc()).to.equal(usdc.address);
    });
  });

  context("Request loan", async function() {
    this.beforeEach(async function() {
      const usdc = await this.USDC.deploy();
      await usdc.deployed();
      this.loan = await this.Loan.deploy(120, 5, usdc.address);
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

    it ("requestLoan stores proper ID", async function() {
      await this.loan.connect(this.owner).requestLoan(10000);
      await this.loan.connect(this.alice).requestLoan(10000);
      await this.loan.connect(this.bob).requestLoan(10000);
      await this.loan.connect(this.carol).requestLoan(10000);
      expect((await this.loan.pendingLoans(0)).id.toNumber()).to.equal(0);
      expect((await this.loan.pendingLoans(1)).id.toNumber()).to.equal(1);
      expect((await this.loan.pendingLoans(2)).id.toNumber()).to.equal(2);
      expect((await this.loan.pendingLoans(3)).id.toNumber()).to.equal(3);
    });

    it ("requestLoan stores proper amount", async function() {
      await this.loan.connect(this.owner).requestLoan(10000);
      await this.loan.connect(this.alice).requestLoan(20000);
      await this.loan.connect(this.bob).requestLoan(5000);
      await this.loan.connect(this.carol).requestLoan(7500);
      expect((await this.loan.pendingLoans(0)).amount.toNumber()).to.equal(10000);
      expect((await this.loan.pendingLoans(1)).amount.toNumber()).to.equal(20000);
      expect((await this.loan.pendingLoans(2)).amount.toNumber()).to.equal(5000);
      expect((await this.loan.pendingLoans(3)).amount.toNumber()).to.equal(7500);
    });

    it ("requestLoan stores proper requestor", async function() {
      await this.loan.connect(this.owner).requestLoan(10000);
      await this.loan.connect(this.alice).requestLoan(20000);
      await this.loan.connect(this.bob).requestLoan(5000);
      await this.loan.connect(this.carol).requestLoan(7500);
      expect((await this.loan.pendingLoans(0)).requestor).to.equal(this.owner.address);
      expect((await this.loan.pendingLoans(1)).requestor).to.equal(this.alice.address);
      expect((await this.loan.pendingLoans(2)).requestor).to.equal(this.bob.address);
      expect((await this.loan.pendingLoans(3)).requestor).to.equal(this.carol.address);
    });

    it ("requestLoan stores pendingLoanIds", async function() {
      await this.loan.connect(this.owner).requestLoan(10000);
      await this.loan.connect(this.alice).requestLoan(20000);
      await this.loan.connect(this.bob).requestLoan(5000);
      await this.loan.connect(this.carol).requestLoan(7500);
      expect((await this.loan.pendingLoanIds(0)).toNumber()).to.equal(0);
      expect((await this.loan.pendingLoanIds(1)).toNumber()).to.equal(1);
      expect((await this.loan.pendingLoanIds(2)).toNumber()).to.equal(2);
      expect((await this.loan.pendingLoanIds(3)).toNumber()).to.equal(3);
    });
  });

  context("Deposit money to contract", async function() {
    this.beforeEach(async function() {
      this.usdc = await this.USDC.deploy();
      await this.usdc.deployed();
      this.loan = await this.Loan.deploy(120, 5, this.usdc.address);
      await this.loan.deployed();
      await this.usdc.connect(this.owner).mint(this.alice.address, 1000000);
      await this.usdc.connect(this.owner).mint(this.bob.address, 1000000);
      await this.usdc.connect(this.owner).mint(this.carol.address, 1000000);
      await this.usdc.connect(this.owner).approve(this.loan.address, 1000000);
      await this.usdc.connect(this.alice).approve(this.loan.address, 1000000);
      await this.usdc.connect(this.bob).approve(this.loan.address, 1000000);
      await this.usdc.connect(this.carol).approve(this.loan.address, 1000000);
    });

    it ("Users can deposit money to Loan contract", async function() {
      await this.loan.connect(this.owner).deposit(1000000);
      expect((await this.usdc.balanceOf(this.loan.address)).toNumber()).to.equal(1000000);
      await this.loan.connect(this.alice).deposit(1000000);
      expect((await this.usdc.balanceOf(this.loan.address)).toNumber()).to.equal(2000000);
      await this.loan.connect(this.bob).deposit(1000000);
      expect((await this.usdc.balanceOf(this.loan.address)).toNumber()).to.equal(3000000);
      await this.loan.connect(this.carol).deposit(1000000);
      expect((await this.usdc.balanceOf(this.loan.address)).toNumber()).to.equal(4000000);
    });

    it ("Contract balance is updated from deposit", async function() {
      expect((await this.loan.balance()).toNumber()).to.equal(0);
      await this.loan.connect(this.owner).deposit(1000000);
      expect((await this.loan.balance()).toNumber()).to.equal(1000000);
    });

    it ("Contract keeps track of user balances", async function() {
      await this.loan.connect(this.owner).deposit(1000000);
      expect((await this.loan.userBalances(this.owner.address)).toNumber()).to.equal(1000000);
      await this.loan.connect(this.alice).deposit(458639);
      expect((await this.loan.userBalances(this.alice.address)).toNumber()).to.equal(458639);
      await this.loan.connect(this.bob).deposit(248564);
      expect((await this.loan.userBalances(this.bob.address)).toNumber()).to.equal(248564);
      await this.loan.connect(this.carol).deposit(948563);
      expect((await this.loan.userBalances(this.carol.address)).toNumber()).to.equal(948563);
    });
  });

  context("Withdraw money from contract", async function() {
    this.beforeEach(async function() {
      this.usdc = await this.USDC.deploy();
      await this.usdc.deployed();
      this.loan = await this.Loan.deploy(120, 5, this.usdc.address);
      await this.loan.deployed();
      await this.usdc.connect(this.owner).mint(this.alice.address, 1000000);
      await this.usdc.connect(this.owner).mint(this.bob.address, 1000000);
      await this.usdc.connect(this.owner).mint(this.carol.address, 1000000);
      await this.usdc.connect(this.owner).approve(this.loan.address, 1000000);
      await this.usdc.connect(this.alice).approve(this.loan.address, 1000000);
      await this.usdc.connect(this.bob).approve(this.loan.address, 1000000);
      await this.usdc.connect(this.carol).approve(this.loan.address, 1000000);
      await this.loan.connect(this.owner).deposit(1000000);
      await this.loan.connect(this.alice).deposit(1000000);
      await this.loan.connect(this.bob).deposit(1000000);
      await this.loan.connect(this.carol).deposit(1000000);
    });

    it ("Users can withdraw money from contract", async function() {
      expect((await this.usdc.balanceOf(this.loan.address)).toNumber()).to.equal(4000000);
      await this.loan.connect(this.owner).withdraw(1000000);
      expect(parseInt(ethers.utils.formatEther(await this.usdc.balanceOf(this.owner.address)))).to.equal(1000000);
      expect((await this.usdc.balanceOf(this.loan.address)).toNumber()).to.equal(3000000);

      await this.loan.connect(this.alice).withdraw(1000000);
      expect((await this.usdc.balanceOf(this.alice.address)).toNumber()).to.equal(1000000);
      expect((await this.usdc.balanceOf(this.loan.address)).toNumber()).to.equal(2000000);

      await this.loan.connect(this.bob).withdraw(1000000);
      expect((await this.usdc.balanceOf(this.bob.address)).toNumber()).to.equal(1000000);
      expect((await this.usdc.balanceOf(this.loan.address)).toNumber()).to.equal(1000000);

      await this.loan.connect(this.carol).withdraw(1000000);
      expect((await this.usdc.balanceOf(this.carol.address)).toNumber()).to.equal(1000000);
      expect((await this.usdc.balanceOf(this.loan.address)).toNumber()).to.equal(0);
    });

    it ("Cannot withdraw more money than user's balance", async function() {
      await expect(this.loan.connect(this.alice).withdraw(1000001)).to.be.revertedWith('Nope');
    });

    it ("Contract balance is updated from withdraw", async function() {
      expect((await this.loan.balance()).toNumber()).to.equal(4000000);
      await this.loan.connect(this.owner).withdraw(1000000);
      expect((await this.loan.balance()).toNumber()).to.equal(3000000);
    });
  });
});
