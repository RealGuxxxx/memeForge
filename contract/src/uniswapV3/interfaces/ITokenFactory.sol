// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITokenFactory {
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
    event PoolInitialized(
        address pool,
        uint256 tokenAmount,
        uint256 ethAmount,
        uint256 tokenId
    );

    function setFeeCollector(address _feeCollector) external;

    function createTokenAndPool(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimals,
        uint256 initialLiquidityETH,
        string memory logoIpfsHash
    ) external payable returns (address tokenAddress, address poolAddress);

    function initializePoolWithLiquidity(
        address token,
        uint160 sqrtPriceX96,
        uint256 tokenAmount,
        uint256 ethAmount,
        uint256 deadline,
        int24 tickLower,
        int24 tickUpper
    ) external payable returns (uint256 tokenId);

    function collectFees(
        address token,
        uint128 amount0Requested,
        uint128 amount1Requested,
        address recipient
    ) external returns (uint256 amount0, uint256 amount1);

    function verifyToken(address tokenAddress) external view returns (bool);

    function getPool(address tokenAddress) external view returns (address);
}
