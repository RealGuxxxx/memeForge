import tokenFactoryAbi from "../abi/tokenFactory.json";

export const CONTRACT_ADDRESSES = {
  // 这里需要替换为实际部署的合约地址
  TOKEN_FACTORY: "0xd251F26a9e2522510639720b44ba0dA54aEB2f31",
} as const;

// 添加 ERC20 ABI
const ERC20_ABI = [
  "function decimals() external view returns (uint8)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

export const CONTRACT_ABIS = {
  TOKEN_FACTORY: tokenFactoryAbi,
  ERC20: ERC20_ABI,
} as const;

export const SUPPORTED_CHAIN_IDS = [11155111]; // sepolia 测试网
