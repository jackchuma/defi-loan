const { expect } = require("chai");
const { keccak256 } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("Loan", function () {
  before(async function() {
    this.Loan = await ethers.getContractFactory("Loan");
    this.USDC = await ethers.getContractFactory("USDC");
    [this.owner, this.alice, this.bob, this.carol] = await ethers.getSigners();
  });

  context("Deployment", async function() {
    it ("Should save usdc address on deployment", async function() {
      const usdc = await this.USDC.deploy();
      await usdc.deployed();
      const loan = await this.Loan.deploy(usdc.address);
      await loan.deployed();
      expect(await loan.usdc()).to.equal(usdc.address);
    });
  });

  context("Deposit money to contract", async function() {
    this.beforeEach(async function() {
      this.usdc = await this.USDC.deploy();
      await this.usdc.deployed();
      this.loan = await this.Loan.deploy(this.usdc.address);
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

    it ("Contract keeps track of staked balances", async function() {
      expect((await this.loan.stakedBalances(this.owner.address)).toNumber()).to.equal(0);
      await this.loan.connect(this.owner).deposit(1000000);
      expect((await this.loan.stakedBalances(this.owner.address)).toNumber()).to.equal(1000000);
    });

    it ("Cannot deposit if money owed", async function() {
      await this.loan.connect(this.alice).deposit(500);
      await this.loan.connect(this.alice).borrow(100);
      await expect(this.loan.connect(this.alice).deposit(100)).to.be.revertedWith('Must pay amount owed');
    });
  });

  context("Withdraw money from contract", async function() {
    this.beforeEach(async function() {
      this.usdc = await this.USDC.deploy();
      await this.usdc.deployed();
      this.loan = await this.Loan.deploy(this.usdc.address);
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

    it ("Contract keeps track of user balances after withdraw", async function() {
      await this.loan.connect(this.owner).withdraw(1000000);
      expect((await this.loan.userBalances(this.owner.address)).toNumber()).to.equal(0);
      await this.loan.connect(this.alice).withdraw(458639);
      expect((await this.loan.userBalances(this.alice.address)).toNumber()).to.equal(1000000 - 458639);
      await this.loan.connect(this.bob).withdraw(248564);
      expect((await this.loan.userBalances(this.bob.address)).toNumber()).to.equal(1000000 - 248564);
      await this.loan.connect(this.carol).withdraw(948563);
      expect((await this.loan.userBalances(this.carol.address)).toNumber()).to.equal(1000000 - 948563);
    });

    it ("User can only withdraw if no money is owed", async function() {
      await this.loan.connect(this.alice).borrow(800000);
      await expect(this.loan.connect(this.alice).withdraw(1)).to.be.revertedWith("Must pay amount owed");
    });
  });

  context("Borrow Money", async function() {
    this.beforeEach(async function() {
      this.usdc = await this.USDC.deploy();
      await this.usdc.deployed();
      this.loan = await this.Loan.deploy(this.usdc.address);
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
    });

    it ("Users can call borrow function", async function() {
      await this.loan.connect(this.alice).borrow(1000);
    });

    it ("Only users who have staked money can call borrow function", async function() {
      await expect(this.loan.connect(this.carol).borrow(1000)).to.be.revertedWith("Not enough staked");
    });

    it ("Users can borrow up to 80% of their staked balance", async function() {
      await expect(this.loan.connect(this.alice).borrow(800001)).to.be.revertedWith("Not enough staked");
      await this.loan.connect(this.alice).borrow(800000);
    });

    it ("Completion of borrow function will transfer money to user", async function() {
      expect((await this.usdc.balanceOf(this.alice.address)).toNumber()).to.equal(0);
      await this.loan.connect(this.alice).borrow(800000);
      expect((await this.usdc.balanceOf(this.alice.address)).toNumber()).to.equal(800000);
    });

    it ("Borrow function will update stakedBalances", async function() {
      expect((await this.loan.stakedBalances(this.alice.address)).toNumber()).to.equal(1000000);
      await this.loan.connect(this.alice).borrow(800000);
      expect((await this.loan.stakedBalances(this.alice.address)).toNumber()).to.equal(0);
    });

    it ("Borrow function will update userBalances", async function() {
      expect((await this.loan.userBalances(this.alice.address)).toNumber()).to.equal(1000000);
      await this.loan.connect(this.alice).borrow(800000);
      expect((await this.loan.userBalances(this.alice.address)).toNumber()).to.equal(200000);
    });

    it ("Borrow function will update amountOwed", async function() {
      expect((await this.loan.amountOwed(this.alice.address)).toNumber()).to.equal(0);
      await this.loan.connect(this.alice).borrow(800000);
      expect((await this.loan.amountOwed(this.alice.address)).toNumber()).to.equal(880000);
    });

    it ("Borrow function will update contract balance", async function() {
      expect((await this.loan.balance()).toNumber()).to.equal(3000000);
      await this.loan.connect(this.alice).borrow(800000);
      expect((await this.loan.balance()).toNumber()).to.equal(2200000);
    });
  });

  context("Pay back loan", async function() {
    this.beforeEach(async function() {
      this.usdc = await this.USDC.deploy();
      await this.usdc.deployed();
      this.loan = await this.Loan.deploy(this.usdc.address);
      await this.loan.deployed();
      await this.usdc.connect(this.owner).mint(this.alice.address, 1000000);
      await this.usdc.connect(this.owner).mint(this.bob.address, 1000000);
      await this.usdc.connect(this.owner).mint(this.carol.address, 1000000);
      await this.usdc.connect(this.owner).approve(this.loan.address, 1000000);
      await this.usdc.connect(this.alice).approve(this.loan.address, 1000000);
      await this.usdc.connect(this.bob).approve(this.loan.address, 1000000);
      await this.usdc.connect(this.carol).approve(this.loan.address, 1000000);
      await this.loan.connect(this.owner).deposit(1000);
      await this.loan.connect(this.alice).deposit(1000);
      await this.loan.connect(this.bob).deposit(1000);
    });

    it ("Users can call pay function", async function() {
      await this.loan.connect(this.alice).borrow(100);
      await this.loan.connect(this.alice).pay(100);
    });
  });
});
