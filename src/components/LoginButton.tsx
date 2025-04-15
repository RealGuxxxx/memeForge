"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

export const LoginButton = () => {
  const { user, isLoading, error, connectWallet, logout } = useAuth();
  const [showError, setShowError] = useState(false);

  const handleLogin = async () => {
    try {
      setShowError(false);
      await connectWallet();
    } catch (error) {
      setShowError(true);
    }
  };

  const handleLogout = async () => {
    try {
      setShowError(false);
      await logout();
    } catch (error) {
      setShowError(true);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {!user ? (
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "连接中..." : "连接钱包"}
        </button>
      ) : (
        <button
          onClick={handleLogout}
          disabled={isLoading}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "登出中..." : "登出"}
        </button>
      )}
      {showError && error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
    </div>
  );
};
