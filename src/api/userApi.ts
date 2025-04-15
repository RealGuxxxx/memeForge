import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_USER_API_BASE_URL || "http://localhost:8081";
const BASE_URL = `${API_BASE_URL}/api/v1/users`;

// 创建 axios 实例
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: true, // 允许跨域请求携带 cookie
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// 添加请求拦截器 - 添加公共头信息
api.interceptors.request.use(
  (config) => {
    console.log(`发送请求: ${config.url}`, config.data || {});
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 添加响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // 服务器返回错误状态码
      console.error("API Error:", error.response.data);

      // 详细日志
      console.error("Error Status:", error.response.status);
      console.error("Error Headers:", error.response.headers);
      console.error("Error Data:", error.response.data);

      // 特殊处理401错误
      if (error.response.status === 401) {
        console.warn("未授权访问，尝试重新登录");
        // 可以在这里添加自动重新登录的逻辑
      }

      // 400错误通常是请求参数问题
      if (error.response.status === 400) {
        console.warn("请求参数错误:", error.response.data);
      }

      throw new Error(error.response.data.message || "请求失败");
    } else if (error.request) {
      // 请求发出但没有收到响应
      console.error("Network Error:", error.request);
      throw new Error("网络错误，请检查网络连接");
    } else {
      // 请求配置出错
      console.error("Request Error:", error.message);
      throw error;
    }
  }
);

export interface Web3LoginDTO {
  walletAddress: string;
  signature: string;
}

export interface UpdateUserDTO {
  nickname?: string;
  avatar?: string;
  bio?: string;
}

export interface UserVO {
  id: number;
  walletAddress: string;
  nickname: string;
  avatar: string;
  bio: string;
  createdAt: string;
  updatedAt: string;
}

export const userApi = {
  getNonce: async (walletAddress: string): Promise<string> => {
    const response = await api.get("/nonce", {
      params: { walletAddress },
    });
    return response.data;
  },

  web3Login: async (loginDTO: Web3LoginDTO): Promise<UserVO> => {
    const response = await api.post("/web3-login", loginDTO);
    return response.data;
  },

  getUserInfo: async (userId: number): Promise<UserVO> => {
    const response = await api.get(`/${userId}`);
    return response.data;
  },

  updateUserInfo: async (
    userId: number,
    updateDTO: UpdateUserDTO
  ): Promise<UserVO> => {
    // 确保userId是有效的数字
    if (!userId || isNaN(Number(userId))) {
      throw new Error("无效的用户ID");
    }

    // 校验参数
    if (
      updateDTO.nickname &&
      (updateDTO.nickname.length < 2 || updateDTO.nickname.length > 20)
    ) {
      throw new Error("昵称长度应在2-20个字符之间");
    }

    if (updateDTO.bio && updateDTO.bio.length > 200) {
      throw new Error("个人简介长度不能超过200个字符");
    }

    if (updateDTO.avatar && !updateDTO.avatar.startsWith("http")) {
      throw new Error("头像必须是有效的URL");
    }

    // 删除undefined和null值，但保留空字符串(这可能是问题所在)
    const cleanDTO = Object.fromEntries(
      Object.entries(updateDTO).filter(
        ([_, v]) => v !== undefined && v !== null
      )
    );

    // 确保请求发送的是JSON格式
    console.log("发送更新用户请求:", {
      userId,
      url: `${BASE_URL}/${userId}`,
      data: cleanDTO,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    try {
      // 尝试打印原始请求体，确保数据格式正确
      console.log("请求体JSON字符串:", JSON.stringify(cleanDTO));

      // 使用显式配置
      const response = await api.put(`/${userId}`, cleanDTO, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      console.log("更新成功，响应数据:", response.data);
      return response.data;
    } catch (error) {
      console.error("更新用户信息失败:", error);
      throw error;
    }
  },

  getUserByWalletAddress: async (walletAddress: string): Promise<UserVO> => {
    const response = await api.get(`/wallet/${walletAddress}`);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post("/logout");
  },
};
