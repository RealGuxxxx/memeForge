// 代币铸造表单功能测试脚本
import { ethers } from "ethers";
import { RPC_URL, TOKEN_ADDRESS, SWAP_ADDRESS, TEST_ACCOUNT } from "./config";
const swapABI = require("../abi/swap.json");
const tokenSupportProxyABI = require("../abi/addTokenproxy.json");

// TokenFactory ABI (简化版，仅用于测试)
const TOKEN_FACTORY_ABI = [
  "function createToken(string memory name, string memory symbol, uint8 decimals, uint256 initialSupply, uint256 initialLiquidityETH, uint256 tokenAmountForLiquidity, string memory logoIpfsHash, uint256 deadline) payable returns (address tokenAddress, address pairAddress)",
];

// Swap ABI (简化版)
const SWAP_ABI = [
  "function addSupportedToken(address token)",
  "function supportedTokens(address token) view returns (bool)",
  "function owner() view returns (address)",
];

// TokenSupportProxy ABI (简化版)
const TOKEN_SUPPORT_PROXY_ABI = [
  "function addSupportedToken(address token)",
  "function isTokenAdded(address token) view returns (bool)",
  "function owner() view returns (address)",
];

// 合约地址 - 根据实际情况修改
const TOKEN_FACTORY_ADDRESS = "0xCdB80De32aBB00BccbD40e3c1749190854E8FD7A"; // 修改为实际的合约地址
const TOKEN_SUPPORT_PROXY_ADDRESS =
  "0x8DC5F7FfB166C5b59E52A249c3Af6Da7c46F75ec"; // 修改为实际的合约地址

// 配置参数
const REQUIRED_CONFIRMATIONS = 5; // 增加至5个区块确认
const CONFIRMATION_TIMEOUT = 300000; // 等待区块确认的超时时间(毫秒)：5分钟
const POLL_INTERVAL = 5000; // 区块检查间隔(毫秒)：5秒

// 添加类型定义
type AddressString = string;

// 辅助函数：检查是否为零地址
function isZeroAddress(address: AddressString | undefined): boolean {
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  return !address || address.toLowerCase() === ZERO_ADDRESS.toLowerCase();
}

// 辅助函数：等待指定数量的区块确认
async function waitForConfirmations(
  provider: ethers.JsonRpcProvider,
  txHash: string,
  confirmations: number = REQUIRED_CONFIRMATIONS,
  timeout: number = CONFIRMATION_TIMEOUT
): Promise<ethers.TransactionReceipt> {
  console.log(`等待交易 ${txHash} 确认(需要 ${confirmations} 个区块)...`);

  const startTime = Date.now();
  let receipt: ethers.TransactionReceipt | null = null;

  // 首先获取交易收据
  while (!receipt && Date.now() - startTime < timeout) {
    try {
      receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt) {
        console.log("等待交易收据...");
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      }
    } catch (error) {
      console.error("获取交易收据出错:", (error as Error).message);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
  }

  if (!receipt) {
    throw new Error(`超时: 在 ${timeout / 1000} 秒内未能获取交易收据`);
  }

  // 获取当前区块
  const initialBlock = await provider.getBlockNumber();
  console.log(
    `交易已包含在区块 ${receipt.blockNumber}，当前区块 ${initialBlock}`
  );

  // 计算已确认的区块数
  let confirmationBlocks = initialBlock - receipt.blockNumber + 1;

  // 如果已经有足够的确认，立即返回
  if (confirmationBlocks >= confirmations) {
    console.log(`交易已有 ${confirmationBlocks} 个区块确认，满足要求`);
    return receipt;
  }

  // 否则，等待更多区块确认
  console.log(`当前确认数: ${confirmationBlocks}/${confirmations}`);

  return new Promise((resolve, reject) => {
    let intervalId: NodeJS.Timeout | undefined;
    const timeoutId = setTimeout(() => {
      if (intervalId) clearInterval(intervalId);
      reject(
        new Error(
          `超时: 在 ${timeout / 1000} 秒内未能获取 ${confirmations} 个区块确认`
        )
      );
    }, timeout);

    intervalId = setInterval(async () => {
      try {
        const currentBlock = await provider.getBlockNumber();
        confirmationBlocks = currentBlock - receipt!.blockNumber + 1;
        console.log(
          `当前区块: ${currentBlock}, 确认数: ${confirmationBlocks}/${confirmations}`
        );

        if (confirmationBlocks >= confirmations) {
          clearTimeout(timeoutId);
          clearInterval(intervalId);
          console.log(`交易已确认，共 ${confirmationBlocks} 个区块`);
          resolve(receipt!);
        }
      } catch (error) {
        console.error("检查区块确认出错:", (error as Error).message);
      }
    }, POLL_INTERVAL);
  });
}

// 测试创建代币和将代币添加到支持列表的完整流程
async function main() {
  try {
    console.log("======== 开始测试代币铸造和添加支持功能 ========");
    console.log("配置的区块确认数:", REQUIRED_CONFIRMATIONS);
    console.log("确认超时时间:", CONFIRMATION_TIMEOUT / 1000, "秒");

    // 连接到以太坊网络
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    console.log("已连接到网络:", await provider.getNetwork());

    // 检查是否有测试账户
    if (!TEST_ACCOUNT.address || !TEST_ACCOUNT.privateKey) {
      console.log("注意: 未配置测试账户信息，将只执行只读测试");

      // 只执行只读操作测试
      await readOnlyTests(provider);
      return;
    }

    // 创建钱包实例
    const wallet = new ethers.Wallet(TEST_ACCOUNT.privateKey, provider);
    console.log("钱包地址:", wallet.address);

    // 查询ETH余额
    const ethBalance = await provider.getBalance(wallet.address);
    console.log("ETH余额:", ethers.formatEther(ethBalance), "ETH");

    if (ethBalance < ethers.parseEther("0.2")) {
      console.error("错误: ETH余额不足，请确保有足够的ETH（建议至少0.2 ETH）");

      // 仍然执行只读测试
      await readOnlyTests(provider);
      return;
    }

    // 执行完整测试
    await fullTests(provider, wallet);
  } catch (error) {
    console.error("测试过程中发生错误:", (error as Error).message);
  }
}

// 只读测试函数
async function readOnlyTests(provider: ethers.JsonRpcProvider) {
  console.log("\n开始执行只读测试...");

  // 1. 检查现有的代币
  if (TOKEN_ADDRESS) {
    console.log("\n1. 检查现有代币...");
    console.log("代币地址:", TOKEN_ADDRESS);

    try {
      // ERC20 基本ABI
      const erc20Abi = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)",
      ];

      const tokenContract = new ethers.Contract(
        TOKEN_ADDRESS,
        erc20Abi,
        provider
      );

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.totalSupply(),
      ]);

      console.log("代币名称:", name);
      console.log("代币符号:", symbol);
      console.log("小数位数:", decimals);
      console.log("总供应量:", ethers.formatUnits(totalSupply, decimals));
    } catch (error) {
      console.error("获取代币信息失败:", (error as Error).message);
    }
  } else {
    console.log("未配置代币地址，跳过代币检查");
  }

  // 2. 检查Swap合约
  console.log("\n2. 检查Swap合约...");
  console.log("Swap地址:", SWAP_ADDRESS);

  try {
    const swapContract = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, provider);

    const owner = await swapContract.owner();
    console.log("Swap合约所有者:", owner);

    if (TOKEN_ADDRESS) {
      const isSupported = await swapContract.supportedTokens(TOKEN_ADDRESS);
      console.log("代币是否已被支持:", isSupported);
    }
  } catch (error) {
    console.error("检查Swap合约失败:", (error as Error).message);
  }

  // 3. 检查TokenSupportProxy合约
  console.log("\n3. 检查TokenSupportProxy合约...");
  console.log("TokenSupportProxy地址:", TOKEN_SUPPORT_PROXY_ADDRESS);

  try {
    const tokenSupportProxy = new ethers.Contract(
      TOKEN_SUPPORT_PROXY_ADDRESS,
      TOKEN_SUPPORT_PROXY_ABI,
      provider
    );

    const proxyOwner = await tokenSupportProxy.owner();
    console.log("代理合约所有者:", proxyOwner);

    if (TOKEN_ADDRESS) {
      const isTokenAdded = await tokenSupportProxy.isTokenAdded(TOKEN_ADDRESS);
      console.log("代币是否已通过代理添加:", isTokenAdded);
    }
  } catch (error) {
    console.error("检查TokenSupportProxy合约失败:", (error as Error).message);
  }
}

// 完整测试函数（包括交易）
async function fullTests(
  provider: ethers.JsonRpcProvider,
  wallet: ethers.Wallet
) {
  console.log("\n开始执行完整测试（包括交易）...");

  // 1. 创建TokenFactory合约实例
  console.log("\n1. 连接到TokenFactory合约...");
  const tokenFactory = new ethers.Contract(
    TOKEN_FACTORY_ADDRESS,
    TOKEN_FACTORY_ABI,
    wallet
  );
  console.log("TokenFactory地址:", TOKEN_FACTORY_ADDRESS);

  // 2. 模拟铸造表单参数
  console.log("\n2. 准备代币铸造参数...");
  const tokenParams = {
    name: "Test Token " + Date.now().toString().slice(-6),
    symbol: "TEST",
    decimals: 18,
    initialSupply: "1000000", // 100万代币
    initialLiquidityETH: "0.1", // 0.1 ETH
    tokenAmountForLiquidity: "1000000", // 100万代币用于流动性
    logoIpfsHash: "QmYG5pTmFvnG9GKCz9mSmXKF9upKhPkFMeBgCxJnWhmQiD", // 示例IPFS哈希
    deadline: Math.floor(Date.now() / 1000) + 3600, // 一小时后过期
  };

  console.log("代币名称:", tokenParams.name);
  console.log("代币符号:", tokenParams.symbol);
  console.log("初始ETH:", tokenParams.initialLiquidityETH, "ETH");
  console.log("代币数量:", tokenParams.tokenAmountForLiquidity);

  // 3. 创建代币 - 默认只模拟，不实际执行
  console.log("\n3. 模拟创建代币...");
  console.log("注意: 此步骤默认仅模拟，不会实际执行交易");

  const EXECUTE_CREATION = false; // 改为true以执行实际创建

  let newTokenAddress = "0x0000000000000000000000000000000000000000";
  let pairAddress = "0x0000000000000000000000000000000000000000";

  if (EXECUTE_CREATION) {
    try {
      console.log("发送创建代币交易...");
      const tx = await tokenFactory.createToken(
        tokenParams.name,
        tokenParams.symbol,
        tokenParams.decimals,
        ethers.parseUnits(tokenParams.initialSupply, tokenParams.decimals),
        ethers.parseEther(tokenParams.initialLiquidityETH),
        ethers.parseUnits(
          tokenParams.tokenAmountForLiquidity,
          tokenParams.decimals
        ),
        tokenParams.logoIpfsHash,
        tokenParams.deadline,
        { value: ethers.parseEther(tokenParams.initialLiquidityETH) }
      );

      console.log("交易已发送，等待确认...");
      console.log("交易哈希:", tx.hash);

      // 使用我们的辅助函数等待区块确认
      const receipt = await waitForConfirmations(
        provider,
        tx.hash,
        REQUIRED_CONFIRMATIONS
      );
      console.log("交易已确认，区块号:", receipt.blockNumber);

      if (receipt && receipt.logs) {
        console.log("收到", receipt.logs.length, "个日志事件");
      }
    } catch (error) {
      console.error("创建代币失败:", (error as Error).message);
      return;
    }
  } else {
    console.log("跳过实际代币创建，继续测试...");
  }

  // 4. 检查代币是否已在Swap中被支持
  console.log("\n4. 检查代币在Swap中的支持状态...");
  // 如果没有实际创建代币，使用一个已知的代币地址进行测试
  const tokenToCheck: AddressString = TOKEN_ADDRESS || newTokenAddress;
  if (isZeroAddress(tokenToCheck)) {
    console.log("没有有效的代币地址可供测试，跳过此步骤");
  } else {
    console.log("检查代币地址:", tokenToCheck);

    const swapContract = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, provider);

    try {
      const isSupported = await swapContract.supportedTokens(tokenToCheck);
      console.log("代币是否已被支持:", isSupported);
    } catch (error) {
      console.error("检查支持状态失败:", (error as Error).message);
    }
  }

  // 5. 测试TokenSupportProxy合约
  console.log("\n5. 测试TokenSupportProxy合约...");
  if (isZeroAddress(tokenToCheck)) {
    console.log("没有有效的代币地址可供测试，跳过此步骤");
  } else {
    const tokenSupportProxy = new ethers.Contract(
      TOKEN_SUPPORT_PROXY_ADDRESS,
      TOKEN_SUPPORT_PROXY_ABI,
      wallet
    );

    try {
      // 检查代理合约所有者
      const proxyOwner = await tokenSupportProxy.owner();
      console.log("代理合约所有者:", proxyOwner);

      // 检查代币是否已经被添加
      const isTokenAdded = await tokenSupportProxy.isTokenAdded(tokenToCheck);
      console.log("代币是否已通过代理添加:", isTokenAdded);

      const EXECUTE_ADD_TOKEN = false; // 改为true以执行实际添加

      if (!isTokenAdded && EXECUTE_ADD_TOKEN) {
        console.log("添加代币到支持列表...");
        const addTx = await tokenSupportProxy.addSupportedToken(tokenToCheck);
        console.log("交易已发送，等待确认...");
        console.log("交易哈希:", addTx.hash);

        // 使用我们的辅助函数等待区块确认
        const addReceipt = await waitForConfirmations(
          provider,
          addTx.hash,
          REQUIRED_CONFIRMATIONS
        );
        console.log("交易已确认，区块号:", addReceipt.blockNumber);

        // 再次检查状态
        const isAddedNow = await tokenSupportProxy.isTokenAdded(tokenToCheck);
        console.log("代币现在是否已添加:", isAddedNow);
      } else if (!isTokenAdded) {
        console.log("代币尚未通过代理添加，但跳过实际添加操作");
      }
    } catch (error) {
      console.error("测试TokenSupportProxy失败:", (error as Error).message);
    }
  }
}

// 运行测试
main().catch((error) => {
  console.error("测试脚本执行失败:", (error as Error).message);
});
