"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableHeadCell,
  TableDataCell,
  Panel,
} from "react95";
import { ethers } from "ethers";
import { tokenHoldingApi } from "../api/tokenHoldingApi";
import { TokenBasicInfoVO } from "../api/types";
import {
  safeGetDecimals,
  safeGetBalance,
  safeGetSymbol,
  safeGetName,
} from "@/utils/contractHelpers";

// ERC20代币的最小ABI，只包含我们需要的函数
const minABI = [
  // balanceOf
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  // decimals
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  // symbol
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
  // name
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
];

// 资产接口
interface Asset {
  tokenAddress: string;
  name: string;
  symbol: string;
  balance: string;
  decimals: number;
}

export const UserAssets = () => {
  const { address, isConnected } = useAccount();
  const [isMobile, setIsMobile] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 从链上获取代币余额
  const getTokenBalanceFromChain = async (
    tokenAddress: string,
    userAddress: string
  ): Promise<{
    balance: string;
    decimals: number;
    symbol: string;
    name: string;
  }> => {
    try {
      // 连接以太坊网络
      const provider = new ethers.BrowserProvider(window.ethereum);
      // 创建合约实例
      const contract = new ethers.Contract(tokenAddress, minABI, provider);

      // 使用安全函数获取代币精度
      const decimals = await safeGetDecimals(contract, 18);

      // 使用安全函数获取余额
      const balance = await safeGetBalance(contract, userAddress, decimals);

      // 使用安全函数获取符号
      const symbol = await safeGetSymbol(contract, "MEME");

      // 使用安全函数获取名称
      const name = await safeGetName(contract, "Meme Token");

      return {
        balance,
        decimals,
        symbol,
        name,
      };
    } catch (error) {
      console.error(`获取代币余额失败 (${tokenAddress}):`, error);
      return {
        balance: "0",
        decimals: 18,
        symbol: "Unknown",
        name: "Unknown Token",
      };
    }
  };

  // 获取资产
  const fetchAssets = async () => {
    if (!isConnected || !address) {
      setAssets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setRefreshing(true);
      setError(null);

      // 获取用户交易过的代币列表
      const tradedTokens = await tokenHoldingApi.getUserTradedTokens(address);

      if (!tradedTokens || tradedTokens.length === 0) {
        setAssets([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 获取每个代币的链上余额
      const assetsWithBalances = await Promise.all(
        tradedTokens.map(async (token: TokenBasicInfoVO) => {
          const { balance, decimals, symbol, name } =
            await getTokenBalanceFromChain(token.tokenAddress, address);

          return {
            tokenAddress: token.tokenAddress,
            name: name || token.name,
            symbol: symbol || token.symbol,
            balance,
            decimals: decimals || token.decimals,
          };
        })
      );

      // 过滤掉余额为0的代币
      const filteredAssets = assetsWithBalances.filter(
        (asset) => parseFloat(asset.balance) > 0
      );

      setAssets(filteredAssets);
    } catch (error) {
      console.error("获取资产失败:", error);
      setError("获取资产失败，请稍后再试");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 组件加载和地址变化时获取资产
  useEffect(() => {
    fetchAssets();

    // 每60秒自动刷新一次
    const intervalId = setInterval(() => {
      fetchAssets();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [address, isConnected]);

  // 手动刷新
  const handleRefresh = () => {
    fetchAssets();
  };

  // 格式化余额
  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    return isNaN(num) ? "0.000000" : num.toFixed(6);
  };

  // 根据设备渲染不同视图
  const renderMobileView = () => (
    <Window style={{ width: "100%" }}>
      <WindowHeader
        style={{
          fontSize: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>我的资产</span>
        <Button
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{ fontSize: "12px", height: "20px" }}
        >
          {refreshing ? "刷新中..." : "刷新"}
        </Button>
      </WindowHeader>
      <WindowContent>
        {loading ? (
          <Panel variant="well" className="p-4 text-center">
            加载中...
          </Panel>
        ) : error ? (
          <Panel
            variant="well"
            className="p-4 text-center"
            style={{ color: "#f44336" }}
          >
            {error}
            <div style={{ marginTop: "10px" }}>
              <Button onClick={handleRefresh}>重试</Button>
            </div>
          </Panel>
        ) : assets.length > 0 ? (
          <div>
            {assets.map((asset) => (
              <div
                key={asset.tokenAddress}
                style={{
                  border: "2px solid #c3c7cb",
                  padding: "12px",
                  marginBottom: "8px",
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "bold" }}>{asset.symbol}</div>
                    <div
                      title={asset.name}
                      style={{
                        fontSize: "12px",
                        color: "#555",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {asset.name}
                    </div>
                    <div>
                      余额: {formatBalance(asset.balance)} {asset.symbol}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{ textAlign: "center", padding: "20px 0", color: "#666" }}
          >
            暂无资产
          </div>
        )}
      </WindowContent>
    </Window>
  );

  const renderDesktopView = () => (
    <Window style={{ width: "100%" }}>
      <WindowHeader>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <span>我的资产</span>
          <Button
            size="sm"
            style={{ padding: "0 8px", fontSize: "12px", height: "20px" }}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? "刷新中..." : "刷新"}
          </Button>
        </div>
      </WindowHeader>
      <WindowContent>
        {loading ? (
          <Panel variant="well" className="p-4 text-center">
            加载中...
          </Panel>
        ) : error ? (
          <Panel
            variant="well"
            className="p-4 text-center"
            style={{ color: "#f44336" }}
          >
            {error}
            <div style={{ marginTop: "10px" }}>
              <Button onClick={handleRefresh}>重试</Button>
            </div>
          </Panel>
        ) : assets.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>代币</TableHeadCell>
                <TableHeadCell>名称</TableHeadCell>
                <TableHeadCell>余额</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.tokenAddress}>
                  <TableDataCell style={{ fontWeight: "bold" }}>
                    {asset.symbol}
                  </TableDataCell>
                  <TableDataCell
                    title={asset.name}
                    style={{
                      maxWidth: "200px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {asset.name}
                  </TableDataCell>
                  <TableDataCell>
                    {formatBalance(asset.balance)} {asset.symbol}
                  </TableDataCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div
            style={{ textAlign: "center", padding: "20px 0", color: "#666" }}
          >
            暂无资产
          </div>
        )}
      </WindowContent>
    </Window>
  );

  return isMobile ? renderMobileView() : renderDesktopView();
};
