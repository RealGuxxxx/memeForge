import { ethers } from 'ethers';
import { WETH_ADDRESS, TOKEN_ADDRESS, RPC_URL } from './config';

// UniswapV2 Pair ABI
const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)'
];

// ERC20 ABI
const ERC20_ABI = [
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)'
];

// 已知的交易对地址
const PAIR_ADDRESS = '0xf48d11cc98FDd2210e4e3B572a1d12B48b0bAC7A';

async function main() {
  try {
    console.log('开始测试价格获取...');
    console.log('代币地址:', TOKEN_ADDRESS);
    console.log('WETH 地址:', WETH_ADDRESS);
    console.log('交易对地址:', PAIR_ADDRESS);

    // 创建 provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // 获取代币信息
    console.log('\n1. 查询代币基本信息...');
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider);
    const [name, symbol, decimals] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals()
    ]);
    console.log('代币名称:', name);
    console.log('代币符号:', symbol);
    console.log('小数位数:', decimals);

    // 获取价格（通过交易对储备）
    console.log('\n2. 通过交易对储备获取价格...');
    const pairContract = new ethers.Contract(PAIR_ADDRESS, PAIR_ABI, provider);
    const [reserve0, reserve1] = await pairContract.getReserves();
    const token0 = await pairContract.token0();
    
    const [ethReserve, tokenReserve] = token0.toLowerCase() === WETH_ADDRESS.toLowerCase()
      ? [reserve0, reserve1]
      : [reserve1, reserve0];

    const priceFromReserves = parseFloat(ethers.formatEther(ethReserve)) / parseFloat(ethers.formatUnits(tokenReserve, decimals));
    console.log('ETH 储备:', ethers.formatEther(ethReserve));
    console.log('代币储备:', ethers.formatUnits(tokenReserve, decimals));
    console.log('代币价格:', priceFromReserves, 'ETH');

  } catch (error) {
    console.error('测试失败:', error);
  }
}

main(); 