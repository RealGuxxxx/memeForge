import { ethers } from "ethers";

/**
 * 安全调用合约的decimals函数，如果合约不支持则返回默认值
 * @param contract ethers合约实例
 * @param defaultValue 默认精度值
 * @returns 代币精度
 */
export const safeGetDecimals = async (
  contract: ethers.Contract,
  defaultValue: number = 18
): Promise<number> => {
  try {
    // 尝试获取代币精度
    const decimals = await contract.decimals();
    return Number(decimals);
  } catch (error) {
    console.warn("获取代币精度失败，使用默认值:", defaultValue, error);
    return defaultValue;
  }
};

/**
 * 安全调用合约的balanceOf函数
 * @param contract ethers合约实例
 * @param address 地址
 * @param decimals 代币精度，默认18
 * @returns 格式化后的余额
 */
export const safeGetBalance = async (
  contract: ethers.Contract,
  address: string,
  decimals: number = 18
): Promise<string> => {
  try {
    // 尝试获取余额
    const balance = await contract.balanceOf(address);
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    console.warn("获取代币余额失败，返回0:", error);
    return "0";
  }
};

/**
 * 安全调用合约的symbol函数
 * @param contract ethers合约实例
 * @param defaultSymbol 默认代币符号
 * @returns 代币符号
 */
export const safeGetSymbol = async (
  contract: ethers.Contract,
  defaultSymbol: string = "TOKEN"
): Promise<string> => {
  try {
    // 尝试获取代币符号
    return await contract.symbol();
  } catch (error) {
    console.warn("获取代币符号失败，使用默认值:", defaultSymbol, error);
    return defaultSymbol;
  }
};

/**
 * 安全调用合约的name函数
 * @param contract ethers合约实例
 * @param defaultName 默认代币名称
 * @returns 代币名称
 */
export const safeGetName = async (
  contract: ethers.Contract,
  defaultName: string = "Unknown Token"
): Promise<string> => {
  try {
    // 尝试获取代币名称
    return await contract.name();
  } catch (error) {
    console.warn("获取代币名称失败，使用默认值:", defaultName, error);
    return defaultName;
  }
};
