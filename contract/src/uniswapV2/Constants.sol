// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Sepolia 测试网地址
address constant SEPOLIA_WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;
address constant SEPOLIA_FACTORY = 0xF62c03E08ada871A0bEb309762E260a7a6a880E6; // UniswapV2 Factory
address constant SEPOLIA_ROUTER = 0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3; // UniswapV2 Router

// 新部署合约地址
address constant FEE_COLLECTOR = 0xfF9328e7fE9Ff148D147eA60C3D1BC499FB50a42;
address constant TOKEN_FACTORY = 0xd251F26a9e2522510639720b44ba0dA54aEB2f31;
address constant SWAP = 0x04F6a55EDB478aB095206FAc73C7C858232eCcB8;

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
