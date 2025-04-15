import { UserVO } from "@/api/userApi";

// 本地存储的键名
const USER_KEY = "memeforge_user";
const TOKEN_KEY = "memeforge_token";

/**
 * 保存用户信息到本地存储
 * @param user 用户信息
 */
export const saveUserToLocalStorage = (user: UserVO): void => {
  if (!user) return;
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("保存用户信息失败:", error);
  }
};

/**
 * 从本地存储获取用户信息
 */
export const getUserFromLocalStorage = (): UserVO | null => {
  try {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error("获取用户信息失败:", error);
    return null;
  }
};

/**
 * 清除本地存储的用户信息
 */
export const clearUserFromLocalStorage = (): void => {
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error("清除用户信息失败:", error);
  }
};

/**
 * 保存认证令牌到本地存储
 * @param token 认证令牌
 */
export const saveTokenToLocalStorage = (token: string): void => {
  if (!token) return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error("保存令牌失败:", error);
  }
};

/**
 * 从本地存储获取认证令牌
 */
export const getTokenFromLocalStorage = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error("获取令牌失败:", error);
    return null;
  }
};

/**
 * 检查用户是否已登录
 */
export const isUserLoggedIn = (): boolean => {
  return !!getUserFromLocalStorage();
};

/**
 * 获取当前登录用户ID
 */
export const getCurrentUserId = (): number | null => {
  const user = getUserFromLocalStorage();
  return user ? user.id : null;
};
