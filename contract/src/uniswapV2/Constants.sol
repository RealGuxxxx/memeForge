// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Sepolia 测试网地址
address constant SEPOLIA_WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;
address constant SEPOLIA_FACTORY = 0xF62c03E08ada871A0bEb309762E260a7a6a880E6; // UniswapV2 Factory
address constant SEPOLIA_ROUTER = 0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3; // UniswapV2 Router

// BaseSepolia 地址
address constant BASE_SEPOLIA_WETH = 0x4200000000000000000000000000000000000006;
address constant BASE_SEPOLIA_FACTORY = 0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6; // UniswapV2 Factory
address constant BASE_SEPOLIA_ROUTER = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24; // UniswapV2 Router

// Holesky 地址
address constant HOLESKY_WETH = 0xd12794c943173ACE0af83473d56D89F98fBc0Bf2;
address constant HOLESKY_FACTORY = 0x5d58d6fe59741234877303BE572C06d0e4aaAC8d; // UniswapV2 Factory
address constant HOLESKY_ROUTER = 0xEC03893384b2118EB7EfDfC6891A9aC33024faF4; // UniswapV2 Router

// 新部署合约地址
address constant FEE_COLLECTOR = 0xfF9328e7fE9Ff148D147eA60C3D1BC499FB50a42;
address constant TOKEN_FACTORY = 0xd251F26a9e2522510639720b44ba0dA54aEB2f31;
address constant SWAP = 0x04F6a55EDB478aB095206FAc73C7C858232eCcB8;
// address constant FEE_COLLECTOR = 0x0C65e138984Df4c720DfB0478BB510d729141b1F;
// address constant TOKEN_FACTORY = 0x9591a39DCcc451C7f56a65E0358a1d514854eDb2;
// address constant SWAP = 0x38E138dD99c52453F1974fA9738f7BfA9841f9e7;

// 滑点保护
uint256 constant SLIPPAGE_DENOMINATOR = 10000;
uint256 constant MAX_SLIPPAGE = 50; // 0.5%

// 时间相关
uint256 constant MAX_DEADLINE = 30 minutes;

// 交易限制
uint256 constant MIN_AMOUNT = 1e15; // 0.001 ETH
uint256 constant MAX_AMOUNT = 1e23; // 10000 ETH

// 流动性相关
uint256 constant MIN_LIQUIDITY_ETH = 1e17; // 最小流动性 0.1 ETH

address constant OWNER = 0xD4eeC1504b6DA9E41D63509fe0F4c3FaabE4c165;

contract Constants {}
