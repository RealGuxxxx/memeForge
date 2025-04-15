// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Token} from "./Token.sol";
import "./Constants.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IFeeCollector} from "./interfaces/IFeeCollector.sol";
import {IUniswapV2Factory} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import {IUniswapV2Pair} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import {IUniswapV2Router02} from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TransferHelper} from "./libraries/TransferHelper.sol";

contract TokenFactory is Ownable {
    mapping(address => bool) public isTokenCreatedHere;
    mapping(address => address) public tokenToPair;
    address public feeCollector;
    mapping(address => bool) public authorizedFeeCollectors;

    event TokenCreated(
        address indexed token,
        string name,
        string symbol,
        address indexed creator
    );
    event PairCreated(address indexed token, address indexed pair);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    event FeesCollected(
        address indexed token,
        uint256 amount0,
        uint256 amount1
    );

    address public immutable weth;
    address public immutable uniswapFactory;
    address public immutable uniswapRouter;
    IUniswapV2Router02 public immutable router;
    mapping(address => bool) public pairInitialized;

    event PairInitialized(address pair, uint256 tokenAmount, uint256 ethAmount);

    constructor(
        address _weth,
        address _uniswapFactory,
        address _uniswapRouter,
        address _feeCollector,
        address initialOwner
    ) Ownable(initialOwner) {
        weth = _weth;
        uniswapFactory = _uniswapFactory;
        uniswapRouter = _uniswapRouter;
        feeCollector = _feeCollector;
        router = IUniswapV2Router02(_uniswapRouter);
    }

    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Invalid fee collector");
        address oldCollector = feeCollector;
        feeCollector = _feeCollector;
        emit FeeCollectorUpdated(oldCollector, _feeCollector);
    }

    function setTokenFactory(
        address _feeCollector,
        bool authorized
    ) external onlyOwner {
        require(_feeCollector != address(0), "Invalid fee collector address");
        authorizedFeeCollectors[_feeCollector] = authorized;
    }

    function createTokenAndInitializeLiquidity(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimals,
        uint256 initialLiquidityETH,
        uint256 tokenAmountForLiquidity,
        string memory logoIpfsHash,
        uint256 deadline
    ) external payable returns (address tokenAddress, address pairAddress) {
        require(msg.value >= initialLiquidityETH, "Insufficient ETH");
        require(initialLiquidityETH >= MIN_LIQUIDITY_ETH, "Liquidity too low");
        require(
            tokenAmountForLiquidity <= initialSupply,
            "Liquidity amount exceeds supply"
        );

        if (feeCollector != address(0)) {
            // 收取创建费用
            (bool success, ) = feeCollector.call{
                value: msg.value - initialLiquidityETH
            }("");
            require(success, "Fee transfer failed");
        }

        // 创建代币合约
        Token token = new Token(
            name,
            symbol,
            initialSupply,
            decimals,
            address(this),
            logoIpfsHash
        );

        tokenAddress = address(token);

        // 创建交易对
        pairAddress = IUniswapV2Factory(uniswapFactory).createPair(
            tokenAddress,
            weth
        );

        // 记录关联关系
        isTokenCreatedHere[tokenAddress] = true;
        tokenToPair[tokenAddress] = pairAddress;

        emit TokenCreated(tokenAddress, name, symbol, msg.sender);
        emit PairCreated(tokenAddress, pairAddress);

        // 添加初始流动性
        require(!pairInitialized[tokenAddress], "Pair already initialized");

        // 授权给 Router
        TransferHelper.safeApprove(
            tokenAddress,
            address(router),
            tokenAmountForLiquidity
        );

        // 添加流动性
        router.addLiquidityETH{value: initialLiquidityETH}(
            tokenAddress,
            tokenAmountForLiquidity,
            (tokenAmountForLiquidity * 95) / 100, // 允许 5% 滑点
            (initialLiquidityETH * 95) / 100, // 允许 5% 滑点
            address(this),
            deadline
        );

        pairInitialized[tokenAddress] = true;

        emit PairInitialized(
            pairAddress,
            tokenAmountForLiquidity,
            initialLiquidityETH
        );

        return (tokenAddress, pairAddress);
    }

    function collectFees(
        address token
    ) external onlyOwner returns (uint256 amount0, uint256 amount1) {
        require(pairInitialized[token], "Pair not initialized");
        address pair = tokenToPair[token];
        require(pair != address(0), "Pair not found");

        // 获取当前合约在交易对中的份额
        uint256 balance = IUniswapV2Pair(pair).balanceOf(address(this));
        if (balance > 0) {
            // 移除流动性
            IUniswapV2Pair(pair).transfer(pair, balance);
            (amount0, amount1) = IUniswapV2Pair(pair).burn(feeCollector);

            // 调用FeeCollector的collectTradingFee函数
            if (amount0 > 0) {
                IFeeCollector(feeCollector).collectTradingFee(token, amount0);
            }
            if (amount1 > 0) {
                IFeeCollector(feeCollector).collectTradingFee(weth, amount1);
            }

            emit FeesCollected(token, amount0, amount1);
        }
    }

    function verifyToken(address tokenAddress) external view returns (bool) {
        return isTokenCreatedHere[tokenAddress];
    }

    function getPair(address tokenAddress) external view returns (address) {
        return IUniswapV2Factory(uniswapFactory).getPair(tokenAddress, weth);
    }

    receive() external payable {}
}
