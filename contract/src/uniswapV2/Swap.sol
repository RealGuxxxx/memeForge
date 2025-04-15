// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20Metadata, IERC20} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IUniswapV2Factory} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import {IUniswapV2Pair} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import {IUniswapV2Router02} from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IWETH} from "./interfaces/IWETH.sol";
import {TransferHelper} from "./libraries/TransferHelper.sol";

contract Swap is Ownable, ReentrancyGuard {
    IUniswapV2Router02 public immutable router;
    address public immutable WETH;
    address public immutable factory;

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
        address _router,
        address _WETH,
        address _factory,
        address initialOwner
    ) Ownable(initialOwner) {
        router = IUniswapV2Router02(_router);
        WETH = _WETH;
        factory = _factory;
    }

    function checkPairExists(
        address tokenA,
        address tokenB
    ) public view returns (address pair) {
        pair = IUniswapV2Factory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), "Pair does not exist");
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

        // 检查交易对是否存在
        checkPairExists(WETH, tokenOut);

        address[] memory path = new address[](2);
        path[0] = WETH;
        path[1] = tokenOut;

        uint256[] memory amounts = router.swapExactETHForTokens{
            value: msg.value
        }(
            _adjustForDecimals(amountOutMinimum, tokenOut),
            path,
            msg.sender,
            deadline
        );

        amountOut = amounts[1];
        emit TokenSwapped(
            address(0),
            tokenOut,
            msg.sender,
            msg.value,
            amountOut
        );
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

        // 检查交易对是否存在
        checkPairExists(tokenIn, WETH);

        TransferHelper.safeTransferFrom(
            tokenIn,
            msg.sender,
            address(this),
            amountIn
        );
        TransferHelper.safeApprove(tokenIn, address(router), amountIn);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = WETH;

        uint256[] memory amounts = router.swapExactTokensForETH(
            amountIn,
            _adjustForDecimals(amountOutMinimum, WETH),
            path,
            msg.sender,
            deadline
        );

        amountOut = amounts[1];
        emit TokenSwapped(tokenIn, address(0), msg.sender, amountIn, amountOut);
        return amountOut;
    }

    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).transfer(owner(), amount);
        }
    }

    // 处理代币精度差异
    function _adjustForDecimals(
        uint256 amount,
        address token
    ) private view returns (uint256) {
        uint8 decimals = IERC20Metadata(token).decimals();
        return amount * 10 ** (18 - decimals);
    }

    receive() external payable {}
}
