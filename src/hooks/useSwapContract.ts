import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import swapAbi from "../abi/swap.json";

// 添加这行来获取RPC URL
const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

declare global {
  interface Window {
    ethereum?: any;
  }
}

const SWAP_CONTRACT_ADDRESS = "0x04F6a55EDB478aB095206FAc73C7C858232eCcB8";
const WETH_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
const FACTORY_ADDRESS = "0xd251F26a9e2522510639720b44ba0dA54aEB2f31";

// TokenFactory ABI
const FACTORY_ABI = [
  "function getPair(address tokenAddress) external view returns (address)",
];

// Pair ABI
const PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
];

// ERC20 ABI
const ERC20_ABI = [
  "function decimals() external view returns (uint8)",
  "function approve(address spender, uint256 amount) external returns (bool)",
];

// 添加处理大数值的辅助函数，避免科学计数法
const formatNumberNoExponent = (num: string | number): string => {
  if (typeof num === "number") {
    num = num.toString();
  }

  // 检查是否包含科学计数法表示法
  if (num.includes("e") || num.includes("E")) {
    const match = num.match(/^([+-]?)(\d+)\.?(\d*)[eE]([-+]?)(\d+)$/);
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

  return num;
};

export const useSwapContract = () => {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取当前价格
  const getTokenPrice = useCallback(
    async (tokenAddress: string | undefined) => {
      try {
        if (!tokenAddress || typeof tokenAddress !== "string") {
          throw new Error("无效的代币地址");
        }

        // 修改这里：优先使用自定义 RPC，如果未配置则回退到 MetaMask
        const provider = RPC_URL
          ? new ethers.JsonRpcProvider(RPC_URL)
          : new ethers.BrowserProvider(window.ethereum);

        // 1. 获取代币精度
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ERC20_ABI,
          provider
        );
        const decimals = await tokenContract.decimals();

        // 2. 从 TokenFactory 获取交易对地址
        const factoryContract = new ethers.Contract(
          FACTORY_ADDRESS,
          FACTORY_ABI,
          provider
        );
        const pairAddress = await factoryContract.getPair(tokenAddress);

        if (pairAddress === "0x0000000000000000000000000000000000000000") {
          throw new Error("交易对不存在");
        }

        // 3. 获取交易对储备
        const pairContract = new ethers.Contract(
          pairAddress,
          PAIR_ABI,
          provider
        );
        const [reserve0, reserve1] = await pairContract.getReserves();
        const token0 = await pairContract.token0();

        // 4. 确保正确的储备顺序
        const [ethReserve, tokenReserve] =
          token0.toLowerCase() === WETH_ADDRESS.toLowerCase()
            ? [reserve0, reserve1]
            : [reserve1, reserve0];

        // 5. 计算价格
        const price =
          parseFloat(ethers.formatEther(ethReserve)) /
          parseFloat(ethers.formatUnits(tokenReserve, decimals));

        return price.toString();
      } catch (err: any) {
        console.error("获取价格失败:", err);
        throw new Error(err.message || "获取价格失败");
      }
    },
    []
  );

  // 使用 ETH 购买代币
  const swapETHForTokens = useCallback(
    async (tokenOut: string, amountOutMinimum: string, value: string) => {
      try {
        if (!tokenOut || typeof tokenOut !== "string") {
          throw new Error("无效的代币地址");
        }

        console.log("交易原始参数:", {
          tokenOut,
          amountOutMinimum,
          value,
        });

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(
          SWAP_CONTRACT_ADDRESS,
          swapAbi,
          signer
        );

        // 设置交易参数
        const deadline = Math.floor(Date.now() / 1000) + 20 * 60;
        const valueInWei = ethers.parseEther(value);

        // 获取代币精度并处理最小输出金额
        const tokenContract = new ethers.Contract(
          tokenOut,
          ERC20_ABI,
          provider
        );
        const decimals = await tokenContract.decimals();

        // 处理大数值，确保不使用科学计数法
        const formattedAmountOutMinimum =
          formatNumberNoExponent(amountOutMinimum);
        console.log("格式化后的最小输出数量:", formattedAmountOutMinimum);

        // 判断是否是超大数量，如果是则设置最大安全整数
        let minOutBigInt;
        try {
          minOutBigInt = ethers.parseUnits(formattedAmountOutMinimum, decimals);
        } catch (parseError) {
          console.warn("解析代币数量失败，将使用最大安全值:", parseError);
          // 如果解析失败，使用一个足够大但安全的值（2^53 - 1）
          minOutBigInt = ethers.parseUnits("9007199254740991", 0); // JS安全最大整数
        }

        console.log("交易参数:", {
          tokenOut,
          minOutBigInt: minOutBigInt.toString(),
          deadline,
          value: valueInWei.toString(),
          decimals,
        });

        // 添加安全检查，如果是非常大的值，确认用户是否确实想要进行这样的交易
        if (formattedAmountOutMinimum.length > 15) {
          console.warn("将购买非常大数量的代币，请确认价格是否合理");
        }

        // 执行交易，确保参数顺序和类型正确
        const tx = await contract.swapExactETHForTokens(
          tokenOut, // address tokenOut
          minOutBigInt, // uint256 amountOutMinimum
          deadline, // uint256 deadline
          {
            value: valueInWei,
            gasLimit: 300000, // 添加 gas 限制
          }
        );

        console.log("交易已发送:", tx.hash);
        const receipt = await tx.wait();
        console.log("交易已确认:", receipt);

        return {
          success: true,
          transactionHash: receipt.hash,
        };
      } catch (err: any) {
        console.error("ETH 兑换代币失败:", err);
        // 打印更详细的错误信息
        console.log("错误详情:", {
          message: err.message,
          code: err.code,
          data: err.data,
          transaction: err.transaction,
        });

        // 提供更具体的错误信息给用户
        if (err.message.includes("invalid FixedNumber string value")) {
          throw new Error(
            "代币数量格式无效，可能是因为价格太低导致数量过大。请尝试使用较小的ETH数量。"
          );
        } else if (err.message.includes("insufficient funds")) {
          throw new Error("ETH余额不足以支付交易费用");
        } else if (err.message.includes("user rejected")) {
          throw new Error("用户取消了交易");
        }

        throw err;
      }
    },
    []
  );

  // 使用代币换回 ETH
  const swapTokensForETH = useCallback(
    async (tokenIn: string, amountIn: string, amountOutMinimum: string) => {
      try {
        if (!tokenIn) {
          throw new Error("代币地址不能为空");
        }

        const formattedTokenIn = ethers.getAddress(tokenIn);

        setLoading(true);
        setError(null);

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(
          SWAP_CONTRACT_ADDRESS,
          swapAbi,
          signer
        );

        // 获取代币精度
        const tokenContract = new ethers.Contract(
          formattedTokenIn,
          ERC20_ABI,
          signer
        );
        const decimals = await tokenContract.decimals();

        // 设置交易参数
        // 处理可能的科学计数法
        const formattedAmountIn = formatNumberNoExponent(amountIn);
        console.log("格式化后的输入数量:", formattedAmountIn);

        try {
          // 使用格式化后的数值解析
          const amountInWei = ethers.parseUnits(formattedAmountIn, decimals);

          // 调整最小输出金额的计算，使用更大的滑点容忍度
          const minOutInWeiBigInt = ethers.parseEther(amountOutMinimum);
          const adjustedMinOut =
            (BigInt(minOutInWeiBigInt) * BigInt(90)) / BigInt(100); // 允许 10% 的滑点

          const deadline = Math.floor(Date.now() / 1000) + 20 * 60;

          console.log("交易参数:", {
            tokenIn: formattedTokenIn,
            amountInWei: amountInWei.toString(),
            adjustedMinOut: adjustedMinOut.toString(),
            deadline,
          });

          // 授权合约使用代币
          const approveTx = await tokenContract.approve(
            SWAP_CONTRACT_ADDRESS,
            amountInWei
          );
          await approveTx.wait();

          // 执行交易
          const tx = await contract.swapExactTokensForETH(
            formattedTokenIn,
            amountInWei,
            adjustedMinOut,
            deadline,
            {
              gasLimit: 500000, // 增加 gas 限制
            }
          );

          const receipt = await tx.wait();
          const swapEvent = receipt.logs.find(
            (log: any) => log.fragment?.name === "TokenSwapped"
          );

          if (!swapEvent) {
            throw new Error("交易失败：未找到交易事件");
          }

          return {
            success: true,
            transactionHash: receipt.hash,
            amountOut: ethers.formatEther(swapEvent.args.amountOut),
          };
        } catch (parseError: any) {
          console.error("解析代币数量失败:", parseError);
          if (parseError.message.includes("invalid FixedNumber string value")) {
            throw new Error(`代币数量格式无效 (${amountIn})，请使用较小的数量`);
          }
          throw parseError;
        }
      } catch (err: any) {
        console.error("代币兑换 ETH 失败:", err);
        setError(err.message || "代币兑换 ETH 失败");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    getTokenPrice,
    swapETHForTokens,
    swapTokensForETH,
    loading,
    error,
  };
};
