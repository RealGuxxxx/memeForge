"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ThemeProvider, styled, createGlobalStyle } from "styled-components";
import original from "react95/dist/themes/original";
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  TextInput,
  Panel,
  Toolbar,
  AppBar,
  Separator,
  Tabs,
  Tab,
  TabBody,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableHeadCell,
  TableDataCell,
  Divider,
} from "react95";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { useRouter } from "next/navigation";
import { userApi } from "@/api/userApi";
import { UserAssets } from "@/components/UserAssets";
import { ConnectWalletPrompt } from "@/components/ConnectWalletPrompt";
import { shortenAddress } from "@/utils/transactionHelpers";

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
  
  .user-window {
    transition: all 0.3s ease;
  }
  
  .user-window:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  }
`;

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
  background-color: ${(props) => (props.$isActive ? THEME.primary : undefined)};
  color: ${(props) => (props.$isActive ? "#ffffff" : undefined)};
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.05);
  }
`;

interface UserInfo {
  id: number;
  nickname: string;
  walletAddress: string;
  avatar: string;
  bio: string;
}

interface Transaction {
  id: number;
  tokenAddress: string;
  tokenSymbol: string;
  userAddress: string;
  amount: string;
  price: string;
  totalValue: string;
  transactionType: "BUY" | "SELL";
  transactionHash: string;
  createdAt: string;
}

export default function UserPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [isMobile, setIsMobile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState("/user");
  const [userInfo, setUserInfo] = useState<UserInfo>({
    id: 0,
    nickname: "",
    walletAddress: "",
    avatar: "",
    bio: "",
  });
  const [activeTab, setActiveTab] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // 获取用户信息
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (address) {
        try {
          const user = await userApi.getUserByWalletAddress(address);
          setUserInfo(user);
        } catch (error) {
          console.error("Failed to fetch user info:", error);
        }
      }
    };
    fetchUserInfo();
  }, [address]);

  // 获取交易记录
  const fetchTransactions = async (page: number, isLoadMore = false) => {
    if (!address) return;

    try {
      if (!isLoadMore) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      // 使用API模块替代直接fetch
      const { getUserTransactions } = await import("@/api");
      const result = await getUserTransactions(address, page, pageSize);

      // 构造与原来结构相同的数据对象
      const data = {
        data: result,
      };

      console.log("API返回的原始数据:", JSON.stringify(data, null, 2));

      if (!data || !data.data || !Array.isArray(data.data.records)) {
        throw new Error("返回数据格式错误");
      }

      // 处理每条记录
      const processedRecords = data.data.records.map((record: any) => {
        console.log("处理单条记录前的原始数据:", {
          amount: record.amount,
          price: record.price,
          totalValue: record.totalValue,
          类型: {
            amount: typeof record.amount,
            price: typeof record.price,
            totalValue: typeof record.totalValue,
          },
        });

        return {
          ...record,
          tokenSymbol:
            record.tokenSymbol ||
            (record.tokenAddress
              ? `${shortenAddress(record.tokenAddress)}`
              : "未知代币"),
          amount: record.amount, // 保持原始类型
          price: record.price, // 保持原始类型
          totalValue: record.totalValue, // 保持原始类型
        };
      });

      console.log("处理后的记录:", processedRecords);

      // 修改：检查是否有重复数据
      if (isLoadMore) {
        // 获取现有交易的ID列表
        const existingIds = transactions.map((tx) => tx.id);
        // 过滤掉已存在的记录
        const newRecords = processedRecords.filter(
          (record: any) => !existingIds.includes(record.id)
        );

        if (newRecords.length === 0) {
          // 没有新记录，设置hasMore为false
          setHasMore(false);
          console.log("没有更多新记录可加载");
        } else {
          // 合并新记录
          setTransactions((prev) => [...prev, ...newRecords]);
          setHasMore(newRecords.length === pageSize);
          console.log(`加载了 ${newRecords.length} 条新记录`);
        }
      } else {
        setTransactions(processedRecords);
        setHasMore(processedRecords.length === pageSize);
      }

      setError(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "获取交易记录失败";
      setError(errorMessage);
      console.error("获取交易记录失败:", error);
    } finally {
      if (!isLoadMore) {
        setLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  // 加载更多交易记录
  const loadMore = () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = pageNum + 1;
    setPageNum(nextPage);
    fetchTransactions(nextPage, true);
  };

  // 初始加载交易记录
  useEffect(() => {
    if (address) {
      setPageNum(1);
      fetchTransactions(1);
    }
  }, [address]);

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const updatedUser = await userApi.updateUserInfo(userInfo.id, {
        nickname: userInfo.nickname,
        bio: userInfo.bio,
      });
      setUserInfo(updatedUser);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setLoading(false);
    }
  };

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
    height: isMobile ? "auto" : "calc(100vh - 116px)",
    display: "flex",
    flexDirection: "column" as const,
    marginBottom: "24px",
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
    border: `1px solid ${THEME.border}`,
    transition: "all 0.3s ease",
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

  // 格式化时间
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 添加安全的数值格式化函数
  const formatNumberSafe = (value: any): string => {
    if (value === null || value === undefined || value === "") {
      return "0.000000";
    }

    // 所有数值都按 BigDecimal（字符串）处理
    const num = typeof value === "string" ? parseFloat(value) : value;

    // 检查是否为NaN或无限值
    if (isNaN(num) || !isFinite(num)) {
      return "0.000000";
    }

    try {
      // 使用toFixed避免科学计数法，然后解析回来以移除尾随的0
      const fixed = num.toFixed(8); // 保留8位小数以确保精度
      const parsed = parseFloat(fixed);
      // 再次格式化为6位小数，但不移除尾随0，确保显示一致
      return parsed.toFixed(6);
    } catch (e) {
      console.error("数值格式化错误:", e, "原始值:", value);
      return "0.000000";
    }
  };

  // 为ETH价格添加特殊格式化函数，确保显示足够的精度
  const formatEthPrice = (value: any): string => {
    if (value === null || value === undefined || value === "") {
      return "0.00000000";
    }

    const num = typeof value === "string" ? parseFloat(value) : value;

    // 检查是否为NaN或无限值
    if (isNaN(num) || !isFinite(num)) {
      return "0.00000000";
    }

    try {
      // 处理极小数值的特殊情况
      if (num === 0) {
        return "0.00000000";
      } else if (Math.abs(num) < 0.00000001) {
        // 对于极小的数使用科学计数法
        return num.toExponential(8);
      }

      // ETH价格通常需要更高精度
      const fixed = num.toFixed(8);
      return fixed; // 保留所有8位小数，包括尾随0
    } catch (e) {
      console.error("ETH价格格式化错误:", e, "原始值:", value);
      return "0.00000000";
    }
  };

  // 添加格式化函数用于显示交易记录中的总价值
  const formatTotalValue = (value: any): string => {
    if (value === null || value === undefined || value === "") {
      return "0.00000000";
    }

    const num = typeof value === "string" ? parseFloat(value) : value;

    // 检查是否为NaN或无限值
    if (isNaN(num) || !isFinite(num)) {
      return "0.00000000";
    }

    try {
      // 处理0和极小数值
      if (num === 0) {
        return "0.00000000";
      } else if (Math.abs(num) < 0.00000001) {
        // 对于极小的数使用科学计数法并保留更多位数
        return num.toExponential(8);
      }

      // 使用8位小数确保精度
      return num.toFixed(8);
    } catch (e) {
      console.error("总价值格式化错误:", e, "原始值:", value);
      return "0.00000000";
    }
  };

  // 渲染交易记录
  const renderTransactions = () => {
    if (loading) {
      return (
        <Panel variant="well" style={{ padding: "16px", textAlign: "center" }}>
          加载中...
        </Panel>
      );
    }

    if (error) {
      return (
        <Panel
          variant="well"
          style={{ padding: "16px", textAlign: "center", color: THEME.error }}
        >
          {error}
          <Button
            onClick={() => fetchTransactions(1)}
            style={{ marginLeft: "8px" }}
          >
            重试
          </Button>
        </Panel>
      );
    }

    if (transactions.length === 0) {
      return (
        <Panel variant="well" style={{ padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: "16px", marginBottom: "16px" }}>
            暂无交易记录
          </div>
          <div style={{ fontSize: "14px", color: THEME.lightText }}>
            当您进行代币交易后，记录将会显示在这里
          </div>
        </Panel>
      );
    }

    return (
      <div style={{ overflowY: "auto", maxHeight: "500px" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell>交易类型</TableHeadCell>
              <TableHeadCell>时间</TableHeadCell>
              <TableHeadCell>代币</TableHeadCell>
              <TableHeadCell>数量</TableHeadCell>
              <TableHeadCell>价格(ETH)</TableHeadCell>
              <TableHeadCell>总价值(ETH)</TableHeadCell>
              <TableHeadCell>操作</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((tx: Transaction) => {
              // 直接使用 formatNumberSafe，不需要特殊处理 amount
              const displayAmount = formatNumberSafe(tx.amount);
              const price = formatEthPrice(tx.price); // 使用ETH特定格式化
              const totalValue = formatTotalValue(tx.totalValue); // 使用总值特定格式化

              return (
                <TableRow key={tx.id}>
                  <TableDataCell>
                    <span
                      style={{
                        color:
                          tx.transactionType === "BUY" ? "#4caf50" : "#f44336",
                        fontWeight: "bold",
                      }}
                    >
                      {tx.transactionType === "BUY" ? "买入" : "卖出"}
                    </span>
                  </TableDataCell>
                  <TableDataCell>{formatDate(tx.createdAt)}</TableDataCell>
                  <TableDataCell>
                    {tx.tokenSymbol ||
                      (tx.tokenAddress && shortenAddress(tx.tokenAddress)) ||
                      "未知代币"}
                  </TableDataCell>
                  <TableDataCell>{displayAmount}</TableDataCell>
                  <TableDataCell title={`${tx.price}`}>{price}</TableDataCell>
                  <TableDataCell title={`${tx.totalValue}`}>
                    {totalValue}
                  </TableDataCell>
                  <TableDataCell>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          `https://sepolia.etherscan.io/tx/${tx.transactionHash}`,
                          "_blank"
                        );
                      }}
                    >
                      查看
                    </Button>
                  </TableDataCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {hasMore && (
          <Button
            onClick={loadMore}
            disabled={isLoadingMore}
            style={{ width: "100%", marginTop: "16px" }}
          >
            {isLoadingMore ? "加载中..." : "加载更多"}
          </Button>
        )}
      </div>
    );
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
            message="请先连接钱包以访问个人中心"
            description="连接钱包后，您可以查看个人资料和交易记录"
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
          <Window style={windowStyle} className="user-window">
            <WindowHeader style={windowHeaderStyle}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: "bold",
                    marginRight: "10px",
                  }}
                >
                  👤
                </span>
                <span style={{ fontSize: "15px", fontWeight: "bold" }}>
                  个人中心
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
              在这里，您可以管理个人资料并查看交易记录
            </div>
            <WindowContent
              style={{
                height: "calc(100% - 65px)",
                overflow: "hidden",
                padding: "24px",
                backgroundColor: THEME.lightBg,
              }}
            >
              <div
                style={{
                  height: "100%",
                  overflowY: "auto",
                  paddingRight: "8px",
                }}
              >
                <Tabs
                  value={activeTab}
                  onChange={(value: number) => setActiveTab(value)}
                >
                  <Tab value={0}>个人资料</Tab>
                  <Tab value={1}>交易记录</Tab>
                </Tabs>
                <TabBody style={{ marginTop: "16px" }}>
                  {activeTab === 0 ? (
                    <>
                      <Toolbar style={{ marginBottom: "16px" }}>
                        <Button
                          variant={isEditing ? "default" : "flat"}
                          onClick={() => setIsEditing(!isEditing)}
                          disabled={loading}
                        >
                          {isEditing ? "取消编辑" : "编辑资料"}
                        </Button>
                      </Toolbar>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: isMobile ? "column" : "row",
                          gap: "1rem",
                          marginTop: "1rem",
                        }}
                      >
                        <Panel
                          variant="well"
                          style={{
                            padding: "1rem",
                            flex: "0 0 auto",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "0.5rem",
                            backgroundColor: "#f0f0f0",
                            border: "1px solid #aaa",
                          }}
                        >
                          <img
                            src={userInfo.avatar}
                            alt="avatar"
                            style={{
                              width: isMobile ? "80px" : "120px",
                              height: isMobile ? "80px" : "120px",
                              borderRadius: "8px",
                              objectFit: "cover",
                              border: "1px solid #aaa",
                            }}
                          />
                          <TextInput
                            value={userInfo.nickname}
                            onChange={(e) =>
                              setUserInfo({
                                ...userInfo,
                                nickname: e.target.value,
                              })
                            }
                            disabled={!isEditing}
                            style={{ width: "100%", textAlign: "center" }}
                          />
                          <span
                            style={{
                              fontSize: "0.8rem",
                              wordBreak: "break-all",
                              textAlign: "center",
                              padding: "4px 8px",
                              background: "#e6e6e6",
                              border: "1px solid #ccc",
                              borderRadius: "2px",
                            }}
                          >
                            {userInfo.walletAddress}
                          </span>
                        </Panel>
                        <Panel
                          style={{
                            flex: 1,
                            padding: "1rem",
                            backgroundColor: "#f0f0f0",
                            border: "1px solid #aaa",
                          }}
                        >
                          <div style={{ marginBottom: "1rem" }}>
                            <label
                              style={{
                                display: "block",
                                marginBottom: "0.5rem",
                                fontWeight: "bold",
                                fontSize: "14px",
                              }}
                            >
                              个人简介
                            </label>
                            <TextInput
                              value={userInfo.bio}
                              onChange={(e) =>
                                setUserInfo({
                                  ...userInfo,
                                  bio: e.target.value,
                                })
                              }
                              multiline
                              rows={4}
                              disabled={!isEditing}
                              style={{ width: "100%" }}
                            />
                          </div>
                          {isEditing && (
                            <Button
                              onClick={handleUpdateProfile}
                              disabled={loading}
                              style={{ width: "100%" }}
                            >
                              {loading ? "更新中..." : "保存修改"}
                            </Button>
                          )}
                        </Panel>
                      </div>

                      {/* 用户资产区域 */}
                      <div style={{ marginTop: "2rem" }}>
                        <div
                          style={{
                            padding: "8px 0",
                            marginBottom: "12px",
                            borderBottom: "1px solid #aaa",
                            fontSize: "16px",
                            fontWeight: "bold",
                          }}
                        >
                          我的资产
                        </div>
                        <UserAssets />
                      </div>
                    </>
                  ) : (
                    <div style={{ marginTop: "1rem" }}>
                      <div
                        style={{
                          padding: "8px 0",
                          marginBottom: "12px",
                          borderBottom: "1px solid #aaa",
                          fontSize: "16px",
                          fontWeight: "bold",
                        }}
                      >
                        交易记录
                      </div>
                      {renderTransactions()}
                    </div>
                  )}
                </TabBody>
              </div>
            </WindowContent>
          </Window>
        </div>
      </div>
    </ThemeProvider>
  );
}
