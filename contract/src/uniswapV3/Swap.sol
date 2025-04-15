// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import {IWETH} from "../uniswapV2/interfaces/IWETH.sol";

contract Swap is Ownable, ReentrancyGuard {
    ISwapRouter public immutable swapRouter;
    address public immutable WETH;
    address public immutable factory;
    uint24 public constant DEFAULT_POOL_FEE = 3000; // 0.3%
    uint256 public constant SLIPPAGE_DENOMINATOR = 10000;

    mapping(address => bool) public supportedTokens;

    event TokenSwapped(
        address indexed tokenIn,
        address indexed tokenOut,
        address indexed user,
        uint256 amountIn,
        uint256 amountOut
    );

    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);

    constructor(
        address _swapRouter,
        address _WETH,
        address _factory,
        address initialOwner
    ) Ownable(initialOwner) {
        swapRouter = ISwapRouter(_swapRouter);
        WETH = _WETH;
        factory = _factory;
    }

    // 移除流动性检查，依赖 Uniswap 的滑点控制
    function checkPoolExists(address tokenA, address tokenB) public view returns (address pool) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        pool = IUniswapV3Factory(factory).getPool(token0, token1, DEFAULT_POOL_FEE);
        require(pool != address(0), "Pool does not exist");
    }

    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        supportedTokens[token] = true;
        emit TokenAdded(token);
    }

    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
        emit TokenRemoved(token);
    }

    function swapExactETHForTokens(
        address tokenOut,
        uint256 amountOutMinimum,
        uint256 deadline
    ) external payable nonReentrant returns (uint256 amountOut) {
        require(supportedTokens[tokenOut], "Unsupported token");
        require(msg.value > 0, "Invalid amount");
        require(block.timestamp <= deadline, "Transaction too old");

        IWETH(WETH).deposit{value: msg.value}();

        TransferHelper.safeApprove(WETH, address(swapRouter), msg.value);

        checkPoolExists(WETH, tokenOut);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: WETH,
            tokenOut: tokenOut,
            fee: DEFAULT_POOL_FEE,
            recipient: msg.sender,
            deadline: deadline,
            amountIn: msg.value,
            amountOutMinimum: _adjustForDecimals(amountOutMinimum, tokenOut), // 处理精度
            sqrtPriceLimitX96: 0
        });

        amountOut = swapRouter.exactInputSingle(params);
        emit TokenSwapped(address(0), tokenOut, msg.sender, msg.value, amountOut); 
        return amountOut;
    }

    function swapExactTokensForETH(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        require(supportedTokens[tokenIn], "Unsupported token");
        require(amountIn > 0, "Invalid amount");
        require(block.timestamp <= deadline, "Transaction too old");

        // 检查池子是否存在
        checkPoolExists(tokenIn, WETH);

        TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: WETH,
            fee: DEFAULT_POOL_FEE,
            recipient: msg.sender,
            deadline: deadline,
            amountIn: amountIn,
            amountOutMinimum: _adjustForDecimals(amountOutMinimum, WETH), // 处理精度
            sqrtPriceLimitX96: 0
        });

        amountOut = swapRouter.exactInputSingle(params);
        emit TokenSwapped(tokenIn, address(0), msg.sender, amountIn, amountOut); // ETH 标记为 address(0)
        return amountOut;
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).transfer(owner(), amount);
        }
    }

    // 处理代币精度差异
    function _adjustForDecimals(uint256 amount, address token) private view returns (uint256) {
        uint8 decimals = IERC20Metadata(token).decimals();
        return amount * 10 ** (18 - decimals);
    }

    receive() external payable {}
}