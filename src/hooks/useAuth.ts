import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { userApi, UserVO, Web3LoginDTO } from "../api/userApi";
import {
  saveUserToLocalStorage,
  getUserFromLocalStorage,
  clearUserFromLocalStorage,
} from "@/utils/authHelpers";

// 添加 RPC URL
const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

export interface AuthState {
  user: UserVO | null;
  isLoading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: false,
    error: null,
  });

  const connectWallet = useCallback(async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      if (!window.ethereum) {
        throw new Error("请安装MetaMask钱包");
      }

      // 先请求连接钱包
      await window.ethereum.request({ method: "eth_requestAccounts" });

      // 修改这里：优先使用自定义 RPC，如果未配置则回退到 MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      // 获取登录nonce
      const message = await userApi.getNonce(walletAddress);

      // 请求用户签名
      const signature = await signer.signMessage(message);
      console.log("Message:", message);
      console.log("Signature:", signature);

      // Web3登录
      const loginDTO: Web3LoginDTO = { walletAddress, signature };
      const user = await userApi.web3Login(loginDTO);

      // 保存用户信息到本地存储
      saveUserToLocalStorage(user);

      setAuthState((prev) => ({ ...prev, user, isLoading: false }));
      return user;
    } catch (error: any) {
      let errorMessage = "登录失败";
      if (error.code === -32002) {
        errorMessage = "请在MetaMask中确认连接请求";
      } else if (error.code === 4001) {
        errorMessage = "用户拒绝了连接请求";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error("Login error:", error);
      setAuthState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
      await userApi.logout();

      // 清除本地存储中的用户信息
      clearUserFromLocalStorage();

      setAuthState((prev) => ({
        ...prev,
        user: null,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "登出失败";
      setAuthState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  // 组件初始化时从本地存储加载用户信息
  useEffect(() => {
    const storedUser = getUserFromLocalStorage();
    if (storedUser) {
      setAuthState((prev) => ({ ...prev, user: storedUser }));
    }
  }, []);

  const updateUserInfo = useCallback(
    async (
      userId: number,
      updateData: {
        nickname?: string;
        avatar?: string;
        bio?: string;
      }
    ) => {
      try {
        setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
        const updatedUser = await userApi.updateUserInfo(userId, updateData);

        // 更新本地存储中的用户信息
        saveUserToLocalStorage(updatedUser);

        setAuthState((prev) => ({
          ...prev,
          user: updatedUser,
          isLoading: false,
        }));
        return updatedUser;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "更新用户信息失败";
        setAuthState((prev) => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
        throw error;
      }
    },
    []
  );

  return {
    ...authState,
    connectWallet,
    logout,
    updateUserInfo,
  };
};
