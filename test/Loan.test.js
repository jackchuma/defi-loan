const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Loan", function () {
  before(async function() {
    this.Loan = await ethers.getContractFactory("Loan");
    this.USDC = await ethers.getContractFactory("USDC");
    [this.owner, this.alice, this.bob, this.carol] = await ethers.getSigners();
    this.val = toWei("1000000");
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
      await this.usdc.connect(this.owner).mint(this.alice.address, this.val);
      await this.usdc.connect(this.owner).mint(this.bob.address, this.val);
      await this.usdc.connect(this.owner).mint(this.carol.address, this.val);
      await this.usdc.connect(this.owner).approve(this.loan.address, this.val);
      await this.usdc.connect(this.alice).approve(this.loan.address, this.val);
      await this.usdc.connect(this.bob).approve(this.loan.address, this.val);
      await this.usdc.connect(this.carol).approve(this.loan.address, this.val);
    });

    it ("Users can deposit money to Loan contract", async function() {
      await this.loan.connect(this.owner).deposit(this.val);
      expect(fromWei(await this.usdc.balanceOf(this.loan.address))).to.equal(1000000);
      await this.loan.connect(this.alice).deposit(this.val);
      expect(fromWei(await this.usdc.balanceOf(this.loan.address))).to.equal(2000000);
      await this.loan.connect(this.bob).deposit(this.val);
      expect(fromWei(await this.usdc.balanceOf(this.loan.address))).to.equal(3000000);
      await this.loan.connect(this.carol).deposit(this.val);
      expect(fromWei(await this.usdc.balanceOf(this.loan.address))).to.equal(4000000);
    });

    it ("Contract balance is updated from deposit", async function() {
      expect((await this.loan.balance()).toNumber()).to.equal(0);
      await this.loan.connect(this.owner).deposit(this.val);
      expect(fromWei(await this.usdc.balanceOf(this.loan.address))).to.equal(1000000);
    });

    it ("Contract keeps track of user balances", async function() {
      await this.loan.connect(this.owner).deposit(this.val);
      expect(fromWei(await this.loan.userBalances(this.owner.address))).to.equal(1000000);
      await this.loan.connect(this.alice).deposit(458639);
      expect((await this.loan.userBalances(this.alice.address)).toNumber()).to.equal(458639);
      await this.loan.connect(this.bob).deposit(248564);
      expect((await this.loan.userBalances(this.bob.address)).toNumber()).to.equal(248564);
      await this.loan.connect(this.carol).deposit(948563);
      expect((await this.loan.userBalances(this.carol.address)).toNumber()).to.equal(948563);
    });

    it ("Contract keeps track of staked balances", async function() {
      expect((await this.loan.stakedBalances(this.owner.address)).toNumber()).to.equal(0);
      await this.loan.connect(this.owner).deposit(this.val);
      expect(fromWei(await this.loan.stakedBalances(this.owner.address))).to.equal(1000000);
    });

    it ("Cannot deposit if money owed", async function() {
      await this.loan.connect(this.alice).deposit(500);
      await this.loan.connect(this.alice).borrow(100);
      await expect(this.loan.connect(this.alice).deposit(100)).to.be.revertedWith('Must pay amount owed');
    });

    it ("Contract keeps track of addresses with a staked balance", async function() {
      let addrs = await this.loan.getStakedAddresses();
      expect(addrs.length).to.equal(0);

      await this.loan.connect(this.alice).deposit(this.val);
      addrs = await this.loan.getStakedAddresses();
      expect(addrs.length).to.equal(1);
      expect(addrs[0]).to.equal(this.alice.address);

      await this.loan.connect(this.bob).deposit(this.val);
      addrs = await this.loan.getStakedAddresses();
      expect(addrs.length).to.equal(2);
      expect(addrs[0]).to.equal(this.alice.address);
      expect(addrs[1]).to.equal(this.bob.address);
    });

    it ("Will only add address to stakedAddresses if not already there", async function() {
      let addrs = await this.loan.getStakedAddresses();
      expect(addrs.length).to.equal(0);

      await this.loan.connect(this.alice).deposit(1000);
      addrs = await this.loan.getStakedAddresses();
      expect(addrs.length).to.equal(1);
      expect(addrs[0]).to.equal(this.alice.address);

      await this.loan.connect(this.alice).deposit(1000);
      addrs = await this.loan.getStakedAddresses();
      expect(addrs.length).to.equal(1);
      expect(addrs[0]).to.equal(this.alice.address);
    });
  });

  context("Withdraw money from contract", async function() {
    this.beforeEach(async function() {
      this.usdc = await this.USDC.deploy();
      await this.usdc.deployed();
      this.loan = await this.Loan.deploy(this.usdc.address);
      await this.loan.deployed();
      await this.usdc.connect(this.owner).mint(this.alice.address, this.val);
      await this.usdc.connect(this.owner).mint(this.bob.address, this.val);
      await this.usdc.connect(this.owner).mint(this.carol.address, this.val);
      await this.usdc.connect(this.owner).approve(this.loan.address, this.val);
      await this.usdc.connect(this.alice).approve(this.loan.address, this.val);
      await this.usdc.connect(this.bob).approve(this.loan.address, this.val);
      await this.usdc.connect(this.carol).approve(this.loan.address, this.val);
      await this.loan.connect(this.owner).deposit(this.val);
      await this.loan.connect(this.alice).deposit(this.val);
      await this.loan.connect(this.bob).deposit(this.val);
      await this.loan.connect(this.carol).deposit(this.val);
    });

    it ("Users can withdraw money from contract", async function() {
      expect(fromWei(await this.usdc.balanceOf(this.loan.address))).to.equal(4000000);
      await this.loan.connect(this.owner).withdraw(this.val);
      expect(fromWei(await this.usdc.balanceOf(this.owner.address))).to.equal(1000000);
      expect(fromWei(await this.usdc.balanceOf(this.loan.address))).to.equal(3000000);

      await this.loan.connect(this.alice).withdraw(this.val);
      expect(fromWei(await this.usdc.balanceOf(this.alice.address))).to.equal(1000000);
      expect(fromWei(await this.usdc.balanceOf(this.loan.address))).to.equal(2000000);

      await this.loan.connect(this.bob).withdraw(this.val);
      expect(fromWei(await this.usdc.balanceOf(this.bob.address))).to.equal(1000000);
      expect(fromWei(await this.usdc.balanceOf(this.loan.address))).to.equal(1000000);

      await this.loan.connect(this.carol).withdraw(this.val);
      expect(fromWei(await this.usdc.balanceOf(this.carol.address))).to.equal(1000000);
      expect(fromWei(await this.usdc.balanceOf(this.loan.address))).to.equal(0);
    });

    it ("Cannot withdraw more money than user's balance", async function() {
      await expect(this.loan.connect(this.alice).withdraw(this.val.add(1))).to.be.revertedWith('Nope');
    });

    it ("Contract balance is updated from withdraw", async function() {
      expect(fromWei(await this.loan.balance())).to.equal(4000000);
      await this.loan.connect(this.owner).withdraw(this.val);
      expect(fromWei(await this.loan.balance())).to.equal(3000000);
    });

    it ("Contract keeps track of user balances after withdraw", async function() {
      await this.loan.connect(this.owner).withdraw(this.val);
      expect((await this.loan.userBalances(this.owner.address)).toNumber()).to.equal(0);
      await this.loan.connect(this.alice).withdraw(toWei("458639"));
      expect(fromWei(await this.loan.userBalances(this.alice.address))).to.equal(1000000 - 458639);
      await this.loan.connect(this.bob).withdraw(toWei("248564"));
      expect(fromWei(await this.loan.userBalances(this.bob.address))).to.equal(1000000 - 248564);
      await this.loan.connect(this.carol).withdraw(toWei("948563"));
      expect(fromWei(await this.loan.userBalances(this.carol.address))).to.equal(1000000 - 948563);
    });

    it ("User can only withdraw if no money is owed", async function() {
      await this.loan.connect(this.alice).borrow(800000);
      await expect(this.loan.connect(this.alice).withdraw(1)).to.be.revertedWith("Must pay amount owed");
    });

    it ("Contract keeps track of stakedBalances after withdraw", async function() {
      await this.loan.connect(this.alice).withdraw(toWei("500"));
      expect(fromWei(await this.loan.stakedBalances(this.alice.address))).to.equal(1000000 - 500);
    });

    it ("Removes address from stakedAddresses if full balance is withdrawn", async function() {
      await this.loan.connect(this.alice).withdraw(this.val);
      const addrs = await this.loan.getStakedAddresses();
      expect(addrs.length).to.equal(3);
    });
  });

  context("Borrow Money", async function() {
    this.beforeEach(async function() {
      this.usdc = await this.USDC.deploy();
      await this.usdc.deployed();
      this.loan = await this.Loan.deploy(this.usdc.address);
      await this.loan.deployed();
      await this.usdc.connect(this.owner).mint(this.alice.address, this.val);
      await this.usdc.connect(this.owner).mint(this.bob.address, this.val);
      await this.usdc.connect(this.owner).mint(this.carol.address, this.val);
      await this.usdc.connect(this.owner).approve(this.loan.address, this.val);
      await this.usdc.connect(this.alice).approve(this.loan.address, this.val);
      await this.usdc.connect(this.bob).approve(this.loan.address, this.val);
      await this.usdc.connect(this.carol).approve(this.loan.address, this.val);
      await this.loan.connect(this.owner).deposit(this.val);
      await this.loan.connect(this.alice).deposit(this.val);
      await this.loan.connect(this.bob).deposit(this.val);
    });

    it ("Users can call borrow function", async function() {
      await this.loan.connect(this.alice).borrow(1000);
    });

    it ("Only users who have staked money can call borrow function", async function() {
      await expect(this.loan.connect(this.carol).borrow(1000)).to.be.revertedWith("Not enough staked");
    });

    it ("Users can borrow up to 80% of their staked balance", async function() {
      await expect(this.loan.connect(this.alice).borrow(toWei("800001"))).to.be.revertedWith("Not enough staked");
      await this.loan.connect(this.alice).borrow(toWei("800000"));
    });

    it ("Completion of borrow function will transfer money to user", async function() {
      expect((await this.usdc.balanceOf(this.alice.address)).toNumber()).to.equal(0);
      await this.loan.connect(this.alice).borrow(800000);
      expect((await this.usdc.balanceOf(this.alice.address)).toNumber()).to.equal(800000);
    });

    it ("Borrow function will update stakedBalances", async function() {
      expect(fromWei(await this.loan.stakedBalances(this.alice.address))).to.equal(1000000);
      await this.loan.connect(this.alice).borrow(toWei("800000"));
      expect(fromWei(await this.loan.stakedBalances(this.alice.address))).to.equal(0);
    });

    it ("Borrow function will update userBalances", async function() {
      expect(fromWei(await this.loan.userBalances(this.alice.address))).to.equal(1000000);
      await this.loan.connect(this.alice).borrow(toWei("800000"));
      expect(fromWei(await this.loan.userBalances(this.alice.address))).to.equal(200000);
    });

    it ("Borrow function will update amountOwed", async function() {
      expect((await this.loan.amountOwed(this.alice.address)).toNumber()).to.equal(0);
      await this.loan.connect(this.alice).borrow(800000);
      expect((await this.loan.amountOwed(this.alice.address)).toNumber()).to.equal(800000);
    });

    it ("Borrow function will update feeOwed", async function() {
      expect((await this.loan.feeOwed(this.alice.address)).toNumber()).to.equal(0);
      await this.loan.connect(this.alice).borrow(800000);
      expect((await this.loan.feeOwed(this.alice.address)).toNumber()).to.equal(80000);
    });

    it ("Borrow function will update contract balance", async function() {
      expect(fromWei(await this.loan.balance())).to.equal(3000000);
      await this.loan.connect(this.alice).borrow(toWei("800000"));
      expect(fromWei(await this.loan.balance())).to.equal(2200000);
    });

    it ("Removes address from stakedAddresses if 80% of balance is borrowed", async function() {
      await this.loan.connect(this.alice).borrow(toWei("800000"));
      const addrs = await this.loan.getStakedAddresses();
      expect(addrs.length).to.equal(2);
      expect(addrs[0]).to.equal(this.owner.address);
      expect(addrs[1]).to.equal(this.bob.address);
    });
  });

  context("Pay back loan", async function() {
    this.beforeEach(async function() {
      this.usdc = await this.USDC.deploy();
      await this.usdc.deployed();
      this.loan = await this.Loan.deploy(this.usdc.address);
      await this.loan.deployed();
      await this.usdc.connect(this.owner).mint(this.alice.address, this.val);
      await this.usdc.connect(this.owner).mint(this.bob.address, this.val);
      await this.usdc.connect(this.owner).mint(this.carol.address, this.val);
      await this.usdc.connect(this.owner).approve(this.loan.address, this.val);
      await this.usdc.connect(this.alice).approve(this.loan.address, this.val);
      await this.usdc.connect(this.bob).approve(this.loan.address, this.val);
      await this.usdc.connect(this.carol).approve(this.loan.address, this.val);
      await this.loan.connect(this.owner).deposit(toWei("1000"));
      await this.loan.connect(this.alice).deposit(toWei("1000"));
      await this.loan.connect(this.bob).deposit(toWei("1000"));
      await this.loan.connect(this.carol).deposit(toWei("1000"));
      await this.loan.connect(this.alice).borrow(toWei("100"));
    });

    it ("Users can call pay function", async function() {
      await this.loan.connect(this.alice).pay(toWei("100"));
    });

    it ("Users can only call pay function if they owe money", async function() {
      await expect(this.loan.connect(this.carol).pay(100)).to.be.revertedWith("No money owed");
    });

    it ("Pay function transfers tokens to contract", async function() {
      expect(fromWei(await this.usdc.balanceOf(this.loan.address))).to.equal(3900);
      await this.loan.connect(this.alice).pay(toWei("50"));
      expect(fromWei(await this.usdc.balanceOf(this.loan.address))).to.equal(3950);
    });

    it ("Pay function updates contract balance", async function() {
      expect(fromWei(await this.loan.balance())).to.equal(3900);
      await this.loan.connect(this.alice).pay(toWei("50"));
      expect(fromWei(await this.loan.balance())).to.equal(3950);
    });

    it ("Pay function updates feeOwed", async function() {
      expect(fromWei(await this.loan.feeOwed(this.alice.address))).to.equal(10);
      expect(fromWei(await this.loan.amountOwed(this.alice.address))).to.equal(100);
      await this.loan.connect(this.alice).pay(toWei("5"));
      expect(fromWei(await this.loan.feeOwed(this.alice.address))).to.equal(5);
      expect(fromWei(await this.loan.amountOwed(this.alice.address))).to.equal(100);
    });

    it ("Pay function updates feeOwed when full fee payed", async function() {
      expect(fromWei(await this.loan.feeOwed(this.alice.address))).to.equal(10);
      expect(fromWei(await this.loan.amountOwed(this.alice.address))).to.equal(100);
      await this.loan.connect(this.alice).pay(toWei("10"));
      expect(fromWei(await this.loan.feeOwed(this.alice.address))).to.equal(0);
      expect(fromWei(await this.loan.amountOwed(this.alice.address))).to.equal(100);
    });

    it ("Proper updates when payment made that exceeds fees owed but not total owed", async function() {
      expect(fromWei(await this.loan.feeOwed(this.alice.address))).to.equal(10);
      expect(fromWei(await this.loan.amountOwed(this.alice.address))).to.equal(100);
      await this.loan.connect(this.alice).pay(toWei("50"));
      expect(fromWei(await this.loan.feeOwed(this.alice.address))).to.equal(0);
      expect(fromWei(await this.loan.amountOwed(this.alice.address))).to.equal(60);
    });

    it ("Cannot pay more than amount owed", async function() {
      await expect(this.loan.connect(this.alice).pay(toWei("200"))).to.be.revertedWith("More than amount owed");
    });

    it ("Pay function updates userBalances", async function() {
      expect(fromWei(await this.loan.userBalances(this.alice.address))).to.equal(900);
      await this.loan.connect(this.alice).pay(toWei("50"));
      expect(fromWei(await this.loan.userBalances(this.alice.address))).to.equal(940);
    });

    it ("Pay function updates userBalances when no fee owed", async function() {
      expect(fromWei(await this.loan.userBalances(this.alice.address))).to.equal(900);
      await this.loan.connect(this.alice).pay(toWei("10"));
      await this.loan.connect(this.alice).pay(toWei("50"));
      expect(fromWei(await this.loan.userBalances(this.alice.address))).to.equal(950);
    });

    it ("If user pays off full balance, stakedBalances is updated", async function() {
      expect(fromWei(await this.loan.stakedBalances(this.alice.address))).to.equal(875);
      await this.loan.connect(this.alice).pay(toWei("110"));
      expect(fromWei(await this.loan.stakedBalances(this.alice.address))).to.equal(1000);
    });

    it ("Adds user to stakedAddresses if full loan is paid back", async function() {
      let addrs = await this.loan.getStakedAddresses();
      expect(addrs.length).to.equal(4);
      expect(addrs[0]).to.equal(this.owner.address);
      expect(addrs[1]).to.equal(this.alice.address);
      expect(addrs[2]).to.equal(this.bob.address);
      expect(addrs[3]).to.equal(this.carol.address);

      await this.loan.connect(this.bob).borrow(toWei("800"));
      addrs = await this.loan.getStakedAddresses();
      expect(addrs.length).to.equal(3);
      expect(addrs[0]).to.equal(this.owner.address);
      expect(addrs[1]).to.equal(this.alice.address);
      expect(addrs[2]).to.equal(this.carol.address);

      await this.loan.connect(this.bob).pay(toWei("880"));
      addrs = await this.loan.getStakedAddresses();
      expect(addrs.length).to.equal(4);
      expect(addrs[0]).to.equal(this.owner.address);
      expect(addrs[1]).to.equal(this.alice.address);
      expect(addrs[2]).to.equal(this.carol.address);
      expect(addrs[3]).to.equal(this.bob.address);
    });

    xit.only ("When fees are paid, they get distributed to other stakeholders", async function() {
      expect((await this.loan.stakedBalances(this.owner.address)).toNumber()).to.equal(1000);
      expect((await this.loan.stakedBalances(this.alice.address)).toNumber()).to.equal(875);
      expect((await this.loan.stakedBalances(this.bob.address)).toNumber()).to.equal(1000);
      expect((await this.loan.stakedBalances(this.carol.address)).toNumber()).to.equal(1000);
      await this.loan.connect(this.alice).pay(8);
      expect((await this.loan.stakedBalances(this.owner.address)).toNumber()).to.equal(1002);
      expect((await this.loan.stakedBalances(this.alice.address)).toNumber()).to.equal(877);
      expect((await this.loan.stakedBalances(this.bob.address)).toNumber()).to.equal(1002);
      expect((await this.loan.stakedBalances(this.carol.address)).toNumber()).to.equal(1002);
    });
  });
});

function fromWei(num) {
  return parseInt(ethers.utils.formatEther(num));
}

function toWei(input) {
  return ethers.utils.parseEther(input);
}