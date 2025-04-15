import axios from "axios";
import {
  TokenVO,
  TokenCreateRequest,
  PageResponse,
  TokenStatus,
} from "./types";

// 从环境变量获取基础 URL，如果不存在则使用默认值
const API_BASE_URL =
  process.env.NEXT_PUBLIC_TOKEN_API_BASE_URL || "http://localhost:8082";
const BASE_URL = `${API_BASE_URL}/api/v1/tokens`;

// 创建 axios 实例
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true, // 允许跨域请求携带 cookie
});

// 添加请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log(
      `发送请求: ${config.method?.toUpperCase()} ${config.url}`,
      config.params || {}
    );
    return config;
  },
  (error) => {
    console.error("请求配置错误:", error);
    return Promise.reject(error);
  }
);

// 添加响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log(`收到响应: ${response.config.url}`, response.data);

    // 处理BaseResponse包装的情况
    if (
      response.data &&
      typeof response.data === "object" &&
      "code" in response.data
    ) {
      const baseResponse = response.data;

      if (baseResponse.code === 0) {
        // 成功响应，返回data字段
        return baseResponse.data;
      } else {
        // 业务错误
        console.error("API业务错误:", baseResponse.message);
        throw new Error(baseResponse.message || "请求失败");
      }
    }

    // 不是BaseResponse结构，直接返回
    return response.data;
  },
  (error) => {
    if (error.response) {
      // 服务器返回错误状态码
      console.error("API 错误:", error.response.data);
      throw new Error(error.response.data.message || "请求失败");
    } else if (error.request) {
      // 请求发出但没有收到响应
      console.error("网络错误:", error.request);
      throw new Error("网络错误，请检查网络连接");
    } else {
      // 请求配置错误
      console.error("请求错误:", error.message);
      throw error;
    }
  }
);

export const tokenApi = {
  /**
   * 创建代币
   * @param request 创建请求
   */
  createToken: async (request: TokenCreateRequest): Promise<TokenVO> => {
    try {
      return await api.post("", request);
    } catch (error) {
      console.error("创建代币失败:", error);
      throw error;
    }
  },

  /**
   * 分页查询代币列表
   * @param page 页码
   * @param size 每页大小
   * @param keyword 搜索关键词
   * @param status 代币状态
   */
  pageTokens: async (
    page: number,
    size: number,
    keyword?: string,
    status?: TokenStatus
  ): Promise<PageResponse<TokenVO>> => {
    try {
      const params = {
        page: page.toString(),
        size: size.toString(),
        ...(keyword && { keyword }),
        ...(status && { status }),
        sort: "createdAt,desc",
      };

      return await api.get("/page", { params });
    } catch (error) {
      console.error("分页查询代币列表失败:", error);
      throw error;
    }
  },

  /**
   * 根据代币地址获取详情
   * @param address 代币地址
   */
  getTokenByAddress: async (address: string): Promise<TokenVO> => {
    try {
      return await api.get(`/address/${address}`);
    } catch (error) {
      console.error(`获取代币(地址: ${address})详情失败:`, error);
      throw error;
    }
  },

  /**
   * 刷新代币缓存
   * @param address 代币地址
   */
  refreshTokenCache: async (address: string): Promise<void> => {
    try {
      return await api.post(`/refresh/${address}`);
    } catch (error) {
      console.error(`刷新代币(地址: ${address})缓存失败:`, error);
      throw error;
    }
  },
};
