"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  Button,
  TextInput,
  Fieldset,
  Window,
  WindowHeader,
  WindowContent,
} from "react95";
import { useSwapContract } from "../hooks/useSwapContract";
import { ethers } from "ethers";
import { MetaMaskInpageProvider } from "@metamask/providers";
import {
  createTransaction,
  getUserTransactions,
  TransactionCreateDTO,
} from "../api/transactionApi";

// 使用正确的方式声明全局ethereum对象
interface Window {
  ethereum?: any;
}

const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
// 添加Swap合约地址
const SWAP_CONTRACT_ADDRESS = "0x04F6a55EDB478aB095206FAc73C7C858232eCcB8";

interface CustomInputEvent extends React.ChangeEvent<HTMLInputElement> {
  target: HTMLInputElement;
}

interface TradeFormData {
  type: "buy" | "sell";
  amount: string;
  price: string;
}

interface Token {
  id: string;
  name: string;
  symbol: string;
  imageUrl: string;
  createTime: string;
  description: string;
  tokenAddress: string;
}

interface TradePanelProps {
  selectedToken?: Token;
}

interface ToastProps {
  message: string;
  type: "success" | "error";
  hash?: string;
  amount?: string;
  symbol?: string;
}

// 添加UI主题颜色常量，提高一致性
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

// 优化Toast组件设计
const Toast: React.FC<ToastProps> = ({
  message,
  type,
  hash,
  amount,
  symbol,
}) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
    }, 5000); // 5秒后自动关闭

    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <Window
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        width: "350px",
        zIndex: 9999,
        animation: "slideIn 0.5s ease-out",
        boxShadow: "0 5px 20px rgba(0, 0, 0, 0.15)",
        border: `1px solid ${type === "success" ? THEME.success : THEME.error}`,
      }}
    >
      <WindowHeader
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: type === "success" ? THEME.success : THEME.error,
          color: "white",
          padding: "8px 14px",
        }}
      >
        <span
          style={{
            fontSize: "14px",
            fontWeight: "bold",
            letterSpacing: "0.3px",
          }}
        >
          {type === "success" ? "✓ 交易提示" : "⚠ 错误提示"}
        </span>
        <Button
          style={{
            width: "20px",
            height: "20px",
            fontSize: "14px",
            padding: 0,
            lineHeight: "16px",
            minWidth: "auto",
            fontWeight: "bold",
          }}
          onClick={() => setShow(false)}
        >
          ×
        </Button>
      </WindowHeader>
      <WindowContent style={{ padding: "16px", background: "#FCFCFC" }}>
        <div
          style={{
            fontWeight: "bold",
            marginBottom: "12px",
            fontSize: "14px",
            lineHeight: "1.4",
          }}
        >
          {message}
        </div>

        {amount && (
          <div
            style={{
              marginBottom: "12px",
              fontSize: "15px",
              background: type === "success" ? "#EFFCEF" : "transparent",
              padding: "10px",
              borderRadius: "2px",
              border: `1px solid ${THEME.divider}`,
              display: "flex",
              alignItems: "center",
            }}
          >
            <span
              style={{
                marginRight: "6px",
                color: THEME.success,
                fontSize: "16px",
              }}
            >
              {type === "success" ? "+" : ""}
            </span>
            <span style={{ fontFamily: "monospace", fontWeight: "500" }}>
              {amount} {symbol}
            </span>
          </div>
        )}

        {hash && (
          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              wordBreak: "break-all",
              color: "#0078D7",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "8px 10px",
              background: "#F0F7FF",
              borderRadius: "2px",
              border: "1px solid #D0E3FF",
              transition: "all 0.2s ease",
            }}
            onClick={() =>
              window.open(`https://sepolia.etherscan.io/tx/${hash}`, "_blank")
            }
          >
            <span>
              交易哈希: {hash.substring(0, 10)}...
              {hash.substring(hash.length - 8)}
            </span>
            {message.includes("正在处理") || message.includes("正在等待") ? (
              <div
                style={{
                  display: "inline-block",
                  width: "12px",
                  height: "12px",
                  marginLeft: "8px",
                  border: "2px solid rgba(0, 120, 215, 0.2)",
                  borderRadius: "50%",
                  borderTopColor: "#0078D7",
                  animation: "spin 1s linear infinite",
                }}
              />
            ) : (
              <span style={{ marginLeft: "5px", fontSize: "11px" }}>
                (点击查看详情)
              </span>
            )}
          </div>
        )}
      </WindowContent>
    </Window>
  );
};

// 添加旋转动画样式
const addAnimationStyle = () => {
  const styleId = "trade-panel-animation-style";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0% { opacity: 0.4; }
      50% { opacity: 1; }
      100% { opacity: 0.4; }
    }
    @keyframes glow {
      0% { box-shadow: 0 0 5px rgba(68, 204, 68, 0.2); }
      50% { box-shadow: 0 0 15px rgba(68, 204, 68, 0.5); }
      100% { box-shadow: 0 0 5px rgba(68, 204, 68, 0.2); }
    }
    .hover-scale {
      transition: all 0.2s ease;
    }
    .hover-scale:hover {
      transform: scale(1.03);
    }
  `;
  document.head.appendChild(style);
};

// 添加科学计数法处理函数，确保大数值不使用科学计数法表示
const formatNumberNoExponent = (num: number | string): string => {
  if (typeof num === "string") {
    // 尝试解析字符串为数字
    const parsed = parseFloat(num);
    if (isNaN(parsed)) {
      return "0";
    }
    num = parsed;
  }

  // 处理数字为0的情况
  if (num === 0) return "0";

  // 将数字转换为字符串，可能会有科学计数法
  let strValue = num.toString();

  // 检查是否包含科学计数法表示法
  if (strValue.includes("e") || strValue.includes("E")) {
    // 转换科学计数法为普通数字字符串
    const match = strValue.match(/^([+-]?)(\d+)\.?(\d*)[eE]([-+]?)(\d+)$/);
    if (match) {
      const sign = match[1];
      const integerPart = match[2];
      const fractionalPart = match[3] || "";
      const expSign = match[4] === "-" ? -1 : 1;
      const exponent = parseInt(match[5], 10) * expSign;

      let newValue = sign + integerPart + fractionalPart;
      const decimalPosition = integerPart.length + exponent;

      if (decimalPosition <= 0) {
        // 小数点应在数字前面添加0
        newValue = "0." + "0".repeat(-decimalPosition) + newValue;
      } else if (decimalPosition < newValue.length) {
        // 小数点应在数字中间
        newValue =
          newValue.substring(0, decimalPosition) +
          "." +
          newValue.substring(decimalPosition);
      } else {
        // 小数点应在数字后面添加0
        newValue = newValue + "0".repeat(decimalPosition - newValue.length);
      }

      return newValue.replace(/\.?0+$/, ""); // 移除尾部的小数点和0
    }
  }

  return strValue;
};

export const TradePanel: React.FC<TradePanelProps> = ({ selectedToken }) => {
  const { isConnected } = useAccount();
  const {
    getTokenPrice,
    swapETHForTokens,
    swapTokensForETH,
    loading: swapLoading,
    error: swapError,
  } = useSwapContract();
  const [isMobile, setIsMobile] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<string>("0");
  const [formData, setFormData] = useState<TradeFormData>({
    type: "buy",
    amount: "",
    price: "0",
  });
  const [result, setResult] = useState<{
    success: boolean;
    transactionHash?: string;
    amountOut?: string;
    error?: string;
  } | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [showError, setShowError] = useState(false);
  const [error, setError] = useState("");
  const [isBuying, setIsBuying] = useState(true);
  const slippage = 0.1; // 10% 滑点

  // 添加快捷金额选项
  const quickAmounts = [0.001, 0.005, 0.01, 0.05, 0.1];

  // 添加代币余额状态
  const [tokenBalance, setTokenBalance] = useState<string>("0");

  // 添加快捷卖出比例选项
  const quickSellPercentages = [25, 50, 75, 100];

  // 添加Toast状态
  const [toast, setToast] = useState<ToastProps | null>(null);

  // 添加新方法：等待交易确认，并支持重试
  const [isAddingToSwap, setIsAddingToSwap] = useState(false);
  const [addToSwapError, setAddToSwapError] = useState<string | null>(null);
  const [addToSwapSuccess, setAddToSwapSuccess] = useState(false);
  const [addToSwapRetries, setAddToSwapRetries] = useState(0);
  const MAX_RETRIES = 10;
  const RETRY_DELAY_BASE = 3000; // 3秒基础延迟

  // 获取实时价格
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchPrice = async () => {
      if (selectedToken) {
        try {
          setPriceError(null);
          const price = await getTokenPrice(selectedToken.tokenAddress);

          // 验证价格是否有效
          if (!price || isNaN(parseFloat(price))) {
            throw new Error("获取到的价格无效");
          }

          setCurrentPrice(price);
          setFormData((prev) => ({
            ...prev,
            price,
          }));
        } catch (err: any) {
          console.error("获取价格失败:", err);
          setPriceError(err.message || "获取价格失败");
          setCurrentPrice("0");
          setToast({
            message: err.message || "获取价格失败",
            type: "error",
          });
          setTimeout(() => setToast(null), 3000);
        }
      }
    };

    fetchPrice();
    intervalId = setInterval(fetchPrice, 3000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedToken, getTokenPrice]);

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 获取代币余额
  useEffect(() => {
    const fetchTokenBalance = async () => {
      if (selectedToken && isConnected) {
        // 添加 isConnected 检查
        try {
          const provider = RPC_URL ? new ethers.JsonRpcProvider(RPC_URL) : null;
          if (!provider) {
            throw new Error("RPC URL 未配置");
          }

          // 使用 window.ethereum 获取当前连接的账户地址
          const accounts = (await window.ethereum.request({
            method: "eth_requestAccounts",
          })) as string[];
          const userAddress = accounts[0];

          const tokenContract = new ethers.Contract(
            selectedToken.tokenAddress,
            ["function balanceOf(address) view returns (uint256)"],
            provider
          );

          // 直接使用用户地址查询余额，不需要签名者
          const balance = await tokenContract.balanceOf(userAddress);
          setTokenBalance(ethers.formatUnits(balance, 18));
        } catch (err) {
          console.error("获取代币余额失败:", err);
          setTokenBalance("0");
        }
      }
    };

    fetchTokenBalance();
    const intervalId = setInterval(fetchTokenBalance, 10000);
    return () => clearInterval(intervalId);
  }, [selectedToken, isConnected]); // 添加 isConnected 到依赖数组

  // 修改格式化数字的辅助函数，添加对极小数值的处理
  const formatNumber = (
    value: number | string,
    decimals: number = 6,
    useScientificNotation: boolean = true
  ): string => {
    try {
      const num = typeof value === "string" ? parseFloat(value) : value;
      if (isNaN(num)) return "0";

      // 完全为零的情况
      if (num === 0) return "0";

      // 处理极小数值的情况
      const absNum = Math.abs(num);
      if (useScientificNotation && absNum > 0 && absNum < 0.000001) {
        // 对于非常小的数使用科学计数法
        return num.toExponential(6);
      } else if (absNum >= 1000000000) {
        // 对于非常大的数也使用科学计数法
        return num.toExponential(6);
      } else {
        // 常规情况使用固定小数位
        // 为了避免显示过多小数位中的0，可以先转换为字符串再裁剪
        const fixed = num.toFixed(decimals);

        // 如果小数部分都是0，直接返回整数部分
        if (fixed.indexOf(".") > 0 && !parseFloat(fixed.split(".")[1])) {
          return fixed.split(".")[0];
        }

        return fixed;
      }
    } catch (err) {
      console.error("数字格式化错误:", err);
      return "0";
    }
  };

  // 添加价格格式化的专用函数，适配数据库decimal(18,8)格式
  const formatPrice = (price: string | number): string => {
    const numPrice = typeof price === "string" ? parseFloat(price) : price;

    // 如果价格为0或无效，显示为"--"
    if (!numPrice || isNaN(numPrice)) {
      return "--";
    }

    // 使用通用格式化函数处理价格
    return formatNumber(numPrice, 8, true);
  };

  // 修改formatPriceForDB函数，确保更好地处理极小数值
  const formatPriceForDB = (price: number | string): number => {
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(numPrice)) return 0;

    // 确保不会因为精度问题变成0
    if (numPrice !== 0 && Math.abs(numPrice) < 1e-18) {
      // 如果是极小的非零数，返回一个最小但非零的值
      return numPrice > 0 ? 1e-18 : -1e-18;
    }

    return numPrice;
  };

  // 修改处理输入变化的函数
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isBuying) {
      setBuyAmount(e.target.value);
    } else {
      setSellAmount(e.target.value);
    }
  };

  // 修改快捷卖出处理函数
  const handleQuickSell = (percentage: number) => {
    if (!tokenBalance) return;
    const amount = (parseFloat(tokenBalance) * percentage) / 100;
    setSellAmount(formatNumber(amount, 8)); // 使用8位小数以确保精度
  };

  // 修改快捷买入处理函数
  const handleQuickBuy = (amount: number) => {
    setBuyAmount(amount.toString());
  };

  // 在组件挂载时添加样式
  useEffect(() => {
    addAnimationStyle();
  }, []); // 只在组件首次挂载时执行

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToken) return;

    // 获取当前交易类型对应的金额
    const currentAmount = isBuying ? buyAmount : sellAmount;
    if (!currentAmount) return;

    try {
      setError("");
      const parsedAmount = parseFloat(currentAmount);
      const currentPriceFloat = parseFloat(currentPrice);

      console.log("开始交易:", {
        类型: isBuying ? "买入" : "卖出",
        代币: selectedToken.symbol,
        金额: parsedAmount,
        价格: currentPriceFloat,
      });

      // 根据交易类型计算最小输出金额
      let minOutput;
      if (isBuying) {
        // 买入时，计算最少获得的代币数量
        minOutput = (parsedAmount / currentPriceFloat) * (1 - slippage);
      } else {
        // 卖出时，计算最少获得的 ETH 数量
        minOutput = parsedAmount * currentPriceFloat * (1 - slippage);
      }

      // 格式化输出金额，确保不会有过多小数位
      minOutput = formatNumber(minOutput, 8);

      console.log("交易参数:", {
        交易类型: isBuying ? "买入" : "卖出",
        输入金额: parsedAmount,
        当前价格: currentPriceFloat,
        最小输出: minOutput,
        滑点: slippage,
      });

      // 1. 执行链上交易
      const txResult = isBuying
        ? await swapETHForTokens(
            selectedToken.tokenAddress,
            minOutput.toString(),
            formatNumber(parsedAmount, 8)
          )
        : await swapTokensForETH(
            selectedToken.tokenAddress,
            // 使用新函数确保大数字不会变成科学计数法
            formatNumberNoExponent(parsedAmount),
            minOutput.toString()
          );

      console.log("链上交易结果:", txResult);

      // 2. 获取用户地址
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      // 3. 显示交易提交成功的提示，不等待确认
      setToast({
        message: "交易已提交，正在处理中",
        type: "success",
        hash: txResult.transactionHash,
      });

      // 清空输入字段，改善用户体验
      if (isBuying) {
        setBuyAmount("");
      } else {
        setSellAmount("");
      }

      // 4. 开始等待交易确认，添加重试机制
      waitForTransactionConfirmation(
        txResult.transactionHash,
        accounts[0],
        selectedToken,
        parsedAmount,
        currentPriceFloat,
        0
      );
    } catch (err: any) {
      console.error("交易失败:", err);
      let userFriendlyError = "交易失败";
      if (err.message.includes("NUMERIC_FAULT")) {
        userFriendlyError = "数值精度超出范围，请尝试较小的数量";
      } else if (err.message.includes("insufficient funds")) {
        userFriendlyError = "余额不足";
      } else if (err.message.includes("user rejected")) {
        userFriendlyError = "您取消了交易";
      } else if (err.message.includes("gas")) {
        userFriendlyError = "gas费用估算失败，请稍后重试";
      } else if (err.message.includes("invalid FixedNumber")) {
        userFriendlyError = "代币数量格式无效，请使用较小的数量";
      }
      setToast({
        message: userFriendlyError,
        type: "error",
      });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // 添加新方法：等待交易确认，并支持重试
  const waitForTransactionConfirmation = async (
    transactionHash: string,
    userAddress: string,
    token: Token,
    parsedAmount: number,
    currentPriceFloat: number,
    retryCount = 0
  ) => {
    if (retryCount >= MAX_RETRIES) {
      console.log(`已达到最大重试次数(${MAX_RETRIES})，不再重试获取交易结果`);
      setToast({
        message: `交易可能已完成，但确认超时。请稍后查看您的余额`,
        type: "error",
        hash: transactionHash,
      });
      setTimeout(() => setToast(null), 5000);
      return;
    }

    try {
      console.log(
        `开始等待交易确认，尝试次数: ${retryCount + 1}/${MAX_RETRIES}`
      );
      const provider = new ethers.BrowserProvider(window.ethereum);

      // 设置获取交易收据的超时时间
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("获取交易收据超时")), 15000); // 15秒超时
      });

      // 尝试获取交易收据，带超时限制
      const receipt = (await Promise.race([
        provider.getTransactionReceipt(transactionHash),
        timeoutPromise,
      ])) as ethers.TransactionReceipt | null;

      // 如果没有收据或交易未确认，进行重试
      if (!receipt || !receipt.blockNumber) {
        console.log(
          `交易尚未确认，将在${
            (RETRY_DELAY_BASE * Math.pow(1.5, retryCount)) / 1000
          }秒后重试`
        );
        // 使用指数退避策略，延迟时间随重试次数增加
        setTimeout(() => {
          waitForTransactionConfirmation(
            transactionHash,
            userAddress,
            token,
            parsedAmount,
            currentPriceFloat,
            retryCount + 1
          );
        }, RETRY_DELAY_BASE * Math.pow(1.5, retryCount));
        return;
      }

      // 交易已确认，处理结果
      if (receipt.status === 0) {
        console.error("交易失败，被区块链回滚");
        setToast({
          message: "交易在区块链上被回滚，请重试",
          type: "error",
          hash: transactionHash,
        });
        setTimeout(() => setToast(null), 5000);
        return;
      }

      console.log("交易已确认成功，开始处理交易结果");

      // 5. 解析交易结果
      let actualTokenAmount: string; // 代币数量
      let actualEthAmount: string = "0"; // ETH数量，初始化为0
      let realPrice: number; // 实际价格

      if (isBuying) {
        // 买入时：解析获得的代币数量
        const tokenContract = new ethers.Contract(
          token.tokenAddress,
          [
            "event Transfer(address indexed from, address indexed to, uint256 value)",
            "function decimals() view returns (uint8)",
          ],
          provider
        );

        const decimals = await tokenContract.decimals();
        console.log("代币精度:", decimals);

        // 查找转账给用户的 Transfer 事件
        const transferEvent = receipt.logs
          .filter(
            (log) =>
              log.address.toLowerCase() === token.tokenAddress.toLowerCase()
          )
          .map((log) => {
            try {
              return tokenContract.interface.parseLog({
                data: log.data,
                topics: log.topics,
              });
            } catch (e) {
              console.error("解析日志失败:", e);
              return null;
            }
          })
          .find(
            (event) =>
              event &&
              event.name === "Transfer" &&
              event.args.to.toLowerCase() === userAddress.toLowerCase()
          );

        if (!transferEvent) {
          throw new Error("无法获取实际收到的代币数量");
        }

        // 确保数值转换正确
        const tokenAmount = ethers.formatUnits(
          transferEvent.args.value,
          decimals
        );
        actualTokenAmount = Number(tokenAmount).toString();
        console.log("买入交易 - 实际收到代币数量:", actualTokenAmount);

        // 使用实际的ETH输入和收到的代币数量计算实际价格
        const txReceipt = await provider.getTransaction(transactionHash);
        const actualEthValue = txReceipt?.value
          ? Number(ethers.formatEther(txReceipt.value))
          : parsedAmount;
        realPrice = actualEthValue / Number(actualTokenAmount);
        console.log(
          "买入交易 - 实际价格计算:",
          actualEthValue,
          "/",
          actualTokenAmount,
          "=",
          realPrice
        );
      } else {
        // 卖出时：尝试从交易收据中获取实际ETH输出
        actualTokenAmount = formatNumberNoExponent(parsedAmount); // 使用新函数格式化
        // 初始化为估算值，确保有有效值
        actualEthAmount = (parsedAmount * currentPriceFloat).toString();
        // 确保actualEthAmount不为"0"或极小值
        if (
          parseFloat(actualEthAmount) === 0 &&
          parsedAmount > 0 &&
          currentPriceFloat > 0
        ) {
          // 如果计算结果为0但输入不为0，保留一个非零的小数
          actualEthAmount = (1e-10).toString();
          console.log(
            "卖出交易 - 价格太小，设置最小ETH估算值:",
            actualEthAmount
          );
        } else {
          console.log("卖出交易 - 初始估算ETH:", actualEthAmount);
        }

        try {
          // 尝试从交易日志中解析实际收到的ETH金额
          const swapContract = new ethers.Contract(
            SWAP_CONTRACT_ADDRESS, // 使用实际的合约地址
            [
              "event TokenSwapped(address indexed tokenAddress, uint256 amountIn, uint256 amountOut)",
            ],
            provider
          );

          const txReceipt = await provider.getTransactionReceipt(
            transactionHash
          );

          // 尝试找到交换事件
          const swapEvent = txReceipt?.logs.find((log) => {
            try {
              const parsedLog = swapContract.interface.parseLog({
                topics: log.topics,
                data: log.data,
              });
              return parsedLog && parsedLog.name === "TokenSwapped";
            } catch (e) {
              return false;
            }
          });

          if (swapEvent) {
            // 如果找到事件，从中获取实际ETH输出
            const parsedLog = swapContract.interface.parseLog({
              topics: swapEvent.topics,
              data: swapEvent.data,
            });
            // 确保parsedLog不为null
            if (parsedLog && parsedLog.args && parsedLog.args.amountOut) {
              const eventAmount = ethers.formatEther(parsedLog.args.amountOut);
              // 检查事件中的金额是否为0，如果为0则保留估算值
              if (parseFloat(eventAmount) > 0) {
                actualEthAmount = eventAmount;
                console.log("卖出交易 - 从事件中获取实际ETH:", actualEthAmount);
              } else {
                console.log("卖出交易 - 事件中ETH金额为0，保留估算值");
              }
            } else {
              console.log("卖出交易 - 使用估算ETH(日志解析失败)");
            }
          } else {
            console.log("卖出交易 - 使用估算ETH(未找到事件)");
          }
        } catch (err) {
          // 如果解析失败，保留估算值
          console.warn("无法从交易中获取准确ETH金额，使用估算值:", err);
        }

        // 计算实际价格 - ETH金额除以代币数量
        // 确保realPrice不会因为精度问题变成0
        const ethAmount = Number(actualEthAmount);
        realPrice = ethAmount / parsedAmount;
        if (realPrice === 0 && ethAmount > 0) {
          // 如果计算结果为0但ETH金额不为0，设置一个最小非零价格
          realPrice = 1e-12;
          console.log("计算出的价格太小，设置最小价格:", realPrice);
        }
        console.log(
          "卖出交易 - 实际价格计算:",
          actualEthAmount,
          "/",
          parsedAmount,
          "=",
          realPrice
        );
      }

      // 6. 保存交易记录到后端
      try {
        const amountToSave = Number(actualTokenAmount);
        console.log("准备保存到后端的数量:", amountToSave);

        if (isNaN(amountToSave)) {
          throw new Error("交易数量转换失败");
        }

        const transactionData: TransactionCreateDTO = {
          tokenAddress: token.tokenAddress,
          userAddress: userAddress,
          amount: amountToSave, // 确保是数字类型
          // 使用实际计算的价格而不是预估价格
          price: formatPriceForDB(realPrice),
          transactionType: isBuying ? "BUY" : "SELL",
          transactionHash: transactionHash,
          // 添加格式化后的价格文本，避免数据库中存储的价格被截断
          priceText: formatPrice(realPrice),
          // 添加此标志，告诉后端跳过统计更新步骤，这需要后端支持
          skipStatsUpdate: true,
        };

        console.log(
          "准备保存的交易数据:",
          JSON.stringify(transactionData, null, 2)
        );

        try {
          // 尝试保存交易记录，但不依赖结果
          const savedTransaction = await createTransaction(transactionData);
          console.log("交易记录已保存:", savedTransaction);
        } catch (saveErr: any) {
          // 捕获错误但不中断用户流程
          console.error("保存交易记录失败，但不影响交易完成:", saveErr);

          // 只在控制台记录错误，不对用户显示
          if (
            saveErr.message &&
            (saveErr.message.includes("Duplicate entry") ||
              saveErr.message.includes("DuplicateKeyException"))
          ) {
            console.warn("检测到数据库主键冲突错误，可能是统计服务问题");
          }
        }
      } catch (err) {
        console.error("处理交易记录时出错，但交易已确认:", err);
        // 这里不会中断流程，即使保存失败也显示交易成功
      }

      // 7. 显示交易确认成功的 Toast
      setToast({
        message: "交易已确认成功",
        type: "success",
        hash: transactionHash,
        amount: isBuying ? actualTokenAmount : actualEthAmount,
        symbol: isBuying ? token.symbol : "ETH",
      });

      // 5秒后自动关闭Toast
      setTimeout(() => {
        setToast(null);
      }, 5000);

      // 8. 更新余额
      updateTokenBalance(token.tokenAddress);
    } catch (err: any) {
      console.error("等待交易确认失败:", err);

      // 如果是超时错误，尝试重试
      if (err.message.includes("超时") || err.message.includes("timeout")) {
        console.log(
          `等待超时，将在${
            (RETRY_DELAY_BASE * Math.pow(1.5, retryCount)) / 1000
          }秒后重试 (${retryCount + 1}/${MAX_RETRIES})`
        );
        // 显示正在重试的提示
        setToast({
          message: `正在等待交易确认，尝试 ${retryCount + 1}/${MAX_RETRIES}`,
          type: "success",
          hash: transactionHash,
        });

        // 使用指数退避策略，延迟时间随重试次数增加
        setTimeout(() => {
          waitForTransactionConfirmation(
            transactionHash,
            userAddress,
            token,
            parsedAmount,
            currentPriceFloat,
            retryCount + 1
          );
        }, RETRY_DELAY_BASE * Math.pow(1.5, retryCount));
      } else {
        // 其他错误，显示错误消息
        setToast({
          message: `交易确认异常: ${err.message.substring(0, 50)}`,
          type: "error",
          hash: transactionHash,
        });
        setTimeout(() => setToast(null), 5000);

        // 即使发生错误，也尝试更新余额
        updateTokenBalance(token.tokenAddress);
      }
    }
  };

  // 单独封装更新代币余额的函数
  const updateTokenBalance = async (tokenAddress: string) => {
    try {
      if (!isConnected) return;

      const provider = RPC_URL ? new ethers.JsonRpcProvider(RPC_URL) : null;
      if (!provider) {
        throw new Error("RPC URL 未配置");
      }

      // 使用 window.ethereum 获取当前连接的账户地址
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const userAddress = accounts[0];

      const tokenContract = new ethers.Contract(
        tokenAddress,
        ["function balanceOf(address) view returns (uint256)"],
        provider
      );

      // 直接使用用户地址查询余额
      const balance = await tokenContract.balanceOf(userAddress);
      setTokenBalance(ethers.formatUnits(balance, 18));
    } catch (err) {
      console.error("更新代币余额失败:", err);
    }
  };

  // 添加获取历史交易记录的函数
  const fetchTransactionHistory = async (address: string) => {
    try {
      // 使用API模块替代直接fetch
      const data = await import("@/api").then((api) => {
        return api.getUserTransactions(address, 1, 10);
      });

      console.log("交易历史:", data);
      return data;
    } catch (err) {
      console.error("获取交易历史失败:", err);
      return null;
    }
  };

  // 添加错误消失效果
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (error || swapError) {
      setShowError(true);
      timer = setTimeout(() => {
        setShowError(false);
        setError("");
      }, 3000);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [error, swapError]);

  // 修改交易信息显示，使用更简洁的视觉风格
  const renderTradeInfo = () => (
    <div style={{ marginBottom: "15px" }}>
      {/* 价格显示区 */}
      <div
        style={{
          marginBottom: "15px",
          backgroundColor: THEME.lightBg,
          border: `1px solid ${THEME.border}`,
          borderRadius: "2px",
          boxShadow: "inset 1px 1px #dfdfdf, inset -1px -1px #0a0a0a",
          padding: "12px",
          animation:
            currentPrice !== formData.price ? "glow 2s infinite" : "none",
        }}
        className="hover-scale"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
            borderBottom: `1px solid ${THEME.border}`,
            paddingBottom: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* <span
              style={{
                fontSize: "14px",
                marginRight: "8px",
                backgroundColor: THEME.primary,
                color: "white",
                width: "22px",
                height: "22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "2px",
              }}
            >
              💱
            </span> */}
            <span
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                color: THEME.text,
              }}
            >
              当前价格 (ETH)
            </span>
          </div>
          {selectedToken && (
            <div style={{ display: "flex", alignItems: "center" }}>
              {selectedToken.imageUrl && (
                <img
                  src={selectedToken.imageUrl}
                  alt={selectedToken.symbol}
                  style={{
                    width: "18px",
                    height: "18px",
                    marginRight: "6px",
                    objectFit: "contain",
                    border: `1px solid ${THEME.border}`,
                    borderRadius: "50%",
                    padding: "1px",
                    background: "white",
                  }}
                />
              )}
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: "bold",
                  color: THEME.secondary,
                }}
              >
                {selectedToken.symbol}
              </span>
            </div>
          )}
        </div>

        {priceError ? (
          <div
            className="price-error"
            style={{
              color: THEME.error,
              fontWeight: "bold",
              padding: "10px",
              border: `1px solid ${THEME.error}`,
              background: "#ffeeee",
              borderRadius: "2px",
              width: "100%",
              textAlign: "center",
              fontSize: "13px",
            }}
          >
            {priceError}
          </div>
        ) : (
          <div
            id="price-change-indicator"
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              fontFamily: "monospace",
              padding: "12px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              letterSpacing: "0.5px",
              background: THEME.inputBg,
              border: `1px solid ${THEME.border}`,
              borderRadius: "2px",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                textAlign: "center",
                color: THEME.text,
              }}
            >
              {formatPrice(currentPrice)}
            </div>
          </div>
        )}

        {!priceError && (
          <div
            style={{
              fontSize: "11px",
              color: THEME.lightText,
              textAlign: "right",
              marginTop: "8px",
              alignSelf: "flex-end",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: THEME.success,
                marginRight: "4px",
                animation: "pulse 2s infinite",
              }}
            ></div>
            每3秒自动更新
          </div>
        )}
      </div>

      {/* 代币余额/快速金额区域 */}
      <div
        style={{
          marginBottom: "15px",
          backgroundColor: THEME.lightBg,
          border: `1px solid ${THEME.border}`,
          borderRadius: "2px",
          boxShadow: "inset 1px 1px #dfdfdf, inset -1px -1px #0a0a0a",
          padding: "12px",
        }}
        className="hover-scale"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
            borderBottom: `1px solid ${THEME.border}`,
            paddingBottom: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                fontSize: "14px",
                marginRight: "8px",
                backgroundColor: THEME.primary,
                color: "white",
                width: "22px",
                height: "22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "2px",
              }}
            >
              {!isBuying ? "💰" : "⚡"}
            </span>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                color: THEME.text,
              }}
            >
              {!isBuying ? "当前持有" : "快速购买"}
            </span>
          </div>
        </div>

        {!isBuying ? (
          <>
            <div
              style={{
                fontSize: "22px",
                fontWeight: "500",
                marginBottom: "12px",
                fontFamily: "monospace",
                color: THEME.text,
                textAlign: "center",
                padding: "10px 0",
                background: THEME.inputBg,
                border: `1px solid ${THEME.border}`,
                borderRadius: "2px",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              {formatNumber(tokenBalance, 6, true)}{" "}
              <span style={{ fontSize: "17px", color: THEME.primary }}>
                {selectedToken?.symbol}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "8px",
              }}
            >
              {quickSellPercentages.map((percentage) => (
                <Button
                  key={percentage}
                  onClick={() => handleQuickSell(percentage)}
                  style={{
                    fontSize: "13px",
                    padding: "8px",
                    fontWeight: percentage === 100 ? "bold" : "normal",
                    background:
                      percentage === 100
                        ? THEME.secondary
                        : THEME.buttonGradient,
                    color: percentage === 100 ? "#fff" : THEME.text,
                  }}
                >
                  {percentage}%
                </Button>
              ))}
            </div>
          </>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "8px",
            }}
          >
            {quickAmounts.map((amount) => (
              <Button
                key={amount}
                onClick={() => handleQuickBuy(amount)}
                style={{
                  fontSize: "13px",
                  fontWeight:
                    buyAmount === amount.toString() ? "bold" : "normal",
                  padding: "10px 4px",
                  background:
                    buyAmount === amount.toString()
                      ? THEME.secondary
                      : THEME.buttonGradient,
                  color: buyAmount === amount.toString() ? "#fff" : THEME.text,
                  border: `1px solid ${THEME.border}`,
                }}
              >
                {amount} ETH
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* 输入金额区域 */}
      <div
        style={{
          backgroundColor: THEME.lightBg,
          border: `1px solid ${THEME.border}`,
          borderRadius: "2px",
          boxShadow: "inset 1px 1px #dfdfdf, inset -1px -1px #0a0a0a",
          padding: "12px",
        }}
        className="hover-scale"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
            borderBottom: `1px solid ${THEME.border}`,
            paddingBottom: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                fontSize: "14px",
                marginRight: "8px",
                backgroundColor: THEME.primary,
                color: "white",
                width: "22px",
                height: "22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "2px",
              }}
            >
              {isBuying ? "🔽" : "🔼"}
            </span>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                color: THEME.text,
              }}
            >
              {isBuying ? "购买 ETH 数量" : "卖出代币数量"}
            </span>
          </div>
        </div>

        <div>
          <TextInput
            type="number"
            value={isBuying ? buyAmount : sellAmount}
            onChange={handleInputChange}
            fullWidth
            required
            style={{
              fontSize: "16px",
              padding: "12px",
              fontFamily: "monospace",
              border: `1px solid ${THEME.border}`,
              marginBottom: "12px",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)",
            }}
            placeholder={`输入${isBuying ? "ETH" : "代币"}数量`}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: `1px solid ${THEME.border}`,
              padding: "12px 14px",
              background: THEME.inputBg,
              borderRadius: "2px",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "14px",
                  marginRight: "8px",
                  color: THEME.text,
                }}
              >
                {isBuying ? "🪙" : "💵"}
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: THEME.text,
                  fontWeight: "bold",
                }}
              >
                预计{isBuying ? "获得" : "获得"}:
              </span>
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                color: THEME.secondary,
                fontFamily: "monospace",
              }}
            >
              {formatNumber(
                buyAmount && currentPrice && isBuying
                  ? parseFloat(buyAmount) / parseFloat(currentPrice)
                  : sellAmount && currentPrice && !isBuying
                  ? parseFloat(sellAmount) * parseFloat(currentPrice)
                  : 0,
                6,
                true
              )}{" "}
              <span style={{ fontSize: "14px" }}>
                {isBuying ? selectedToken?.symbol : "ETH"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 修改提交按钮部分
  const renderSubmitButton = () => (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginTop: "10px",
      }}
    >
      <Button
        type="submit"
        disabled={swapLoading || !currentPrice}
        style={{
          width: "100%",
          fontSize: "16px",
          padding: "10px",
          fontWeight: "bold",
          background: swapLoading ? THEME.buttonGradient : THEME.primary,
          color: swapLoading ? THEME.text : "white",
          border: `1px solid ${THEME.border}`,
          boxShadow: THEME.cardShadow,
          cursor: swapLoading ? "not-allowed" : "pointer",
        }}
      >
        {swapLoading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "inline-block",
                width: "14px",
                height: "14px",
                marginRight: "8px",
                border: "2px solid rgba(0, 0, 0, 0.2)",
                borderRadius: "50%",
                borderTopColor: THEME.text,
                animation: "spin 1s linear infinite",
              }}
            />
            <span>处理中...</span>
          </div>
        ) : (
          <span>
            {isBuying ? "确认购买" : "确认卖出"} {selectedToken?.symbol}
          </span>
        )}
      </Button>
    </div>
  );

  // 添加操作按钮组
  const renderActionButtons = () => (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: "15px",
        background: THEME.buttonGradient,
        padding: "8px",
        border: `1px solid ${THEME.border}`,
        borderRadius: "2px",
        boxShadow: "inset 1px 1px #dfdfdf, inset -1px -1px #0a0a0a",
      }}
    >
      <Button
        onClick={() => {
          setIsBuying(true);
          setSellAmount("");
        }}
        style={{
          marginRight: "10px",
          padding: "10px 20px",
          background: isBuying ? THEME.primary : THEME.lightBg,
          color: isBuying ? "white" : THEME.text,
          fontWeight: isBuying ? "bold" : "normal",
          border: `1px solid ${THEME.border}`,
          boxShadow: THEME.cardShadow,
          width: "120px",
        }}
      >
        <span style={{ marginRight: "8px" }}>🔽</span>
        购买
      </Button>
      <Button
        onClick={() => {
          setIsBuying(false);
          setBuyAmount("");
        }}
        style={{
          padding: "10px 20px",
          background: !isBuying ? THEME.primary : THEME.lightBg,
          color: !isBuying ? "white" : THEME.text,
          fontWeight: !isBuying ? "bold" : "normal",
          border: `1px solid ${THEME.border}`,
          boxShadow: THEME.cardShadow,
          width: "120px",
        }}
      >
        <span style={{ marginRight: "8px" }}>🔼</span>
        卖出
      </Button>
    </div>
  );

  // 修改主界面布局
  return (
    <>
      {!selectedToken ? (
        // 当没有选择代币时显示提示信息
        <Window
          className="window"
          style={{
            width: "100%",
            maxWidth: "450px",
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
            border: `1px solid ${THEME.border}`,
          }}
        >
          <WindowHeader
            className="window-header"
            style={{
              background: THEME.primary,
              color: "white",
              display: "flex",
              alignItems: "center",
              padding: "8px 12px",
              fontWeight: "bold",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "15px", fontWeight: "bold" }}>
              交易面板
            </span>
          </WindowHeader>
          <WindowContent
            style={{
              padding: "30px 15px",
              backgroundColor: THEME.lightBg,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "300px",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                background: THEME.buttonGradient,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
                border: `1px solid ${THEME.border}`,
                boxShadow: THEME.cardShadow,
              }}
            >
              <span style={{ fontSize: "32px" }}>💱</span>
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                marginBottom: "10px",
                textAlign: "center",
              }}
            >
              请先选择代币
            </div>
            <div
              style={{
                fontSize: "14px",
                color: THEME.lightText,
                textAlign: "center",
                maxWidth: "280px",
                lineHeight: "1.5",
              }}
            >
              从左侧列表中选择一个代币开始交易。您可以买入或卖出选定的代币。
            </div>
          </WindowContent>
        </Window>
      ) : (
        <Window
          className="window"
          style={{
            width: "100%",
            maxWidth: "450px",
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
            border: `1px solid ${THEME.border}`,
          }}
        >
          <WindowHeader
            className="window-header"
            style={{
              background: THEME.primary,
              color: "white",
              display: "flex",
              alignItems: "center",
              padding: "8px 12px",
              fontWeight: "bold",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              {selectedToken?.imageUrl ? (
                <img
                  src={selectedToken.imageUrl}
                  alt={selectedToken.symbol}
                  style={{
                    width: "20px",
                    height: "20px",
                    marginRight: "10px",
                    borderRadius: "50%",
                    border: "1px solid white",
                    padding: "1px",
                    background: "white",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              ) : (
                <span style={{ fontSize: "18px", marginRight: "10px" }}>
                  💱
                </span>
              )}
              <span style={{ fontSize: "15px", fontWeight: "bold" }}>
                {selectedToken?.name} 交易面板
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  cursor: "default",
                  background: "#dfdfdf",
                  border: "1px solid #858585",
                }}
              ></div>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  cursor: "default",
                  background: "#dfdfdf",
                  border: "1px solid #858585",
                }}
              ></div>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  cursor: "default",
                  background: "#dfdfdf",
                  border: "1px solid #858585",
                }}
              ></div>
            </div>
          </WindowHeader>
          <WindowContent
            style={{
              padding: "15px",
              backgroundColor: THEME.lightBg,
            }}
          >
            <form onSubmit={handleSubmit}>
              {renderActionButtons()}
              {renderTradeInfo()}
              {renderSubmitButton()}
            </form>
          </WindowContent>
        </Window>
      )}
      {toast && <Toast {...toast} />}
    </>
  );
};
