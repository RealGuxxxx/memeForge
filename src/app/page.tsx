"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { TokenMintForm } from "@/components/TokenMintForm";
import { TokenList } from "@/components/TokenList";
import { TradePanel } from "@/components/TradePanel";
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  Toolbar,
  AppBar,
  List,
  ListItem,
  Divider,
  Panel,
} from "react95";
import { ThemeProvider } from "styled-components";
import original from "react95/dist/themes/original";
import styled from "styled-components";

// 统一设计主题颜色
const THEME = {
  primary: "#000080", // Windows 95经典深蓝色标题栏
  secondary: "#0A246A", // Windows 95选中蓝色
  accent: "#000080", // 保持一致的蓝色
  success: "#008080", // Windows 95的青色
  error: "#aa0000", // 暗红色
  lightBg: "#c0c0c0", // Windows 95经典灰色背景
  border: "#858585", // 灰色边框
  text: "#000000", // 黑色文本
  lightText: "#444444", // 深灰色次要文本
  cardShadow:
    "inset -1px -1px #0a0a0a, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #dfdfdf", // 经典Windows 95内嵌阴影
  buttonGradient: "#c0c0c0", // 纯灰色按钮
  inputBg: "#FFFFFF", // 输入框背景
  divider: "#858585", // 分隔线
};

// 定义自定义组件的props类型
interface ToolbarProps {
  isMobile?: boolean;
}

interface ButtonProps {
  isMobile?: boolean;
  isActive?: boolean;
}

// 创建样式化组件
const StyledAppBar = styled(AppBar)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
`;

const StyledToolbar = styled(Toolbar)<{ $isMobile?: boolean }>`
  justify-content: space-between;
  padding: 0 16px;
  flex-wrap: ${(props) => (props.$isMobile ? "wrap" : "nowrap")};
  gap: ${(props) => (props.$isMobile ? "8px" : "0")};
`;

const StyledButton = styled(Button)<{
  $isMobile?: boolean;
  $isActive?: boolean;
}>`
  min-width: ${(props) => (props.$isMobile ? "100px" : "120px")};
  font-size: ${(props) => (props.$isMobile ? "14px" : "16px")};
  padding: ${(props) => (props.$isMobile ? "4px 8px" : "8px 16px")};
  background-color: ${(props) => (props.$isActive ? "#000080" : undefined)};
  color: ${(props) => (props.$isActive ? "#ffffff" : undefined)};
`;

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"trade" | "mint">("trade");
  const [isMobile, setIsMobile] = useState(false);
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [currentPath, setCurrentPath] = useState("/");

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 设置当前路径
  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  const handleNavigation = (path: string) => {
    router.push(path);
    setCurrentPath(path);
  };

  return (
    <ThemeProvider theme={original}>
      <div
        className="app-container"
        style={{
          height: "100vh",
          overflow: "hidden",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: THEME.lightBg, // 统一背景色
          backgroundImage:
            "linear-gradient(45deg, #c3c3c3 25%, transparent 25%, transparent 75%, #c3c3c3 75%), linear-gradient(45deg, #c3c3c3 25%, transparent 25%, transparent 75%, #c3c3c3 75%)",
          backgroundSize: "60px 60px",
          backgroundPosition: "0 0, 30px 30px",
        }}
      >
        <StyledAppBar>
          <StyledToolbar $isMobile={isMobile}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                fontSize: isMobile ? "14px" : "16px",
              }}
            >
              <span style={{ fontWeight: "bold" }}>MemeForge v1.0</span>
              <StyledButton
                onClick={() => handleNavigation("/")}
                size={isMobile ? "sm" : undefined}
                $isActive={currentPath === "/"}
                $isMobile={isMobile}
              >
                首页
              </StyledButton>
              <StyledButton
                onClick={() => handleNavigation("/token")}
                size={isMobile ? "sm" : undefined}
                $isActive={currentPath === "/token"}
                $isMobile={isMobile}
              >
                铸造
              </StyledButton>
              <StyledButton
                onClick={() => handleNavigation("/user")}
                size={isMobile ? "sm" : undefined}
                $isActive={currentPath === "/user"}
                $isMobile={isMobile}
              >
                个人中心
              </StyledButton>
            </div>
            <WalletConnectButton />
          </StyledToolbar>
        </StyledAppBar>

        <div
          style={{
            marginTop: "60px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: "16px",
            padding: "16px",
            paddingBottom: "36px",
            maxWidth: "1600px",
            margin: "60px auto 0",
            height: isMobile ? "auto" : "calc(100vh - 80px)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* 左侧Token列表 */}
          <Window
            style={{
              width: isMobile ? "100%" : "65%",
              height: isMobile ? "auto" : "calc(100vh - 136px)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              marginBottom: "24px",
            }}
          >
            <WindowHeader
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: isMobile ? "14px" : "16px",
              }}
            >
              <span>Token列表</span>
            </WindowHeader>
            <WindowContent
              style={{
                padding: 0,
                flex: 1,
                overflow: "hidden",
                height: "100%",
              }}
            >
              <TokenList
                onTokenSelect={(token) => {
                  setSelectedToken(token);
                }}
              />
            </WindowContent>
          </Window>

          {/* 右侧交易区域 */}
          <div
            style={{
              width: isMobile ? "100%" : "35%",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              height: isMobile ? "auto" : "calc(100vh - 136px)",
              overflow: "hidden",
              marginBottom: "24px",
            }}
          >
            {/* 交易面板 */}
            <Window
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <WindowHeader
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: isMobile ? "14px" : "16px",
                }}
              >
                <span>交易中心</span>
              </WindowHeader>
              <WindowContent
                style={{
                  padding: "16px",
                  flex: 1,
                  overflow: "hidden",
                }}
              >
                <TradePanel selectedToken={selectedToken} />
              </WindowContent>
            </Window>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
