import { tokenApi } from "@/api";

/**
 * 缓存已查询过的代币符号，避免重复请求
 */
const tokenSymbolCache: Record<string, string> = {};

/**
 * 获取代币符号，优先使用传入的值，如为空则尝试从API获取
 * @param symbol 已有的代币符号
 * @param tokenAddress 代币地址
 * @returns 代币符号
 */
export const getTokenSymbol = async (
  symbol: string | undefined | null,
  tokenAddress: string | undefined | null
): Promise<string> => {
  // 如果已有符号，直接返回
  if (symbol) return symbol;

  // 如果没有地址，返回未知
  if (!tokenAddress) return "未知";

  // 检查缓存
  if (tokenSymbolCache[tokenAddress]) {
    return tokenSymbolCache[tokenAddress];
  }

  try {
    // 从API获取代币信息
    const tokenInfo = await tokenApi.getTokenByAddress(tokenAddress);
    const foundSymbol = tokenInfo?.symbol || "未知";

    // 缓存结果
    tokenSymbolCache[tokenAddress] = foundSymbol;

    return foundSymbol;
  } catch (error) {
    console.error(`获取代币${tokenAddress}符号失败:`, error);
    return "未知";
  }
};

/**
 * 缩短地址显示
 * @param address 完整地址
 * @returns 缩短后的地址
 */
export const shortenAddress = (address: string): string => {
  if (!address || typeof address !== "string" || address.length < 10) {
    return address || "未知";
  }
  return `${address.substring(0, 6)}...${address.substring(
    address.length - 4
  )}`;
};
