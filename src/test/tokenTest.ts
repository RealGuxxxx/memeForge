const { ethers } = require('ethers');
const CONFIG = require('./config');
const swapAbi = require('../abi/swap.json');

// ERC20 ABI
const TOKEN_ABI = [
  // 基本信息查询
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  // 交易相关
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

async function main() {
  try {
    console.log('开始测试代币合约...');
    console.log('代币地址:', CONFIG.TOKEN_ADDRESS);
    console.log('Swap合约地址:', CONFIG.SWAP_ADDRESS);
    
    // 连接到以太坊网络
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const tokenContract = new ethers.Contract(CONFIG.TOKEN_ADDRESS, TOKEN_ABI, provider);
    const swapContract = new ethers.Contract(CONFIG.SWAP_ADDRESS, swapAbi, provider);

    console.log('\n1. 基本信息查询:');
    try {
      const name = await tokenContract.name();
      const symbol = await tokenContract.symbol();
      const decimals = await tokenContract.decimals();
      const totalSupply = await tokenContract.totalSupply();
      
      console.log(`代币名称: ${name}`);
      console.log(`代币符号: ${symbol}`);
      console.log(`小数位数: ${decimals}`);
      console.log(`总供应量: ${ethers.formatUnits(totalSupply, decimals)}`);
    } catch (error: unknown) {
      const err = error as Error;
      console.log('基本信息查询失败:', err?.message || '未知错误');
    }

    console.log('\n2. 交易对检查:');
    try {
      const wethAddress = await swapContract.WETH();
      const pair = await swapContract.checkPairExists(wethAddress, CONFIG.TOKEN_ADDRESS);
      console.log('WETH 地址:', wethAddress);
      console.log('交易对地址:', pair);
      
      if (pair === ethers.ZeroAddress) {
        console.log('警告: 交易对不存在，需要先添加流动性');
        return;
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.log('交易对检查失败:', err?.message || '未知错误');
      return;
    }

    console.log('\n3. 代币支持检查:');
    try {
      const isSupported = await swapContract.supportedTokens(CONFIG.TOKEN_ADDRESS);
      console.log(`代币是否被支持: ${isSupported}`);
      
      if (!isSupported) {
        console.log('警告: 代币未被支持，需要先添加到支持列表');
        return;
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.log('支持检查失败:', err?.message || '未知错误');
      return;
    }

    console.log('\n4. 价格查询测试:');
    try {
      // 使用 1 ETH 测试价格
      const testAmount = '1';
      const amountIn = ethers.parseEther(testAmount);
      
      // 获取 Router 地址
      const routerAddress = await swapContract.router();
      console.log('Router 地址:', routerAddress);
      
      // 创建 Router 合约实例
      const routerAbi = [
        'function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)'
      ];
      const routerContract = new ethers.Contract(routerAddress, routerAbi, provider);
      
      // 查询价格
      const path = [await swapContract.WETH(), CONFIG.TOKEN_ADDRESS];
      const amounts = await routerContract.getAmountsOut(amountIn, path);
      
      const decimals = await tokenContract.decimals();
      const outAmount = ethers.formatUnits(amounts[1], decimals);
      const price = Number(testAmount) / Number(outAmount);
      
      console.log(`测试金额: ${testAmount} ETH`);
      console.log(`获得代币: ${outAmount} ${await tokenContract.symbol()}`);
      console.log(`代币价格: ${price.toFixed(8)} ETH/${await tokenContract.symbol()}`);
    } catch (error: unknown) {
      const err = error as Error;
      console.log('价格查询失败:', err?.message || '未知错误');
    }

    // 如果配置了测试账户，查询余额
    if (CONFIG.TEST_ACCOUNT.address) {
      console.log('\n5. 账户余额查询:');
      try {
        const balance = await tokenContract.balanceOf(CONFIG.TEST_ACCOUNT.address);
        const decimals = await tokenContract.decimals();
        console.log(`账户余额: ${ethers.formatUnits(balance, decimals)}`);
      } catch (error: unknown) {
        const err = error as Error;
        console.log('余额查询失败:', err?.message || '未知错误');
      }
    }

  } catch (error: unknown) {
    const err = error as Error;
    console.error('测试过程中发生错误:', err?.message || '未知错误');
  }
}

// 运行测试
main().catch((error: unknown) => {
  const err = error as Error;
  console.error('测试脚本执行失败:', err?.message || '未知错误');
  process.exit(1);
}); 