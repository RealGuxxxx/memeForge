// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Token} from "./Token.sol";
import "./Constants.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IFeeCollector} from "./interfaces/IFeeCollector.sol";
import {IUniswapV3Factory} from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import {IUniswapV3Pool} from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import {INonfungiblePositionManager} from "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import {TransferHelper} from "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

contract TokenFactory is Ownable {
    mapping(address => bool) public isTokenCreatedHere;
    mapping(address => address) public tokenToPool;
    address public feeCollector;
    mapping(address => bool) public authorizedFeeCollectors;

    event TokenCreated(
        address indexed token,
        string name,
        string symbol,
        address indexed creator
    );
    event PoolCreated(address indexed token, address indexed pool);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    event FeesCollected(
        address indexed token,
        uint256 amount0,
        uint256 amount1
    );

    address public immutable weth;
    address public immutable uniswapFactory;
    address public immutable positionManager;
    INonfungiblePositionManager public immutable nonfungiblePositionManager;
    mapping(address => bool) public poolInitialized;
    mapping(address => uint256) public poolTokenIds;

    event PoolInitialized(
        address pool,
        uint256 tokenAmount,
        uint256 ethAmount,
        uint256 tokenId
    );

    constructor(
        address _weth,
        address _uniswapFactory,
        address _positionManager,
        address _feeCollector,
        address initialOwner
    ) Ownable(initialOwner) {
        weth = _weth;
        uniswapFactory = _uniswapFactory;
        positionManager = _positionManager;
        feeCollector = _feeCollector;
        nonfungiblePositionManager = INonfungiblePositionManager(
            _positionManager
        );
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

    function createTokenAndPool(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimals,
        uint256 initialLiquidityETH,
        string memory logoIpfsHash
    ) external payable returns (address tokenAddress, address poolAddress) {
        require(msg.value >= initialLiquidityETH, "Insufficient ETH");
        require(initialLiquidityETH >= MIN_LIQUIDITY_ETH, "Liquidity too low");

        if (feeCollector != address(0)) {
            // 收取创建费用
            (bool success, ) = feeCollector.call{
                value: msg.value - initialLiquidityETH
            }("");
            require(success, "Fee transfer failed");
        }

        // 创建代币合约，初始所有权给TokenFactory
        Token token = new Token(
            name,
            symbol,
            initialSupply,
            decimals,
            address(this),
            logoIpfsHash
        );

        tokenAddress = address(token);

        poolAddress = IUniswapV3Factory(uniswapFactory).createPool({
            tokenA: address(token) ,
            tokenB: weth,
            fee: IFeeCollector(feeCollector).getTradingFee()
        });

        // 将代币所有权转移给流动性池
        token.transferOwnership(poolAddress);

        // 记录关联关系
        isTokenCreatedHere[tokenAddress] = true;
        tokenToPool[tokenAddress] = poolAddress;

        emit TokenCreated(tokenAddress, name, symbol, msg.sender);
        emit PoolCreated(tokenAddress, poolAddress);

        return (tokenAddress, poolAddress);
    }

    function initializePoolWithLiquidity(
        address token,
        uint160 sqrtPriceX96,
        uint256 tokenAmount,
        uint256 ethAmount,
        uint256 deadline,
        int24 tickLower,
        int24 tickUpper
    ) external payable onlyOwner returns (uint256 tokenId) {
        require(!poolInitialized[token], "Pool already initialized");
        require(msg.value == ethAmount, "Invalid ETH amount");
        require(tickLower < tickUpper, "Invalid tick range");

        address pool = IUniswapV3Factory(uniswapFactory).getPool(
            token,
            weth,
            IFeeCollector(feeCollector).getTradingFee()
        );
        require(pool != address(0), "Pool not created");

        // 初始化池子价格
        IUniswapV3Pool(pool).initialize(sqrtPriceX96);

        // 授权给 PositionManager
        TransferHelper.safeApprove(token, address(nonfungiblePositionManager), tokenAmount);

        INonfungiblePositionManager.MintParams
            memory params = INonfungiblePositionManager.MintParams({
                token0: token < weth ? token : weth,
                token1: token < weth ? weth : token,
                fee: IFeeCollector(feeCollector).getTradingFee(),
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0Desired: token < weth ? tokenAmount : ethAmount,
                amount1Desired: token < weth ? ethAmount : tokenAmount,
                amount0Min: 1,
                amount1Min: 1,
                recipient: address(this),
                deadline: deadline + 60
            });

        (tokenId, , , ) = nonfungiblePositionManager.mint{value: ethAmount}(
            params
        );

        poolInitialized[token] = true;
        poolTokenIds[token] = tokenId;

        emit PoolInitialized(pool, tokenAmount, ethAmount, tokenId);
    }

    function collectFees(
        address token,
        uint128 amount0Requested,
        uint128 amount1Requested,
        address recipient
    ) external onlyOwner returns (uint256 amount0, uint256 amount1) {
        require(poolInitialized[token], "Pool not initialized");
        require(recipient == feeCollector, "Recipient must be fee collector");
        uint256 tokenId = poolTokenIds[token];

        INonfungiblePositionManager.CollectParams
            memory params = INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: recipient,
                amount0Max: amount0Requested,
                amount1Max: amount1Requested
            });

        (amount0, amount1) = nonfungiblePositionManager.collect(params);

        // 调用FeeCollector的collectTradingFee函数
        if (amount0 > 0) {
            IFeeCollector(feeCollector).collectTradingFee(token, amount0);
        }
        if (amount1 > 0) {
            IFeeCollector(feeCollector).collectTradingFee(weth, amount1);
        }

        emit FeesCollected(token, amount0, amount1);
    }

    function verifyToken(address tokenAddress) external view returns (bool) {
        return isTokenCreatedHere[tokenAddress];
    }

    function getPool(address tokenAddress) external view returns (address) {
        // 确保token地址顺序正确
        (address token0, address token1) = tokenAddress < weth
            ? (tokenAddress, weth)
            : (weth, tokenAddress);
        return
            IUniswapV3Factory(uniswapFactory).getPool(
                token0,
                token1,
                IFeeCollector(feeCollector).getTradingFee()
            );
    }

    receive() external payable {}
}
