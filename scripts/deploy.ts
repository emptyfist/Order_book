// @ts-ignore
import { ethers } from "hardhat";
import  fs from "fs-extra";
import { OrderBookFactory, Erc20TestFactory } from "../typechain";

async function main() {
  const args = require("minimist")(process.argv.slice(2));

  if (!args.chainId) {
    throw new Error("--chainId chain ID is required");
  }
  const path = `${process.cwd()}/.env${
    args.chainId === 1 ? ".prod" : args.chainId === 4 ? ".dev" : ".local"
  }`;
  await require("dotenv").config({ path });
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.RINKEBY_RPC_ENDPOINT,
  );
  const wallet = new ethers.Wallet(`0x${process.env.PRIVATE_KEY}`, provider);
  const addressPath = `${process.cwd()}/deployed-info/${args.chainId}.json`;
  
  // @ts-ignore
  const addressBook = JSON.parse(await fs.readFileSync(addressPath));
  
  console.log('Deploying Base Token...');
  const deployBaseTokenTx = await new Erc20TestFactory(wallet).deploy("Base", "Base");
  console.log('Deploy TX: ', deployBaseTokenTx.deployTransaction.hash);
  await deployBaseTokenTx.deployed();
  console.log('Base Token deployed at ', deployBaseTokenTx.address);
  addressBook.baseToken = deployBaseTokenTx.address;


  console.log('Deploying Trade Token...');
  const deployTradeTokenTx = await new Erc20TestFactory(wallet).deploy("Trade", "Trade");
  console.log('Deploy TX: ', deployTradeTokenTx.deployTransaction.hash);
  await deployTradeTokenTx.deployed();
  console.log('Trade Token deployed at ', deployTradeTokenTx.address);
  addressBook.tradeToken = deployTradeTokenTx.address;


  console.log('Deploying OrderBook...');
  const deployOrderBookTx = await new OrderBookFactory(wallet).deploy(deployTradeTokenTx.address, deployBaseTokenTx.address);
  console.log('Deploy TX: ', deployOrderBookTx.deployTransaction.hash);
  await deployOrderBookTx.deployed();
  console.log('OrderBook deployed at ', deployOrderBookTx.address);
  addressBook.orderBook = deployOrderBookTx.address;

  await fs.writeFile(addressPath, JSON.stringify(addressBook, null, 2));

  console.log("Order Book contracts deployed 📿");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
