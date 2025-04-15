"use client";
import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "react95";
import { useAuth } from "@/hooks/useAuth";

export const WalletConnectButton = () => {
  const [isMobile, setIsMobile] = useState(false);
  const {
    connect,
    connectors,
    isPending: isConnecting,
    error: connectError,
  } = useConnect();
  const { disconnect, isPending: isDisconnecting } = useDisconnect();
  const { isConnected, address } = useAccount();
  const { connectWallet, logout } = useAuth();

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isLoading = isConnecting || isDisconnecting;

  const handleClick = async () => {
    if (isConnected) {
      try {
        await logout();
        disconnect();
      } catch (error) {
        console.error("登出失败:", error);
        // 即使登出失败，也断开钱包连接
        disconnect();
      }
    } else {
      try {
        // 先尝试连接钱包
        await connect({ connector: connectors[0] });
        // 连接成功后再调用后端登录
        await connectWallet();
      } catch (error: any) {
        console.error("连接钱包或登录失败:", error);
        if (error.code === -32002) {
          alert("请在MetaMask中确认连接请求");
        } else if (error.code === 4001) {
          alert("您拒绝了连接请求");
        } else {
          alert(error.message || "连接失败，请重试");
        }
      }
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      style={{
        minWidth: isMobile ? "100px" : "120px",
        fontSize: isMobile ? "14px" : "16px",
        padding: isMobile ? "4px 8px" : "8px 16px",
      }}
    >
      {isLoading
        ? "处理中..."
        : isConnected && address
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : "连接钱包"}
    </Button>
  );
};
