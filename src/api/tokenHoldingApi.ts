import axios from 'axios';
import { TokenHoldingVO, TokenHolding, PageResponse, TokenBasicInfoVO } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_TOKEN_API_BASE_URL || 'http://localhost:8082';
const BASE_URL = `${API_BASE_URL}/api/v1/token-holdings`;

// 创建 axios 实例
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: true, // 允许跨域请求携带 cookie
});

// 添加响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response) {
      // 服务器返回错误状态码
      console.error('API Error:', error.response.data);
      throw new Error(error.response.data.message || '请求失败');
    } else if (error.request) {
      // 请求发出但没有收到响应
      console.error('Network Error:', error.request);
      throw new Error('网络错误，请检查网络连接');
    } else {
      // 请求配置出错
      console.error('Request Error:', error.message);
      throw error;
    }
  }
);


// 定义 API 服务
export const tokenHoldingApi = {
  /**
   * 获取代币持仓列表
   * @param tokenAddress 代币地址
   * @param pageNum 页码
   * @param pageSize 每页大小
   */
  getTokenHoldings: async (
    tokenAddress: string, 
    pageNum = 1, 
    pageSize = 10
  ): Promise<PageResponse<TokenHoldingVO>> => {
    return await api.get(`/token/${tokenAddress}`, {
      params: { pageNum, pageSize }
    });
  },

  /**
   * 获取代币持有人数量
   * @param tokenAddress 代币地址
   */
  getHoldersCount: async (tokenAddress: string): Promise<number> => {
    return await api.get(`/token/${tokenAddress}/holders-count`);
  },

  /**
   * 获取代币流通量
   * @param tokenAddress 代币地址
   */
  getCirculatingSupply: async (tokenAddress: string): Promise<string> => {
    return await api.get(`/token/${tokenAddress}/circulating-supply`);
  },

  /**
   * 获取代币余额
   * @param tokenAddress 代币地址
   * @param holderAddress 持有者地址
   */
  getTokenBalance: async (tokenAddress: string, holderAddress: string): Promise<string> => {
    return await api.get(`/token/${tokenAddress}/holder/${holderAddress}`);
  },

  /**
   * 更新代币持仓
   * @param tokenAddress 代币地址
   * @param holderAddress 持有者地址
   * @param balance 余额
   */
  updateTokenHolding: async (
    tokenAddress: string, 
    holderAddress: string, 
    balance: string
  ): Promise<boolean> => {
    return await api.put(`/token/${tokenAddress}/holder/${holderAddress}`, null, {
      params: { balance }
    });
  },

  /**
   * 批量更新代币持仓
   * @param tokenAddress 代币地址
   * @param holdings 持仓列表
   */
  batchUpdateTokenHoldings: async (
    tokenAddress: string, 
    holdings: TokenHolding[]
  ): Promise<number> => {
    return await api.put(`/token/${tokenAddress}/batch`, holdings);
  },

  /**
   * 获取地址持有的代币列表
   * @param holderAddress 持有者地址
   * @param pageNum 页码
   * @param pageSize 每页大小
   */
  getAddressHoldings: async (
    holderAddress: string, 
    pageNum = 1, 
    pageSize = 10
  ): Promise<PageResponse<TokenHoldingVO>> => {
    return await api.get(`/holder/${holderAddress}`, {
      params: { pageNum, pageSize }
    });
  },

  /**
   * 获取代币前N大持有者
   * @param tokenAddress 代币地址
   * @param limit 数量限制
   */
  getTopHolders: async (tokenAddress: string, limit = 10): Promise<TokenHoldingVO[]> => {
    return await api.get(`/token/${tokenAddress}/top-holders`, {
      params: { limit }
    });
  },

  /**
   * 获取用户交易过的代币列表
   * @param holderAddress 用户地址
   */
  getUserTradedTokens: async (holderAddress: string): Promise<TokenBasicInfoVO[]> => {
    const response = await api.get(`/holder/${holderAddress}/traded-tokens`);
    return response.data;
  }
}; 