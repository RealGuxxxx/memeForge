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
  ScrollView,
  ProgressBar,
} from "react95";
import { useTokenFactory, CreateTokenParams } from "../hooks/useTokenFactory";
import { ImageUploader } from "./ImageUploader";
import { getIPFSUrl } from "../utils/ipfs";
import { tokenApi } from "@/api";
import { TokenStatus } from "@/api/types";
import { ethers } from "ethers";
import addTokenProxyAbi from "../abi/addTokenproxy.json";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";

// 将地址修改为正确的EIP-55校验和格式
const DEFAULT_TOKEN_SUPPORT_PROXY_ADDRESS =
  "0x8DC5F7FfB166C5b59E52A249c3Af6Da7c46F75ec"; // EIP-55地址格式，需要修正

// 修改 getChecksumAddress 实现
const getChecksumAddress = (address: string) => {
  try {
    // 检查地址格式
    if (!address || typeof address !== "string") {
      console.error("[检验和] 无效的地址格式:", address);
      throw new Error("无效的地址格式");
    }

    // 规范化地址：移除空格并确保以0x开头
    let normalizedAddress = address.trim();
    if (!normalizedAddress.startsWith("0x")) {
      normalizedAddress = "0x" + normalizedAddress;
    }

    // 使用ethers.js的getAddress函数获取正确的校验和格式
    try {
      return ethers.getAddress(normalizedAddress);
    } catch (error) {
      console.error("[检验和] 转换地址格式失败:", error);

      // 尝试将地址转为小写后再获取校验和
      try {
        return ethers.getAddress(normalizedAddress.toLowerCase());
      } catch (innerError) {
        console.error("[检验和] 再次尝试转换地址失败:", innerError);
        throw new Error("地址校验和转换失败: " + address);
      }
    }
  } catch (error) {
    console.error("[检验和] 地址处理出错:", error);
    // 在无法转换的情况下返回原始地址，但在使用前需进行检查
    return address;
  }
};

// 重新定义TOKEN_SUPPORT_PROXY_ADDRESS，确保使用正确的校验和格式
const TOKEN_SUPPORT_PROXY_ADDRESS =
  typeof window !== "undefined" &&
  (window as any).ENV_TOKEN_SUPPORT_PROXY_ADDRESS
    ? getChecksumAddress((window as any).ENV_TOKEN_SUPPORT_PROXY_ADDRESS)
    : getChecksumAddress("0xd795800e8a981d8fd14c16743fad5000f78da610"); // 与AddTokenButton保持一致的合约地址

interface FormData extends CreateTokenParams {
  description: string;
}

export const TokenMintForm = () => {
  const { isConnected } = useAccount();
  const {
    createToken,
    loading: contractLoading,
    error: contractError,
  } = useTokenFactory();
  const [isMobile, setIsMobile] = useState(false);
  const [result, setResult] = useState<{
    tokenAddress?: string;
    pairAddress?: string;
    transactionHash?: string;
  } | null>(null);
  const [errorMessage, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [step, setStep] = useState<
    "form" | "creating" | "confirming" | "complete"
  >("form");
  const [confirmationProgress, setConfirmationProgress] = useState(0);
  const [confirmations, setConfirmations] = useState(0);
  const REQUIRED_CONFIRMATIONS = 2;
  const [isAddingToSwap, setIsAddingToSwap] = useState(false);
  const [addToSwapError, setAddToSwapError] = useState<string | null>(null);
  const [addToSwapSuccess, setAddToSwapSuccess] = useState(false);
  const [addToSwapRetries, setAddToSwapRetries] = useState(0);
  const MAX_RETRIES = 10;
  const RETRY_DELAY_BASE = 5000;

  const [formData, setFormData] = useState<FormData>({
    name: "",
    symbol: "",
    decimals: 18,
    initialLiquidityETH: "",
    tokenAmountForLiquidity: "",
    logoIpfsHash: "",
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1小时后
    description: "", // 新增代币描述
    initialSupply: "0", // 添加初始供应量字段，但会在提交时更新
  });

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 错误消息自动消失
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000); // 5秒后自动消失
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // 添加初始化检查日志
  useEffect(() => {
    // 检查TokenSupportProxy地址
    console.log(
      "[初始化] TokenSupportProxy合约地址:",
      TOKEN_SUPPORT_PROXY_ADDRESS
    );

    // 检查ethereum对象
    if (typeof window !== "undefined") {
      if (window.ethereum) {
        console.log("[初始化] 检测到以太坊提供者");

        // 监听钱包切换事件
        const handleAccountsChanged = (accounts: string[]) => {
          console.log("[钱包] 账户已切换:", accounts);
        };

        window.ethereum.on("accountsChanged", handleAccountsChanged);

        // 清理函数
        return () => {
          window.ethereum.removeListener(
            "accountsChanged",
            handleAccountsChanged
          );
        };
      } else {
        console.warn("[初始化] 未检测到以太坊提供者，部分功能可能不可用");
      }
    }
  }, []);

  // 验证表单数据
  const validateForm = (): string | null => {
    if (!formData.name.trim()) return "请输入代币名称";
    if (!formData.symbol.trim()) return "请输入代币符号";
    if (!formData.description.trim()) return "请输入代币描述";

    const initialLiquidityETH = parseFloat(formData.initialLiquidityETH);
    if (isNaN(initialLiquidityETH) || initialLiquidityETH < 0.1)
      return "初始流动性 ETH 不能少于 0.1 ETH";

    const tokenAmount = parseFloat(formData.tokenAmountForLiquidity);
    if (isNaN(tokenAmount) || tokenAmount < 1000)
      return "代币供应量不能少于 1000";

    if (!formData.logoIpfsHash) return "请上传代币 Logo";

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    // 表单验证
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      // 设置初始供应量等于流动性代币数量
      const createParams = {
        ...formData,
        initialSupply: formData.tokenAmountForLiquidity,
      };

      // 更新状态
      setLoading(true);
      setStep("creating");
      setConfirmations(0);
      setConfirmationProgress(0);

      // 调用智能合约创建代币
      console.log("开始创建代币合约...");
      const result = await createToken(createParams);
      console.log("合约创建交易已发送:", result);

      // 即使没有获取到代币地址，但有交易哈希也进入确认阶段
      if (result && result.transactionHash) {
        setResult(result);
        setStep("confirming");

        // 等待额外的区块确认
        try {
          // 连接到以太坊网络
          const provider = new ethers.BrowserProvider(window.ethereum);

          // 获取当前区块号
          const currentBlock = await provider.getBlockNumber();
          console.log("当前区块:", currentBlock);

          // 监听新区块并尝试获取代币地址
          const blockListener = async (blockNumber: number) => {
            const newConfirmations = blockNumber - currentBlock;
            console.log(`新区块 ${blockNumber}, 确认数: ${newConfirmations}`);

            if (newConfirmations > 0) {
              setConfirmations(newConfirmations);
              setConfirmationProgress(
                Math.min((newConfirmations / REQUIRED_CONFIRMATIONS) * 100, 100)
              );

              // 如果当前结果中没有代币地址，尝试从链上获取
              if (!result.tokenAddress && newConfirmations >= 1) {
                try {
                  console.log("尝试从合约获取新创建的代币地址...");
                  // 这里可以通过调用合约方法或查询交易回执事件来获取代币地址
                  // 示例代码，实际实现可能有所不同
                  const signer = await provider.getSigner();
                  const tokenFactory = new ethers.Contract(
                    CONTRACT_ADDRESSES.TOKEN_FACTORY,
                    CONTRACT_ABIS.TOKEN_FACTORY,
                    signer
                  );

                  // 获取交易回执并再次尝试解析事件
                  const txReceipt = await provider.getTransactionReceipt(
                    result.transactionHash
                  );
                  if (txReceipt) {
                    console.log("获取到交易回执，尝试解析事件...");
                    const events = txReceipt.logs || [];

                    for (let i = 0; i < events.length; i++) {
                      const log = events[i];
                      try {
                        if (
                          log.address.toLowerCase() ===
                          CONTRACT_ADDRESSES.TOKEN_FACTORY.toLowerCase()
                        ) {
                          const tokenCreatedEventSignature = ethers.id(
                            "TokenCreated(address,string,string,address)"
                          );
                          const pairCreatedEventSignature = ethers.id(
                            "PairCreated(address,address)"
                          );

                          if (log.topics[0] === tokenCreatedEventSignature) {
                            const decodedData = tokenFactory.interface.parseLog(
                              {
                                topics: log.topics,
                                data: log.data,
                              }
                            );
                            const tokenAddress = decodedData?.args?.token;
                            console.log(
                              `从链上成功获取到代币地址: ${tokenAddress}`
                            );
                            // 更新结果
                            result.tokenAddress = tokenAddress;
                            setResult({ ...result });
                            break;
                          }
                        }
                      } catch (err) {
                        console.error("解析事件日志失败:", err);
                      }
                    }
                  }
                } catch (err) {
                  console.error("从链上获取代币地址失败:", err);
                }
              }

              // 如果达到所需确认数，向后端发送请求
              if (newConfirmations >= REQUIRED_CONFIRMATIONS) {
                provider.removeListener("block", blockListener);
                handleBackendSubmission(result);
              }
            }
          };

          provider.on("block", blockListener);

          // 确保监听器在组件卸载时被移除
          return () => {
            provider.removeListener("block", blockListener);
          };
        } catch (err) {
          console.error("监听区块确认失败:", err);
          // 出错时也尝试提交到后端
          handleBackendSubmission(result);
        }
      } else {
        console.error("未能获取到有效的交易哈希:", result);
        setError("创建代币合约失败，请确保MetaMask已解锁且网络连接正常");
        setStep("form");
      }
    } catch (err: any) {
      console.error("创建代币失败:", err);

      // 根据错误类型给出更具体的错误信息
      if (err.message?.includes("Liquidity too low")) {
        setError("流动性不足，请增加 ETH 或代币数量");
      } else if (err.message?.includes("insufficient funds")) {
        setError("钱包余额不足，请确保有足够的 ETH");
      } else if (
        err.message?.includes("rejected") ||
        err.message?.includes("user denied")
      ) {
        setError("您取消了交易");
      } else if (
        err.message?.includes("network") ||
        err.message?.includes("connection")
      ) {
        setError("网络连接错误，请检查您的网络连接并重试");
      } else if (err.message?.includes("gas")) {
        setError("Gas 费用估算失败，请调整 ETH 数量");
      } else if (err.message?.includes("nonce")) {
        setError("交易 nonce 错误，请刷新页面重试");
      } else if (err.message?.includes("timeout")) {
        setError("交易超时，网络可能拥堵，请稍后重试");
      } else {
        // 显示简洁的错误信息，避免技术细节困扰用户
        setError("创建代币失败: " + (err.reason || err.message || "未知错误"));
      }
    } finally {
      setLoading(false);
      if (step === "creating") {
        setStep("form");
      }
    }
  };

  // 添加函数检查合约是否部署在网络上
  const isContractDeployed = async (
    address: string,
    provider: ethers.Provider
  ): Promise<boolean> => {
    try {
      const code = await provider.getCode(address);
      // 如果返回的代码只是"0x"，说明地址上没有合约代码
      return code !== "0x";
    } catch (error) {
      console.error("[合约检查] 检查合约部署状态出错:", error);
      return false;
    }
  };

  // 添加一个新函数来检查代币在合约中的状态
  const checkTokenStatus = async (tokenAddress: string): Promise<boolean> => {
    if (!window.ethereum || !tokenAddress) {
      console.error("[TokenStatus] 请安装MetaMask钱包或提供有效的代币地址");
      return false;
    }

    try {
      console.log(`[TokenStatus] 开始检查代币 ${tokenAddress} 的状态...`);

      // 确保使用小写地址处理并获取校验和格式
      const checksumTokenAddress = ethers.getAddress(
        tokenAddress.toLowerCase()
      );
      console.log(`[TokenStatus] 使用校验和格式地址: ${checksumTokenAddress}`);

      // 合约地址 - 现在使用TOKEN_SUPPORT_PROXY_ADDRESS常量
      console.log(`[TokenStatus] 使用合约地址: ${TOKEN_SUPPORT_PROXY_ADDRESS}`);

      // 创建提供者和合约实例
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      console.log(
        `[TokenStatus] 当前网络: ${network.name}, 链ID: ${network.chainId}`
      );
      console.log(
        `[TokenStatus] 当前区块号: ${await provider.getBlockNumber()}`
      );

      // 检查合约是否部署
      const code = await provider.getCode(TOKEN_SUPPORT_PROXY_ADDRESS);
      if (code === "0x") {
        console.error(
          `[TokenStatus] 合约未部署或当前网络上不存在! 代码长度: ${code.length}`
        );
        return false;
      }
      console.log(`[TokenStatus] 合约已部署，合约字节码长度: ${code.length}`);

      // 创建只读合约实例
      const tokenSupportProxy = new ethers.Contract(
        TOKEN_SUPPORT_PROXY_ADDRESS,
        addTokenProxyAbi,
        provider
      );

      // 调用isTokenAdded方法
      console.log(`[TokenStatus] 调用isTokenAdded(${checksumTokenAddress})...`);
      try {
        const isAdded = await tokenSupportProxy.isTokenAdded(
          checksumTokenAddress
        );
        console.log(`[TokenStatus] 代币是否已添加: ${isAdded}`);
        return isAdded;
      } catch (error) {
        console.error(`[TokenStatus] 调用isTokenAdded方法失败:`, error);
        console.log(`[TokenStatus] 尝试调用替代方法: addedTokens`);

        // 尝试调用addedTokens映射方法（可能在某些合约中存在）
        try {
          const isAdded = await tokenSupportProxy.addedTokens(
            checksumTokenAddress
          );
          console.log(`[TokenStatus] 使用addedTokens检查结果: ${isAdded}`);
          return isAdded;
        } catch (altError) {
          console.error(`[TokenStatus] 替代方法也失败:`, altError);
          return false;
        }
      }
    } catch (err) {
      console.error("[TokenStatus] 检查代币状态时出错:", err);
      return false;
    }
  };

  // 修改addTokenToSupportedList函数，增强错误处理
  const addTokenToSupportedList = async (
    tokenAddress: string,
    retryCount = 0
  ) => {
    if (!window.ethereum || !tokenAddress) {
      console.error(
        "[TokenSupportProxy] 请安装MetaMask钱包或提供有效的代币地址"
      );
      setAddToSwapError("未检测到钱包或代币地址无效");
      return;
    }

    if (retryCount >= MAX_RETRIES) {
      console.log(
        `[TokenSupportProxy] 已达到最大重试次数(${MAX_RETRIES})，不再尝试添加代币`
      );
      setAddToSwapError(
        `已尝试${MAX_RETRIES}次添加操作，均未成功。系统将不再自动重试`
      );
      setAddToSwapRetries(retryCount);
      return;
    }

    // 只有第一次调用或手动调用时才重置状态
    if (retryCount === 0) {
      setIsAddingToSwap(true);
      setAddToSwapError(null);
      setAddToSwapSuccess(false);
      setAddToSwapRetries(0);

      // 设置一个超时处理，30秒后如果还在添加状态则强制更新UI
      const timeoutId = setTimeout(() => {
        if (isAddingToSwap) {
          console.log("[TokenSupportProxy] 添加代币操作超时，强制更新界面状态");
          // 检查代币是否已添加成功
          checkTokenStatus(tokenAddress)
            .then((isAdded) => {
              if (isAdded) {
                console.log("[TokenSupportProxy] 检测到代币已添加，更新UI状态");
                setAddToSwapSuccess(true);
                setAddToSwapError(null);
              } else {
                console.log(
                  "[TokenSupportProxy] 代币添加未完成，设置为失败状态"
                );
                setAddToSwapError('添加代币操作超时，请点击"刷新状态"手动检查');
              }
              setIsAddingToSwap(false);
            })
            .catch((err) => {
              console.error("[TokenSupportProxy] 超时检查发生错误:", err);
              setAddToSwapError('添加代币操作超时，请点击"刷新状态"手动检查');
              setIsAddingToSwap(false);
            });
        }
      }, 30000); // 30秒超时

      // 保存timeoutId，以便在需要时清除
      (window as any).tokenAddTimeoutId = timeoutId;
    } else {
      // 更新重试次数状态
      setAddToSwapRetries(retryCount);

      // 如果已经存在超时处理，重置它
      if ((window as any).tokenAddTimeoutId) {
        clearTimeout((window as any).tokenAddTimeoutId);

        // 设置新的超时处理
        const timeoutId = setTimeout(() => {
          if (isAddingToSwap) {
            console.log("[TokenSupportProxy] 重试操作超时，强制更新界面状态");
            checkTokenStatus(tokenAddress)
              .then((isAdded) => {
                if (isAdded) {
                  setAddToSwapSuccess(true);
                  setAddToSwapError(null);
                } else {
                  setAddToSwapError(
                    `重试${retryCount}次后操作超时，请手动检查`
                  );
                }
                setIsAddingToSwap(false);
              })
              .catch(() => {
                setAddToSwapError(`重试${retryCount}次后操作超时，请手动检查`);
                setIsAddingToSwap(false);
              });
          }
        }, 30000); // 30秒超时

        (window as any).tokenAddTimeoutId = timeoutId;
      }
    }

    try {
      // 首先检查代币状态
      console.log(`[TokenSupportProxy] 首先检查代币状态...`);
      const alreadyAdded = await checkTokenStatus(tokenAddress);
      if (alreadyAdded) {
        console.log(`[TokenSupportProxy] 代币已经在支持列表中，无需添加`);
        setAddToSwapSuccess(true);
        setIsAddingToSwap(false);
        return;
      }

      // 确保使用小写地址处理并获取校验和格式
      const checksumTokenAddress = ethers.getAddress(
        tokenAddress.toLowerCase()
      );
      console.log(
        `[TokenSupportProxy] 尝试添加代币: ${checksumTokenAddress} (尝试 ${
          retryCount + 1
        }/${MAX_RETRIES})`
      );

      // 确保使用小写地址重新获取校验和格式
      console.log(
        `[TokenSupportProxy] 使用合约地址: ${TOKEN_SUPPORT_PROXY_ADDRESS}`
      );

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      console.log(
        `[TokenSupportProxy] 连接的网络: ${network.name}, 链ID: ${network.chainId}`
      );

      // 检查网络是否为Sepolia
      if (Number(network.chainId) !== 11155111) {
        setAddToSwapError("请切换到Sepolia测试网后再尝试添加代币");
        setIsAddingToSwap(false);
        return;
      }

      // 验证合约是否部署在当前网络上
      console.log(`[TokenSupportProxy] 检查合约是否部署...`);
      const code = await provider.getCode(TOKEN_SUPPORT_PROXY_ADDRESS);
      if (code === "0x") {
        console.error(
          `[TokenSupportProxy] 合约在当前网络上未部署: ${TOKEN_SUPPORT_PROXY_ADDRESS}`
        );
        setAddToSwapError("代币支持合约在当前网络上未部署，可能需要切换网络");
        setIsAddingToSwap(false);
        return;
      }
      console.log(
        `[TokenSupportProxy] 确认合约已部署 ✓, 代码长度: ${code.length}`
      );

      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      console.log(`[TokenSupportProxy] 使用钱包地址: ${signerAddress}`);

      // 创建TokenSupportProxy合约实例
      console.log(`[TokenSupportProxy] 创建合约实例...`);
      const tokenSupportProxy = new ethers.Contract(
        TOKEN_SUPPORT_PROXY_ADDRESS,
        addTokenProxyAbi,
        signer
      );

      // 检查用户是否是合约所有者
      let isOwner = false;
      let ownerAddress = "";
      try {
        ownerAddress = await tokenSupportProxy.owner();
        isOwner = signerAddress.toLowerCase() === ownerAddress.toLowerCase();
        console.log(`[TokenSupportProxy] 合约所有者: ${ownerAddress}`);
        console.log(`[TokenSupportProxy] 当前用户是否是所有者: ${isOwner}`);

        // 如果不是所有者，仅显示警告但不阻止操作
        if (!isOwner) {
          console.warn(
            `[TokenSupportProxy] 警告：当前用户不是合约所有者，可能无法成功执行操作`
          );
        }
      } catch (err) {
        console.error(`[TokenSupportProxy] 获取合约所有者失败:`, err);
        // 继续执行，让合约交易去判断权限
      }

      console.log(`[TokenSupportProxy] 代币未在支持列表中，准备添加`);

      // 调用合约的addSupportedToken方法
      console.log(`[TokenSupportProxy] 估算交易Gas费用...`);
      let gasLimit;
      try {
        // 估算Gas
        gasLimit = await tokenSupportProxy.addSupportedToken.estimateGas(
          checksumTokenAddress
        );
        console.log(`[TokenSupportProxy] 估算Gas费用: ${gasLimit}`);
        // 添加20%的缓冲
        gasLimit = BigInt(Math.floor(Number(gasLimit) * 1.2));
        console.log(`[TokenSupportProxy] 添加20%缓冲后Gas费用: ${gasLimit}`);
      } catch (err: any) {
        console.error(`[TokenSupportProxy] 估算Gas费用失败:`, err);

        // 检查是否权限错误
        if (
          typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof err.message === "string" &&
          (err.message.includes("execution reverted") ||
            err.message.includes("caller is not the owner"))
        ) {
          const errorMsg = `您不是合约所有者，可能无法添加代币。所有者地址: ${ownerAddress.slice(
            0,
            6
          )}...${ownerAddress.slice(-4)}`;
          console.error(`[TokenSupportProxy] ${errorMsg}`);
          setAddToSwapError(errorMsg);

          // 如果是权限错误，增加重试间隔，但仍然尝试
          const retryDelay = RETRY_DELAY_BASE * Math.pow(2, retryCount);
          console.log(
            `[TokenSupportProxy] 权限可能不足，将在 ${
              retryDelay / 1000
            } 秒后重试 (${retryCount + 1}/${MAX_RETRIES})`
          );
          setTimeout(
            () => addTokenToSupportedList(tokenAddress, retryCount + 1),
            retryDelay
          );
          return;
        }

        console.log(`[TokenSupportProxy] 错误详情:`, JSON.stringify(err));
        gasLimit = BigInt(200000); // 设置安全的默认值
        console.log(`[TokenSupportProxy] 使用默认Gas费用: ${gasLimit}`);
      }

      console.log(`[TokenSupportProxy] 发起添加代币交易...`);
      const tx = await tokenSupportProxy.addSupportedToken(
        checksumTokenAddress,
        {
          gasLimit,
        }
      );
      console.log(`[TokenSupportProxy] 交易已发送，等待确认，哈希: ${tx.hash}`);

      // 提供交易确认前的交互反馈
      setError("正在添加代币到支持列表，请耐心等待交易确认...");

      // 等待交易确认
      console.log(`[TokenSupportProxy] 等待交易确认...`);
      const receipt = await tx.wait();
      console.log(
        `[TokenSupportProxy] 交易已确认，状态: ${
          receipt.status === 1 ? "成功" : "失败"
        }, 区块号: ${receipt.blockNumber}, Gas使用: ${receipt.gasUsed}`
      );

      if (receipt.status === 1) {
        console.log(`[TokenSupportProxy] 代币已成功添加到支持列表`);
        setAddToSwapSuccess(true);
        setAddToSwapRetries(retryCount); // 记录实际的重试次数

        // 再次验证代币是否确实添加成功
        try {
          const verifyIsAdded = await tokenSupportProxy.isTokenAdded(
            checksumTokenAddress
          );
          console.log(
            `[TokenSupportProxy] 验证代币是否添加成功: ${verifyIsAdded}`
          );
          if (!verifyIsAdded) {
            console.warn(
              `[TokenSupportProxy] 交易成功但验证显示代币可能未添加成功，将重试`
            );

            // 交易成功但验证失败，稍后重试
            const retryDelay = RETRY_DELAY_BASE * Math.pow(1.5, retryCount);
            console.log(
              `[TokenSupportProxy] 将在 ${retryDelay / 1000} 秒后重试 (${
                retryCount + 1
              }/${MAX_RETRIES})`
            );
            setTimeout(
              () => addTokenToSupportedList(tokenAddress, retryCount + 1),
              retryDelay
            );
            return;
          } else {
            // 明确在验证成功后设置状态
            console.log("[TokenSupportProxy] 验证成功，更新UI状态");
            setAddToSwapSuccess(true);
            setAddToSwapError(null);
            setError(null); // 清除任何可能存在的错误信息
            setIsAddingToSwap(false);
          }
        } catch (err) {
          console.error(`[TokenSupportProxy] 最终验证失败:`, err);
          // 即使验证出错，也将标记为成功，避免界面卡住
          setAddToSwapSuccess(true);
          setIsAddingToSwap(false);
          setError(null);
        }

        setError(null); // 清除之前的交互提示
      } else {
        throw new Error("交易被确认但执行失败");
      }
    } catch (err: any) {
      console.error(`[TokenSupportProxy] 添加代币到支持列表失败:`, err);
      // 记录详细错误信息
      if (err.code) {
        console.error(`[TokenSupportProxy] 错误代码: ${err.code}`);
      }
      if (err.reason) {
        console.error(`[TokenSupportProxy] 错误原因: ${err.reason}`);
      }
      if (err.data) {
        console.error(`[TokenSupportProxy] 错误数据: ${err.data}`);
      }
      if (err.transaction) {
        console.error(`[TokenSupportProxy] 交易信息:`, err.transaction);
      }

      // 为用户显示更友好的错误信息
      let userErrorMessage = "添加代币到支持列表失败";
      let shouldRetry = true;

      if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof err.message === "string"
      ) {
        if (err.message.includes("user rejected") || err.code === 4001) {
          userErrorMessage = "您取消了交易，系统将自动重试";
        } else if (err.message.includes("insufficient funds")) {
          userErrorMessage = "钱包余额不足";
          shouldRetry = false; // 余额不足不重试
        } else if (
          err.message.includes("network") ||
          err.message.includes("connect")
        ) {
          userErrorMessage = "网络连接错误，系统将自动重试";
        } else if (err.message.includes("gas")) {
          userErrorMessage = "Gas费用估算失败，系统将自动重试";
        } else if (err.message.includes("execution reverted")) {
          userErrorMessage = "合约执行失败，系统将自动重试";
        } else if (err.message.includes("code=BAD_DATA")) {
          userErrorMessage = "合约接口不匹配，可能需要更新ABI或检查网络";
          shouldRetry = false;
        } else {
          userErrorMessage =
            err.message.length > 100
              ? err.message.substring(0, 100) + "..."
              : err.message;
        }
      } else if (err.code === 4001) {
        userErrorMessage = "您取消了交易，系统将自动重试";
      }

      setAddToSwapError(
        `${userErrorMessage} ${
          shouldRetry ? `(尝试${retryCount + 1}/${MAX_RETRIES})` : ""
        }`
      );

      // 自动重试逻辑
      if (shouldRetry && retryCount < MAX_RETRIES) {
        // 使用指数退避策略，延迟时间随重试次数增加
        const retryDelay = RETRY_DELAY_BASE * Math.pow(1.5, retryCount);
        console.log(
          `[TokenSupportProxy] 将在 ${retryDelay / 1000} 秒后重试 (${
            retryCount + 1
          }/${MAX_RETRIES})`
        );
        setTimeout(
          () => addTokenToSupportedList(tokenAddress, retryCount + 1),
          retryDelay
        );
      } else if (!shouldRetry) {
        console.log(`[TokenSupportProxy] 由于错误类型，不进行自动重试`);
        setIsAddingToSwap(false);
      }
    } finally {
      // 只有在最后一次重试或成功时才设置为false
      if (retryCount >= MAX_RETRIES - 1 || addToSwapSuccess) {
        setIsAddingToSwap(false);
      }

      // 清除超时定时器
      if ((window as any).tokenAddTimeoutId) {
        clearTimeout((window as any).tokenAddTimeoutId);
        (window as any).tokenAddTimeoutId = null;
      }

      // 确保UI界面显示最新状态，防止界面卡住
      console.log(
        `[TokenSupportProxy] 当前添加状态: ${
          addToSwapSuccess ? "成功" : "处理中"
        }, 尝试次数: ${retryCount + 1}/${MAX_RETRIES}`
      );

      // 在添加完成后更新界面状态
      if (step === "complete" && result && result.tokenAddress) {
        console.log("[TokenSupportProxy] 更新结果界面状态");
        // 强制重新渲染完成状态
        setResult({ ...result });
      }
    }
  };

  // 修改handleBackendSubmission函数，正确处理totalSupply字段
  const handleBackendSubmission = async (result: any) => {
    try {
      console.log("开始保存代币信息到后端...");
      // 获取当前连接的钱包地址
      const creatorAddress = window.ethereum?.selectedAddress || "0x";

      // 检查是否有代币地址
      if (!result.tokenAddress) {
        console.warn("警告: 未能获取代币地址，但仍将继续执行流程");
        // 在没有代币地址的情况下，还是进入完成状态，但显示警告信息
        setError(
          "交易已确认，但无法获取代币地址。您可以稍后在区块链浏览器中查找您的交易。"
        );
        setStep("complete");
        return;
      }

      // 确保totalSupply是有效值，同时记录详细信息方便排查
      const tokenAmount = formData.tokenAmountForLiquidity || "1000";
      console.log("准备保存的totalSupply原始值:", tokenAmount);
      console.log("tokenAmount类型:", typeof tokenAmount);

      // 使用tokenApi发送请求到后端 - 提供详细的日志
      console.log("准备发送的完整请求:", {
        tokenAddress: result.tokenAddress,
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description || "",
        ipfsCid: formData.logoIpfsHash,
        totalSupply: tokenAmount,
        creatorAddress: creatorAddress,
      });

      const saveResult = await tokenApi.createToken({
        tokenAddress: result.tokenAddress,
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description || "",
        ipfsCid: formData.logoIpfsHash,
        totalSupply: tokenAmount, // 确保字段值有效
        creatorAddress: creatorAddress,
      });

      console.log("保存代币信息成功:", saveResult);

      setStep("complete");

      // 成功保存后，将代币添加到支持列表（延迟执行以避免同时发起多个交易）
      setTimeout(() => {
        if (result && result.tokenAddress) {
          addTokenToSupportedList(result.tokenAddress);
        }
      }, 1000); // 延迟1秒执行
    } catch (err: any) {
      console.error("保存代币信息到后端失败:", err);
      console.error(
        "错误详情:",
        JSON.stringify(err.response?.data || err.message)
      );

      // 尝试记录请求和响应的详细信息
      if (err.config) {
        console.error("请求数据:", err.config.data);
      }
      if (err.response) {
        console.error("响应状态:", err.response.status);
        console.error("响应数据:", err.response.data);
      }

      // 即使后端保存失败，也不阻止用户继续操作
      setError(
        `代币创建成功，但保存到后端数据库失败: ${
          err.message || "未知错误"
        }。您的代币仍然有效，请稍后在区块链浏览器中查看。`
      );
      setStep("complete");

      // 即使后端保存失败，也尝试将代币添加到支持列表（延迟执行）
      setTimeout(() => {
        if (result && result.tokenAddress) {
          addTokenToSupportedList(result.tokenAddress);
        }
      }, 1000); // 延迟1秒执行
    }
  };

  const handleLogoUpload = (hash: string) => {
    setFormData((prev) => ({
      ...prev,
      logoIpfsHash: hash,
    }));
  };

  // 重置表单
  const handleReset = () => {
    setFormData({
      name: "",
      symbol: "",
      decimals: 18,
      initialLiquidityETH: "",
      tokenAmountForLiquidity: "",
      logoIpfsHash: "",
      deadline: Math.floor(Date.now() / 1000) + 3600,
      description: "",
      initialSupply: "0",
    });
    setResult(null);
    setError(null);
    setStep("form");

    // 重置Swap相关状态
    setAddToSwapSuccess(false);
    setAddToSwapError(null);
    setAddToSwapRetries(0);
    setIsAddingToSwap(false);
  };

  // 错误提示窗口
  const ErrorWindow = () => {
    if (!errorMessage) return null;

    return (
      <Window
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          width: isMobile ? "90%" : "400px",
        }}
      >
        <WindowHeader
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          <span>错误提示</span>
        </WindowHeader>
        <WindowContent>
          <div style={{ padding: "10px", marginBottom: "15px" }}>
            {errorMessage}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={() => setError(null)}>关闭</Button>
          </div>
        </WindowContent>
      </Window>
    );
  };

  if (!isConnected) {
    return (
      <Window style={{ width: "100%", height: "100%" }}>
        <WindowHeader>铸造代币</WindowHeader>
        <WindowContent>
          <div style={{ padding: "1rem", textAlign: "center", color: "#222" }}>
            请先连接钱包以铸造代币
          </div>
        </WindowContent>
      </Window>
    );
  }

  // 完成状态
  if (step === "complete" && result) {
    return (
      <Window style={{ width: "100%", height: "100%" }}>
        <WindowHeader
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>铸造成功</span>
          <Button
            onClick={handleReset}
            style={{
              padding: "0 4px",
              minWidth: "auto",
              height: "20px",
              fontSize: "12px",
            }}
          >
            创建新代币
          </Button>
        </WindowHeader>
        <WindowContent>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <span
              role="img"
              aria-label="success"
              style={{
                fontSize: "48px",
                display: "block",
                marginBottom: "0.5rem",
              }}
            >
              ✅
            </span>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.5rem" }}>
              代币铸造成功!
            </h2>
          </div>

          <Fieldset label="代币信息" style={{ marginBottom: "1rem" }}>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>名称:</strong> {formData.name}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>符号:</strong> {formData.symbol}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>总供应量:</strong> {formData.tokenAmountForLiquidity}
            </div>
            {/* 展示Logo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
            </div>
          </Fieldset>

          <Fieldset label="合约信息" style={{ marginBottom: "1rem" }}>
            <div style={{ marginBottom: "0.5rem", wordBreak: "break-all" }}>
              <strong>代币地址:</strong> {result.tokenAddress}
            </div>
            {/* 移除了pairAddress相关内容 */}
            <div style={{ wordBreak: "break-all" }}>
              <strong>交易哈希:</strong>{" "}
              <a
                href={`https://sepolia.etherscan.io/tx/${result.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#0366d6", textDecoration: "underline" }}
              >
                {result.transactionHash}
              </a>
            </div>

            {/* 添加对支持列表状态的显示 */}
            <div style={{ marginTop: "0.5rem" }}>
              <strong>交易所支持状态:</strong>{" "}
              {isAddingToSwap ? (
                <span style={{ color: "#f5a623" }}>
                  添加中... (尝试 {addToSwapRetries + 1}/{MAX_RETRIES})
                </span>
              ) : addToSwapSuccess ? (
                <span style={{ color: "#4caf50" }}>
                  ✓ 已添加到交易所支持列表
                </span>
              ) : addToSwapError ? (
                <span style={{ color: "#d32f2f" }}>{addToSwapError}</span>
              ) : (
                <span style={{ color: "#f5a623" }}>准备添加...</span>
              )}
              {/* 添加手动刷新按钮 */}
              {!addToSwapSuccess && (
                <Button
                  onClick={() => {
                    console.log("[UI] 手动刷新交易所支持状态");
                    // 如果添加过程正在进行，则不做操作
                    if (isAddingToSwap) return;

                    // 如果有错误，重新尝试添加代币
                    if (result && result.tokenAddress) {
                      addTokenToSupportedList(result.tokenAddress, 0);
                    }

                    // 或者直接检查状态
                    if (result && result.tokenAddress) {
                      checkTokenStatus(result.tokenAddress).then((isAdded) => {
                        if (isAdded) {
                          console.log("[UI] 检测到代币已添加到支持列表");
                          setAddToSwapSuccess(true);
                          setAddToSwapError(null);
                          setIsAddingToSwap(false);
                        } else {
                          console.log("[UI] 代币尚未添加到支持列表");
                        }
                      });
                    }
                  }}
                  disabled={isAddingToSwap}
                  size="sm"
                  style={{
                    marginLeft: "10px",
                    padding: "2px 8px",
                    fontSize: "12px",
                    height: "24px",
                  }}
                >
                  刷新状态
                </Button>
              )}
            </div>
          </Fieldset>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "1rem",
            }}
          >
            <Button onClick={handleReset} style={{ width: "48%" }}>
              创建新代币
            </Button>
            <Button
              onClick={() =>
                window.open(
                  `https://sepolia.etherscan.io/token/${result.tokenAddress}`,
                  "_blank"
                )
              }
              style={{ width: "48%" }}
            >
              查看代币详情
            </Button>
          </div>
        </WindowContent>
      </Window>
    );
  }

  // 区块确认状态
  if (step === "confirming" && result) {
    return (
      <Window style={{ width: "100%", height: "100%" }}>
        <WindowHeader>确认交易</WindowHeader>
        <WindowContent>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.5rem" }}>
              等待区块确认中...
            </h2>
            <p>交易已提交到区块链，正在等待确认。请耐心等待。</p>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}
            >
              <span>
                确认进度: {confirmations} / {REQUIRED_CONFIRMATIONS} 区块
              </span>
              <span>{Math.round(confirmationProgress)}%</span>
            </div>
            <ProgressBar value={confirmationProgress} />
          </div>

          <Fieldset label="交易信息" style={{ marginBottom: "1rem" }}>
            <div style={{ marginBottom: "0.5rem", wordBreak: "break-all" }}>
              <strong>代币地址:</strong> {result.tokenAddress}
            </div>
            <div style={{ wordBreak: "break-all" }}>
              <strong>交易哈希:</strong>{" "}
              <a
                href={`https://sepolia.etherscan.io/tx/${result.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#0366d6", textDecoration: "underline" }}
              >
                {result.transactionHash}
              </a>
            </div>
          </Fieldset>

          <div style={{ color: "#666", fontSize: "14px", marginTop: "1rem" }}>
            <p>确认过程通常需要几分钟时间。在此期间，请不要关闭此窗口。</p>
            <p>一旦得到足够的确认，您的代币信息将被保存到平台。</p>
          </div>
        </WindowContent>
      </Window>
    );
  }

  return (
    <Window style={{ width: "100%", height: "100%" }}>
      <WindowHeader>铸造新代币</WindowHeader>
      <WindowContent>
        <form onSubmit={handleSubmit}>
          <Fieldset label="基本信息" style={{ marginBottom: "1rem" }}>
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  marginBottom: "0.5rem",
                  display: "block",
                  fontSize: isMobile ? "14px" : "16px",
                }}
              >
                代币名称 *
              </label>
              <TextInput
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="例如: Doge Coin"
                fullWidth
                required
                disabled={isLoading}
                style={{ fontSize: isMobile ? "14px" : "16px" }}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  marginBottom: "0.5rem",
                  display: "block",
                  fontSize: isMobile ? "14px" : "16px",
                }}
              >
                代币符号 *
              </label>
              <TextInput
                value={formData.symbol}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({
                    ...formData,
                    symbol: e.target.value.toUpperCase(),
                  })
                }
                placeholder="例如: DOGE"
                fullWidth
                required
                disabled={isLoading}
                style={{ fontSize: isMobile ? "14px" : "16px" }}
              />
              <small
                style={{
                  display: "block",
                  marginTop: "0.25rem",
                  color: "#666",
                }}
              >
                建议使用大写字母
              </small>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  marginBottom: "0.5rem",
                  display: "block",
                  fontSize: isMobile ? "14px" : "16px",
                }}
              >
                代币描述 *
              </label>
              <TextInput
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="描述代币的用途和特点"
                fullWidth
                required
                disabled={isLoading}
                style={{ fontSize: isMobile ? "14px" : "16px" }}
              />
            </div>
          </Fieldset>

          <Fieldset label="发行信息" style={{ marginBottom: "1rem" }}>
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  marginBottom: "0.5rem",
                  display: "block",
                  fontSize: isMobile ? "14px" : "16px",
                }}
              >
                初始流动性 ETH (最少 0.1 ETH) *
              </label>
              <TextInput
                type="text"
                value={formData.initialLiquidityETH}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({
                    ...formData,
                    initialLiquidityETH: e.target.value,
                  })
                }
                placeholder="例如: 0.5"
                fullWidth
                required
                disabled={isLoading}
                style={{ fontSize: isMobile ? "14px" : "16px" }}
              />
              <small
                style={{
                  display: "block",
                  marginTop: "0.25rem",
                  color: "#666",
                }}
              >
                需要锁定的ETH数量，用于创建初始流动性
              </small>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  marginBottom: "0.5rem",
                  display: "block",
                  fontSize: isMobile ? "14px" : "16px",
                }}
              >
                代币供应量 (最少 1000) *
              </label>
              <TextInput
                type="text"
                value={formData.tokenAmountForLiquidity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({
                    ...formData,
                    tokenAmountForLiquidity: e.target.value,
                  })
                }
                placeholder="例如: 1000000"
                fullWidth
                required
                disabled={isLoading}
                style={{ fontSize: isMobile ? "14px" : "16px" }}
              />
              <small
                style={{
                  display: "block",
                  marginTop: "0.25rem",
                  color: "#666",
                }}
              >
                代币总供应量，创建后不可更改
              </small>
            </div>
          </Fieldset>

          <Fieldset label="代币 Logo" style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                marginBottom: "0.5rem",
                fontSize: isMobile ? "14px" : "16px",
              }}
            >
              上传代币 Logo (推荐尺寸: 200x200px, PNG 格式) *
            </div>
            <ImageUploader onUploadSuccess={handleLogoUpload} />
            {formData.logoIpfsHash && (
              <div
                style={{
                  marginTop: "1rem",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ wordBreak: "break-all", fontSize: "12px" }}>
                    IPFS Hash: {formData.logoIpfsHash}
                  </div>
                  <div
                    style={{
                      color: "#4caf50",
                      fontSize: "14px",
                      marginTop: "0.25rem",
                    }}
                  >
                    ✓ Logo 上传成功
                  </div>
                </div>
              </div>
            )}
          </Fieldset>

          <Button
            type="submit"
            disabled={isLoading || contractLoading}
            style={{
              width: "100%",
              fontSize: isMobile ? "14px" : "16px",
              marginBottom: "1rem",
              padding: "0.75rem",
            }}
          >
            {isLoading ? "处理中..." : "铸造代币"}
          </Button>
        </form>

        {/* 错误提示窗口 */}
        <ErrorWindow />
      </WindowContent>
    </Window>
  );
};
