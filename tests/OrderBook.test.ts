import chai, { expect } from 'chai';
import { Signer } from 'ethers';
import asPromised from "chai-as-promised";
// @ts-ignore
import { ethers } from "hardhat";
import { OrderBookFactory } from '../typechain/OrderBookFactory';
import { Erc20TestFactory } from '../typechain/Erc20TestFactory';
import { OrderBook } from '../typechain/OrderBook';
import { Erc20Test } from '../typechain/Erc20Test';
import { parseAmount } from '../utils';

chai.use(asPromised);

describe("OrderBook", () => {
  let deployer: Signer;
  let acc1: Signer;
  let acc2: Signer;
  let acc3: Signer;
  let acc4: Signer;
  let acc5: Signer;
  let tradeToken: Erc20Test;
  let baseToken: Erc20Test;
  let book: OrderBook;

  async function deployErc20(name: string, symbol: string) {
    const token = await (await new Erc20TestFactory(deployer).deploy(name, symbol)).deployed();
    return token;
  }

  async function deploy() {
    baseToken = await deployErc20('baseToken', 'baseToken');
    tradeToken = await deployErc20('tradeToken', 'tradeToken');
    book = await (await new OrderBookFactory(deployer).deploy(tradeToken.address, baseToken.address)).deployed();
  }

  beforeEach(async () => {
    [deployer, acc1, acc2, acc3, acc4, acc5] = await ethers.getSigners();
    await deploy();
    await baseToken.connect(deployer).transfer(await acc1.getAddress(), parseAmount(1000, 18));
    await baseToken.connect(deployer).transfer(await acc2.getAddress(), parseAmount(1000, 18));
    await baseToken.connect(deployer).transfer(await acc3.getAddress(), parseAmount(1000, 18));
    await baseToken.connect(deployer).transfer(await acc4.getAddress(), parseAmount(1000, 18));

    await tradeToken.connect(deployer).transfer(await acc1.getAddress(), parseAmount(1000, 18));
    await tradeToken.connect(deployer).transfer(await acc2.getAddress(), parseAmount(1000, 18));
    await tradeToken.connect(deployer).transfer(await acc3.getAddress(), parseAmount(1000, 18));
    await tradeToken.connect(deployer).transfer(await acc4.getAddress(), parseAmount(1000, 18));

    await baseToken.connect(acc1).approve(book.address, parseAmount(1000, 18));
    await baseToken.connect(acc2).approve(book.address, parseAmount(1000, 18));
    await baseToken.connect(acc3).approve(book.address, parseAmount(1000, 18));
    await baseToken.connect(acc4).approve(book.address, parseAmount(1000, 18));

    await tradeToken.connect(acc1).approve(book.address, parseAmount(1000, 18));
    await tradeToken.connect(acc2).approve(book.address, parseAmount(1000, 18));
    await tradeToken.connect(acc3).approve(book.address, parseAmount(1000, 18));
    await tradeToken.connect(acc4).approve(book.address, parseAmount(1000, 18));
  });

  describe("#place buy order not matching", () => {
    it("should not buy if not enough money", async() => {
      await expect(book.connect(acc1).placeBuyOrder(0, parseAmount(1001, 18))).eventually.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ERC20: transfer amount exceeds balance'");
    });

    it("should not buy with price 0", async() => {
      await expect(book.connect(acc1).placeBuyOrder(0, parseAmount(1000, 18))).eventually.rejectedWith('Can not place order with price equal 0');
    });

    it("should place first buy", async() => {
      await book.connect(acc1).placeBuyOrder(1, parseAmount(1000, 18));

      const [
        buyOrdersInStepCounter,
        step,
      ] = await Promise.all([
        book.buyOrdersInStepCounter(1),
        book.buySteps(1),
      ]);

      expect(buyOrdersInStepCounter).to.eq(1);
      expect(step.amount.toString()).to.eq(parseAmount(1000, 18).toString());
      expect(step.lowerPrice.toNumber()).to.eq(0);
    });

    it("should place second buy", async() => {
      await book.connect(acc1).placeBuyOrder(1, parseAmount(1000, 18));
      expect((await book.maxBuyPrice()).toNumber()).to.eq(1);
      await book.connect(acc2).placeBuyOrder(2, parseAmount(1000, 18));
      expect((await book.maxBuyPrice()).toNumber()).to.eq(2);
      await book.connect(acc3).placeBuyOrder(3, parseAmount(1000, 18));
      await book.connect(acc4).placeBuyOrder(2, parseAmount(500, 18));

      const [
        buyOrdersInStepCounter1,
        buyOrdersInStepCounter2,
        buyOrdersInStepCounter3,
        step1,
        step2,
        step3,
        order1InStep2,
        order2InStep2,
      ] = await Promise.all([
        book.buyOrdersInStepCounter(1),
        book.buyOrdersInStepCounter(2),
        book.buyOrdersInStepCounter(3),
        book.buySteps(1),
        book.buySteps(2),
        book.buySteps(3),
        book.buyOrdersInStep(2, 1),
        book.buyOrdersInStep(2, 2),
      ]);

      expect(buyOrdersInStepCounter1).to.eq(1);
      expect(buyOrdersInStepCounter2).to.eq(2);
      expect(buyOrdersInStepCounter3).to.eq(1);

      expect(step1.amount.toString()).to.eq(parseAmount(1000, 18).toString());
      expect(step1.lowerPrice.toNumber()).to.eq(0);
      expect(step1.higherPrice.toNumber()).to.eq(2);

      expect(step2.amount.toString()).to.eq(parseAmount(1500, 18).toString());
      expect(step2.lowerPrice.toNumber()).to.eq(1);
      expect(step2.higherPrice.toNumber()).to.eq(3);

      expect(step3.amount.toString()).to.eq(parseAmount(1000, 18).toString());
      expect(step3.lowerPrice.toNumber()).to.eq(2);
      expect(step3.higherPrice.toNumber()).to.eq(0);

      expect(order1InStep2.amount.toString()).to.eq(parseAmount(1000, 18).toString());
      expect(order1InStep2.maker).to.eq(await acc2.getAddress());

      expect(order2InStep2.amount.toString()).to.eq(parseAmount(500, 18).toString());
      expect(order2InStep2.maker).to.eq(await acc4.getAddress());
    });
  });

  describe("#place sell order not matching", () => {
    it("should not sell if not enough money", async() => {
      await expect(book.connect(acc1).placeSellOrder(0, parseAmount(1001, 18))).eventually.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ERC20: transfer amount exceeds balance'");
    });

    it("should not buy with price 0", async() => {
      await expect(book.connect(acc1).placeSellOrder(0, parseAmount(1000, 18))).eventually.rejectedWith('Can not place order with price equal 0');
    });

    it("should place first sell", async() => {
      await book.connect(acc1).placeSellOrder(1, parseAmount(1000, 18));

      const [
        sellOrdersInStepCounter,
        step,
      ] = await Promise.all([
        book.sellOrdersInStepCounter(1),
        book.sellSteps(1),
      ]);

      expect(sellOrdersInStepCounter).to.eq(1);
      expect(step.amount.toString()).to.eq(parseAmount(1000, 18).toString());
      expect(step.lowerPrice.toNumber()).to.eq(0);
    });

    it("should place second sell", async() => {
      await book.connect(acc1).placeSellOrder(1, parseAmount(1000, 18));
      expect((await book.minSellPrice()).toNumber()).to.eq(1);
      await book.connect(acc2).placeSellOrder(2, parseAmount(1000, 18));
      expect((await book.minSellPrice()).toNumber()).to.eq(1);
      await book.connect(acc3).placeSellOrder(3, parseAmount(1000, 18));
      await book.connect(acc4).placeSellOrder(2, parseAmount(500, 18));

      const [
        sellOrdersInStepCounter1,
        sellOrdersInStepCounter2,
        sellOrdersInStepCounter3,
        step1,
        step2,
        step3,
        order1InStep2,
        order2InStep2,
      ] = await Promise.all([
        book.sellOrdersInStepCounter(1),
        book.sellOrdersInStepCounter(2),
        book.sellOrdersInStepCounter(3),
        book.sellSteps(1),
        book.sellSteps(2),
        book.sellSteps(3),
        book.sellOrdersInStep(2, 1),
        book.sellOrdersInStep(2, 2),
      ]);

      expect(sellOrdersInStepCounter1).to.eq(1);
      expect(sellOrdersInStepCounter2).to.eq(2);
      expect(sellOrdersInStepCounter3).to.eq(1);

      expect(step1.amount.toString()).to.eq(parseAmount(1000, 18).toString());
      expect(step1.lowerPrice.toNumber()).to.eq(0);
      expect(step1.higherPrice.toNumber()).to.eq(2);

      expect(step2.amount.toString()).to.eq(parseAmount(1500, 18).toString());
      expect(step2.lowerPrice.toNumber()).to.eq(1);
      expect(step2.higherPrice.toNumber()).to.eq(3);

      expect(step3.amount.toString()).to.eq(parseAmount(1000, 18).toString());
      expect(step3.lowerPrice.toNumber()).to.eq(2);
      expect(step3.higherPrice.toNumber()).to.eq(0);

      expect(order1InStep2.amount.toString()).to.eq(parseAmount(1000, 18).toString());
      expect(order1InStep2.maker).to.eq(await acc2.getAddress());

      expect(order2InStep2.amount.toString()).to.eq(parseAmount(500, 18).toString());
      expect(order2InStep2.maker).to.eq(await acc4.getAddress());
    });
  });

  describe("#place buy order match with current sell orders ", () => {
    it("should place an instant buy (perfect match)", async() => {
      await book.connect(acc1).placeSellOrder(1, parseAmount(500, 18));
      await book.connect(acc1).placeSellOrder(2, parseAmount(500, 18));
      expect((await book.sellSteps(2)).lowerPrice.toNumber()).to.eq(1);

      await book.connect(acc2).placeBuyOrder(1, parseAmount(500, 18));

      const [
        buyOrdersInStepCounter1,
        sellOrdersInStepCounter1,
        buyStep1,
        sellStep1,
        sellStep2,
        buyOrderInStep1,
        sellOrderInStep1,
      ] = await Promise.all([
        book.buyOrdersInStepCounter(1),
        book.sellOrdersInStepCounter(1),
        book.buySteps(1),
        book.sellSteps(1),
        book.sellSteps(2),
        book.buyOrdersInStep(1, 1),
        book.sellOrdersInStep(1, 1),
      ]);

      expect(buyOrdersInStepCounter1).to.eq(0);
      expect(sellOrdersInStepCounter1).to.eq(0);

      expect(sellStep1.amount.toNumber()).to.eq(0);
      expect(sellStep1.lowerPrice.toNumber()).to.eq(0);
      expect(sellStep1.higherPrice.toNumber()).to.eq(0);

      expect(sellStep2.amount.toString()).to.eq(parseAmount(500, 18).toString());
      expect(sellStep2.lowerPrice.toNumber()).to.eq(0);
      expect(sellStep2.higherPrice.toNumber()).to.eq(0);

      expect(buyStep1.amount.toNumber()).to.eq(0);
      expect(buyStep1.lowerPrice.toNumber()).to.eq(0);
      expect(buyStep1.higherPrice.toNumber()).to.eq(0);

      expect(buyOrderInStep1.amount.toNumber()).to.eq(0);
      expect(buyOrderInStep1.maker).to.eq(ethers.constants.AddressZero);

      expect(sellOrderInStep1.amount.toNumber()).to.eq(0);
      expect(sellOrderInStep1.maker).to.eq(ethers.constants.AddressZero);
    });

    it("should place an over step buy", async() => {
      await book.connect(acc1).placeSellOrder(1, parseAmount(500, 18));
      await book.connect(acc1).placeSellOrder(2, parseAmount(500, 18));
      await book.connect(acc2).placeBuyOrder(1, parseAmount(1000, 18));
  
      const [
        buyOrdersInStepCounter1,
        sellOrdersInStepCounter1,
        buyStep1,
        sellStep1,
        sellStep2,
        buyOrderInStep1,
        sellOrderInStep1,
      ] = await Promise.all([
        book.buyOrdersInStepCounter(1),
        book.sellOrdersInStepCounter(1),
        book.buySteps(1),
        book.sellSteps(1),
        book.sellSteps(2),
        book.buyOrdersInStep(1, 1),
        book.sellOrdersInStep(1, 1),
      ]);
  
      expect(buyOrdersInStepCounter1).to.eq(1);
      expect(sellOrdersInStepCounter1).to.eq(0);
  
      expect(sellStep1.amount.toNumber()).to.eq(0);
      expect(sellStep1.lowerPrice.toNumber()).to.eq(0);
      expect(sellStep1.higherPrice.toNumber()).to.eq(0);
  
      expect(sellStep2.amount.toString()).to.eq(parseAmount(500, 18).toString());
      expect(sellStep2.lowerPrice.toNumber()).to.eq(0);
      expect(sellStep2.higherPrice.toNumber()).to.eq(0);
  
      expect(buyStep1.amount.toString()).to.eq(parseAmount(500, 18).toString());
      expect(buyStep1.lowerPrice.toNumber()).to.eq(0);
      expect(buyStep1.higherPrice.toNumber()).to.eq(0);
  
      expect(buyOrderInStep1.amount.toString()).to.eq(parseAmount(500, 18).toString());
      expect(buyOrderInStep1.maker).to.eq(await acc2.getAddress());
  
      expect(sellOrderInStep1.amount.toNumber()).to.eq(0);
      expect(sellOrderInStep1.maker).to.eq(ethers.constants.AddressZero);
    });

    it("should place an over 2 step buy", async() => {
      await book.connect(acc2).placeBuyOrder(1, parseAmount(100, 18));
      await book.connect(acc2).placeBuyOrder(2, parseAmount(100, 18));
      await book.connect(acc1).placeSellOrder(4, parseAmount(100, 18));
      await book.connect(acc1).placeSellOrder(5, parseAmount(100, 18));
      await book.connect(acc2).placeBuyOrder(5, parseAmount(150, 18));
  
      const [
        buyOrdersInStepCounter1,
        buyOrdersInStepCounter2,
        buyOrdersInStepCounter5,
        sellOrdersInStepCounter4,
        sellOrdersInStepCounter5,
        buyStep1,
        buyStep2,
        buyStep5,
        sellStep4,
        sellStep5,
      ] = await Promise.all([
        book.buyOrdersInStepCounter(1),
        book.buyOrdersInStepCounter(2),
        book.buyOrdersInStepCounter(5),
        book.sellOrdersInStepCounter(4),
        book.sellOrdersInStepCounter(5),
        book.buySteps(1),
        book.buySteps(2),
        book.buySteps(5),
        book.sellSteps(4),
        book.sellSteps(5),
      ]);
      const sellOrdersInStep51 = await book.sellOrdersInStep(5, 1);
      expect((await book.maxBuyPrice()).toNumber()).to.eq(2);
  
      expect(buyOrdersInStepCounter1).to.eq(1);
      expect(buyOrdersInStepCounter2).to.eq(1);
      expect(buyOrdersInStepCounter5).to.eq(0);
      expect(sellOrdersInStepCounter4).to.eq(0);
      expect(sellOrdersInStepCounter5).to.eq(1);
  
      expect(buyStep1.amount.toString()).to.eq(parseAmount(100, 18).toString());
      expect(buyStep1.lowerPrice.toNumber()).to.eq(0);
      expect(buyStep1.higherPrice.toNumber()).to.eq(2);
  
      expect(buyStep2.amount.toString()).to.eq(parseAmount(100, 18).toString());
      expect(buyStep2.lowerPrice.toNumber()).to.eq(1);
      expect(buyStep2.higherPrice.toNumber()).to.eq(0);
  
      expect(buyStep5.amount.toNumber()).to.eq(0);
      expect(buyStep5.lowerPrice.toNumber()).to.eq(0);
      expect(buyStep5.higherPrice.toNumber()).to.eq(0);

      expect(sellStep4.amount.toNumber()).to.eq(0);
      expect(sellStep4.lowerPrice.toNumber()).to.eq(0);
      expect(sellStep4.higherPrice.toNumber()).to.eq(0);

      expect(sellStep5.amount.toString()).to.eq(parseAmount(50, 18).toString());
      expect(sellStep5.lowerPrice.toNumber()).to.eq(0);
      expect(sellStep5.higherPrice.toNumber()).to.eq(0);
  
      expect(sellOrdersInStep51.amount.toString()).to.eq(parseAmount(50, 18).toString());
      expect(sellOrdersInStep51.maker).to.eq(await acc1.getAddress());
    });
  });

  describe("#place sell order match with current buy orders ", () => {
    it("should place an instant buy (perfect match)", async() => {
      await book.connect(acc1).placeBuyOrder(1, parseAmount(500, 18));
      await book.connect(acc1).placeBuyOrder(2, parseAmount(500, 18));
      await book.connect(acc2).placeSellOrder(2, parseAmount(500, 18));

      const [
        buyOrdersInStepCounter2,
        sellOrdersInStepCounter2,
        sellStep2,
        buyStep1,
        buyStep2,
        buyOrderInStep2,
        sellOrderInStep2,
      ] = await Promise.all([
        book.buyOrdersInStepCounter(2),
        book.sellOrdersInStepCounter(2),
        book.sellSteps(2),
        book.buySteps(1),
        book.buySteps(2),
        book.buyOrdersInStep(2, 1),
        book.sellOrdersInStep(2, 1),
      ]);

      expect(buyOrdersInStepCounter2).to.eq(0);
      expect(sellOrdersInStepCounter2).to.eq(0);

      expect(sellStep2.amount.toNumber()).to.eq(0);
      expect(sellStep2.lowerPrice.toNumber()).to.eq(0);
      expect(sellStep2.higherPrice.toNumber()).to.eq(0);

      expect(buyStep1.amount.toString()).to.eq(parseAmount(500, 18).toString());
      expect(buyStep1.lowerPrice.toNumber()).to.eq(0);
      expect(buyStep1.higherPrice.toNumber()).to.eq(0);

      expect(buyStep2.amount.toNumber()).to.eq(0);
      expect(buyStep2.lowerPrice.toNumber()).to.eq(0);
      expect(buyStep2.higherPrice.toNumber()).to.eq(0);

      expect(buyOrderInStep2.amount.toNumber()).to.eq(0);
      expect(buyOrderInStep2.maker).to.eq(ethers.constants.AddressZero);

      expect(sellOrderInStep2.amount.toNumber()).to.eq(0);
      expect(sellOrderInStep2.maker).to.eq(ethers.constants.AddressZero);
    });

    it("should place an over step buy", async() => {
      await book.connect(acc1).placeBuyOrder(1, parseAmount(500, 18));
      await book.connect(acc1).placeBuyOrder(2, parseAmount(500, 18));
      await book.connect(acc2).placeSellOrder(2, parseAmount(1000, 18));
  
      const [
        buyOrdersInStepCounter2,
        sellOrdersInStepCounter2,
        buyStep1,
        buyStep2,
        sellStep2,
        buyOrderInStep2,
        sellOrderInStep2,
      ] = await Promise.all([
        book.buyOrdersInStepCounter(2),
        book.sellOrdersInStepCounter(2),
        book.buySteps(1),
        book.buySteps(2),
        book.sellSteps(2),
        book.buyOrdersInStep(2, 1),
        book.sellOrdersInStep(2, 1),
      ]);
  
      expect(buyOrdersInStepCounter2).to.eq(0);
      expect(sellOrdersInStepCounter2).to.eq(1);
  
      expect(buyStep2.amount.toNumber()).to.eq(0);
      expect(buyStep2.lowerPrice.toNumber()).to.eq(0);
      expect(buyStep2.higherPrice.toNumber()).to.eq(0);
  
      expect(buyStep1.amount.toString()).to.eq(parseAmount(500, 18).toString());
      expect(buyStep1.lowerPrice.toNumber()).to.eq(0);
      expect(buyStep1.higherPrice.toNumber()).to.eq(0);
  
      expect(sellStep2.amount.toString()).to.eq(parseAmount(500, 18).toString());
      expect(sellStep2.lowerPrice.toNumber()).to.eq(0);
      expect(sellStep2.higherPrice.toNumber()).to.eq(0);
  
      expect(sellOrderInStep2.amount.toString()).to.eq(parseAmount(500, 18).toString());
      expect(sellOrderInStep2.maker).to.eq(await acc2.getAddress());
  
      expect(buyOrderInStep2.amount.toNumber()).to.eq(0);
      expect(buyOrderInStep2.maker).to.eq(ethers.constants.AddressZero);
    });

    it("should place an over 2 step buy", async() => {
      await book.connect(acc2).placeBuyOrder(1, parseAmount(100, 18));
      await book.connect(acc2).placeBuyOrder(2, parseAmount(100, 18));
      await book.connect(acc1).placeSellOrder(4, parseAmount(100, 18));
      await book.connect(acc1).placeSellOrder(5, parseAmount(100, 18));
      await book.connect(acc2).placeSellOrder(1, parseAmount(150, 18));
  
      const [
        buyOrdersInStepCounter1,
        buyOrdersInStepCounter2,
        sellOrdersInStepCounter1,
        sellOrdersInStepCounter4,
        sellOrdersInStepCounter5,
        buyStep1,
        buyStep2,
        sellStep1,
        sellStep4,
        sellStep5,
      ] = await Promise.all([
        book.buyOrdersInStepCounter(1),
        book.buyOrdersInStepCounter(2),
        book.sellOrdersInStepCounter(1),
        book.sellOrdersInStepCounter(4),
        book.sellOrdersInStepCounter(5),
        book.buySteps(1),
        book.buySteps(2),
        book.sellSteps(1),
        book.sellSteps(4),
        book.sellSteps(5),
      ]);
      const buyOrdersInStep51 = await book.buyOrdersInStep(1, 1);
      expect((await book.maxBuyPrice()).toNumber()).to.eq(1);
  
      expect(buyOrdersInStepCounter1).to.eq(1);
      expect(buyOrdersInStepCounter2).to.eq(0);
      expect(sellOrdersInStepCounter1).to.eq(0);
      expect(sellOrdersInStepCounter4).to.eq(1);
      expect(sellOrdersInStepCounter5).to.eq(1);
  
      expect(buyStep1.amount.toString()).to.eq(parseAmount(50, 18).toString());
      expect(buyStep1.lowerPrice.toNumber()).to.eq(0);
      expect(buyStep1.higherPrice.toNumber()).to.eq(0);
  
      expect(buyStep2.amount.toNumber()).to.eq(0);
      expect(buyStep2.lowerPrice.toNumber()).to.eq(0);
      expect(buyStep2.higherPrice.toNumber()).to.eq(0);
  
      expect(sellStep1.amount.toNumber()).to.eq(0);
      expect(sellStep1.lowerPrice.toNumber()).to.eq(0);
      expect(sellStep1.higherPrice.toNumber()).to.eq(0);

      expect(sellStep4.amount.toString()).to.eq(parseAmount(100, 18).toString());
      expect(sellStep4.lowerPrice.toNumber()).to.eq(0);
      expect(sellStep4.higherPrice.toNumber()).to.eq(5);

      expect(sellStep5.amount.toString()).to.eq(parseAmount(100, 18).toString());
      expect(sellStep5.lowerPrice.toNumber()).to.eq(4);
      expect(sellStep5.higherPrice.toNumber()).to.eq(0);
  
      expect(buyOrdersInStep51.amount.toString()).to.eq(parseAmount(50, 18).toString());
      expect(buyOrdersInStep51.maker).to.eq(await acc2.getAddress());
    });
  });
});