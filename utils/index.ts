import { BigNumber } from "ethers";

export const parseAmount = (amount: number | string, decimals: number | string) => BigNumber.from(amount).mul(BigNumber.from(10).pow(decimals));