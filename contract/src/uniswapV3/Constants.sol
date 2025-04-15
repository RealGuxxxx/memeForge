// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Sepolia 测试网地址
address constant SEPOLIA_WETH = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9;
address constant SEPOLIA_FACTORY = 0x0227628f3F023bb0B980b67D528571c95c6DaC1c;
address constant SEPOLIA_POSITION_MANAGER = 0x1238536071E1c677A632429e3655c799b22cDA52;
address constant SEPOLIA_SWAP_ROUTER = 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E;

// BaseSepolia 地址 
address constant BASE_SEPOLIA_WETH = 0x4200000000000000000000000000000000000006;
address constant BASE_SEPOLIA_FACTORY = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;
address constant BASE_SEPOLIA_POSITION_MANAGER = 0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2;
address constant BASE_SEPOLIA_SWAP_ROUTER = 0x492E6456D9528771018DeB9E87ef7750EF184104;

// Uniswap 相关
uint24 constant POOL_FEE = 3000;
uint160 constant SQRT_PRICE_X96 = 79228162514264337593543950336;

// 价格范围
int24 constant MIN_TICK = -887220;
int24 constant MAX_TICK = 887220;

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
int24 constant DEFAULT_TICK_LOWER = -276324; // 约为当前价格的1/100
int24 constant DEFAULT_TICK_UPPER = 276324; // 约为当前价格的100倍

contract Constants {}
