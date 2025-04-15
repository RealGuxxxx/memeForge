"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  Window,
  WindowHeader,
  WindowContent,
  Panel,
  Button,
  Toolbar,
  AppBar,
  Divider,
} from "react95";
import original from "react95/dist/themes/original";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ThemeProvider, styled, createGlobalStyle } from "styled-components";
import { TokenMintForm } from "@/components/TokenMintForm";
import { useRouter } from "next/navigation";
import { ConnectWalletPrompt } from "@/components/ConnectWalletPrompt";

// 添加类型定义
interface StyledToolbarProps {
  $isMobile?: boolean;
}

interface StyledButtonProps {
  $isMobile?: boolean;
  $isActive?: boolean;
}

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

const StyledAppBar = styled(AppBar)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
`;

const StyledToolbar = styled(Toolbar)<StyledToolbarProps>`
  justify-content: space-between;
  padding: 0 16px;
  flex-wrap: ${(props) => (props.$isMobile ? "wrap" : "nowrap")};
  gap: ${(props) => (props.$isMobile ? "8px" : "0")};
`;

const StyledButton = styled(Button)<StyledButtonProps>`
  min-width: ${(props) => (props.$isMobile ? "100px" : "120px")};
  font-size: ${(props) => (props.$isMobile ? "14px" : "16px")};
  padding: ${(props) => (props.$isMobile ? "4px 8px" : "8px 16px")};
  background-color: ${(props) => (props.$isActive ? THEME.primary : undefined)};
  color: ${(props) => (props.$isActive ? "#ffffff" : undefined)};
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.05);
  }
`;

// 添加页面过渡动画样式
const PageTransitionStyle = createGlobalStyle`
  .page-transition-container {
    animation: fadeIn 0.3s ease-in-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0.8; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  body {
    overflow: hidden;
    background: ${THEME.lightBg};
    margin: 0;
    padding: 0;
    transition: background-color 0.3s ease;
  }
  
  .windows-shadow {
    box-shadow: inset -1px -1px #0a0a0a, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #dfdfdf;
  }
  
  .mint-window {
    transition: all 0.3s ease;
  }
  
  .mint-window:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  }
`;

export default function TokenPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [isMobile, setIsMobile] = useState(false);
  const [currentPath, setCurrentPath] = useState("/token");
  const [isLoading, setIsLoading] = useState(true);

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

  // 添加页面加载效果
  useEffect(() => {
    // 模拟页面加载
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const handleNavigation = (path: string) => {
    router.push(path);
    setCurrentPath(path);
  };

  const containerStyle = {
    height: "100vh",
    overflow: "hidden",
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: THEME.lightBg, // 与主页保持一致的背景色
    backgroundImage:
      "linear-gradient(45deg, #c3c3c3 25%, transparent 25%, transparent 75%, #c3c3c3 75%), linear-gradient(45deg, #c3c3c3 25%, transparent 25%, transparent 75%, #c3c3c3 75%)",
    backgroundSize: "60px 60px",
    backgroundPosition: "0 0, 30px 30px",
    transition: "opacity 0.3s ease",
    opacity: isLoading ? 0.9 : 1,
  };

  const contentContainerStyle = {
    marginTop: "60px",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    height: "calc(100vh - 80px)",
    padding: "16px",
    paddingBottom: "40px",
    maxWidth: "1600px",
    margin: "60px auto 0",
    position: "relative" as const,
  };

  const windowStyle = {
    width: "100%",
    maxWidth: "800px",
    height: "auto",
    maxHeight: isMobile ? "auto" : "calc(100vh - 116px)",
    display: "flex",
    flexDirection: "column" as const,
    marginBottom: "24px",
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
    border: `1px solid ${THEME.border}`,
    transition: "all 0.3s ease",
  };

  const windowContentStyle = {
    flex: 1,
    overflow: "auto",
    padding: "24px",
    backgroundColor: THEME.lightBg,
  };

  const windowHeaderStyle = {
    background: THEME.primary,
    color: "white",
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    fontWeight: "bold" as const,
    justifyContent: "space-between",
  };

  const headerControlsStyle = {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  };

  const controlButtonStyle = {
    width: "12px",
    height: "12px",
    cursor: "default",
    background: "#dfdfdf",
    border: "1px solid #858585",
  };

  if (!isConnected) {
    return (
      <ThemeProvider theme={original}>
        <PageTransitionStyle />
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

        <div style={containerStyle} className="page-transition-container">
          <ConnectWalletPrompt
            title="连接钱包"
            message="请先连接钱包以访问Token功能"
            description="连接钱包后，您可以创建自己的代币并参与交易"
          />
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={original}>
      <PageTransitionStyle />
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

      <div style={containerStyle} className="page-transition-container">
        <div style={contentContainerStyle}>
          <Window style={windowStyle} className="mint-window">
            <WindowHeader style={windowHeaderStyle}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: "bold",
                    marginRight: "10px",
                  }}
                >
                  🪙
                </span>
                <span style={{ fontSize: "15px", fontWeight: "bold" }}>
                  创建Token
                </span>
              </div>
              <div style={headerControlsStyle}>
                <div style={controlButtonStyle}></div>
                <div style={controlButtonStyle}></div>
                <div style={controlButtonStyle}></div>
              </div>
            </WindowHeader>
            <div
              style={{
                padding: "6px 12px",
                borderBottom: "1px solid #aaa",
                backgroundColor: "#e0e0e0",
                color: "#333",
                fontSize: "13px",
              }}
            >
              在这里，您可以创建自己的代币，完成后它将出现在主页的代币列表中
            </div>
            <WindowContent style={windowContentStyle}>
              <TokenMintForm />
            </WindowContent>
          </Window>
        </div>
      </div>
    </ThemeProvider>
  );
}
