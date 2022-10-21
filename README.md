# Order Book Solidity

## Table of Contents

-  [Architecture](#architecture)

-  [Local Development](#Local-Development)

-  [Install Dependencies](#install-dependencies)

-  [Compile Contracts](#compile-contracts)

-  [Run Tests](#run-tests)

## Contract address

Base Token

```
https://rinkeby.etherscan.io/address/0xe21C494B21a5E42D64C5a2a4eEE6098e67aaCeEC#code

```

Trade Token

```
https://rinkeby.etherscan.io/address/0x145551EBadAc72132bb562084596567BB497A1c4#code

```

Order Book

```
https://rinkeby.etherscan.io/address/0xcc6977FE97542BFEA4202Bf1a9017314E3d67dd9#code

```

## Architecture

![book](https://github.com/sondotpin/orderbook/blob/master/book.png?raw=true)
  


The following structs are defined in the contract and used as parameters for some methods:

  

```solidity

  

// Order

  

struct Order {

address maker;

uint256 amount;

}

  

// Step

struct Step {

uint256 higherPrice;

uint256 lowerPrice;

uint256 amount;

}

  

```

  ### Place Buy Order

| **Name** | **Type** | **Description** |

| ----------- | ----------- | --------------------------------------------------------------------------------------- |

| `price`     | `uint256`   | Price of trade token in order.                                                          |

| `amountOfBaseToken` | `uint256` | Amount of base token to buy.                                                      |

  
  

### Place Sell Order


| **Name** | **Type** | **Description** |

| --------- | --------- | --------------------------------------     |

| `tokenId` | `uint256` | Price of trade token in order.             |

| `amountOfTradeToken`  | `uint256` | Amount of trade token to sell. |
  

## Local Development

  

The following assumes `node >= 12`

  

### Install Dependencies

  

```shell script
yarn
```

  

### Compile Contracts

  

```shell script
yarn build
```

  

### Run Tests

  

```shell script
yarn test
```