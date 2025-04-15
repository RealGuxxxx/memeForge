// 基础响应类型
export interface BaseResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 分页响应类型
export interface PageResponse<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

// Token 相关类型定义
export enum TokenStatus {
  ACTIVE = "ACTIVE",
  FREEZE = "FREEZE",
}

export interface TokenVO {
  id: number;
  tokenAddress: string;
  name: string;
  symbol: string;
  description: string;
  totalSupply: number;
  ipfsCid: string;
  status: TokenStatus;
  createdAt: string;
  logoUrl?: string;
}

// 对外暴露一个获取合约地址的便捷getter，保持兼容性
export const getContractAddress = (token: TokenVO): string => {
  return token.tokenAddress;
};

// 创建代币请求参数
export interface TokenCreateRequest {
  tokenAddress: string;
  name: string;
  symbol: string;
  description?: string;
  ipfsCid: string;
  totalSupply: string;
  creatorAddress: string;
}

// Token持仓相关类型定义
export interface TokenHoldingVO {
  tokenAddress: string;
  holderAddress: string;
  balance: string;
  percentage?: number;
  rank?: number;
  updatedAt: string;
}

export interface TokenHolding {
  holderAddress: string;
  tokenAddress: string;
  balance: string;
  updatedAt: string;
}

/**
 * 代币基本信息VO
 */
export interface TokenBasicInfoVO {
  /**
   * 代币地址
   */
  tokenAddress: string;

  /**
   * 代币名称
   */
  name: string;

  /**
   * 代币符号
   */
  symbol: string;

  /**
   * 代币图标IPFS CID
   */
  ipfsCid?: string;

  /**
   * 代币精度
   */
  decimals: number;
}
