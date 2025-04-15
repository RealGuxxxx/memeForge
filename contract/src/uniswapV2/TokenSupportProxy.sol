// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ISwap.sol";

/**
 * @title TokenSupportProxy
 * @dev 代理合约，用于管理Swap合约中的支持代币列表
 * 该合约接收Swap合约的所有权，允许任何用户调用添加支持代币的功能
 */
contract TokenSupportProxy is Ownable, ReentrancyGuard {
    address public swapContract;

    // 记录已添加的代币，防止重复添加
    mapping(address => bool) public addedTokens;

    // 事件
    event TokenAdded(address indexed token, address indexed requester);
    event SwapContractUpdated(address indexed oldSwap, address indexed newSwap);

    /**
     * @dev 构造函数
     * @param _swapContract Swap合约地址
     * @param initialOwner 合约的初始所有者
     */
    constructor(
        address _swapContract,
        address initialOwner
    ) Ownable(initialOwner) {
        require(
            _swapContract != address(0),
            "Swap contract address cannot be zero"
        );
        swapContract = _swapContract;
    }

    /**
     * @dev 更新Swap合约地址
     * @param _newSwapContract 新的Swap合约地址
     * 只有合约所有者可以调用此函数
     */
    function updateSwapContract(address _newSwapContract) external onlyOwner {
        require(
            _newSwapContract != address(0),
            "New swap contract address cannot be zero"
        );
        address oldSwap = swapContract;
        swapContract = _newSwapContract;
        emit SwapContractUpdated(oldSwap, _newSwapContract);
    }

    /**
     * @dev 添加支持的代币
     * @param token 要添加的代币地址
     * 任何用户都可以调用此函数
     */
    function addSupportedToken(address token) external nonReentrant {
        require(token != address(0), "Token address cannot be zero");
        require(!addedTokens[token], "Token already added");

        // 调用Swap合约的addSupportedToken函数
        ISwap(swapContract).addSupportedToken(token);

        // 记录已添加的代币
        addedTokens[token] = true;

        // 发送事件
        emit TokenAdded(token, msg.sender);
    }

    /**
     * @dev 检查代币是否已由此合约添加
     * @param token 要检查的代币地址
     * @return bool 如果代币已添加则返回true
     */
    function isTokenAdded(address token) external view returns (bool) {
        return addedTokens[token];
    }

    /**
     * @dev 紧急函数，用于当合约升级或淘汰时将Swap合约的所有权转移回指定的所有者
     * @param newOwner Swap合约的新所有者
     * 只有合约所有者可以调用此函数
     */
    function transferSwapOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");

        // 将Swap合约的所有权转移给新所有者
        Ownable(swapContract).transferOwnership(newOwner);
    }
}
