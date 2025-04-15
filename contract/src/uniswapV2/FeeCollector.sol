// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FeeCollector is Ownable {
    uint24 public tradingFee = 3000; // 0.3%
    uint256 public creationFee = 0;
    mapping(address => bool) public authorizedTokenFactories;

    event FeeCollected(address indexed token, uint256 amount);
    event CreationFeeCollected(address indexed creator, uint256 amount);
    event FeeUpdated(uint256 newCreationFee);
    event TokenFactoryUpdated(address indexed tokenFactory, bool authorized);

    constructor(address initialOwner) Ownable(initialOwner) {}

    // 设置创建费用
    function setFees(uint256 _creationFee) external onlyOwner {
        creationFee = _creationFee;
        emit FeeUpdated(_creationFee);
    }

    /**
     * @notice 提取合约中的手续费
     * @dev 合约拥有者可以提取合约中的ETH或ERC20代币
     * @param token 代币合约地址，如果是ETH则传入address(0)
     */
    function withdrawFees(address token) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(address(this).balance);
        } else {
            IERC20(token).transfer(
                owner(),
                IERC20(token).balanceOf(address(this))
            );
        }
    }

    function setTokenFactory(
        address tokenFactory,
        bool authorized
    ) external onlyOwner {
        require(tokenFactory != address(0), "Invalid token factory address");
        authorizedTokenFactories[tokenFactory] = authorized;
        emit TokenFactoryUpdated(tokenFactory, authorized);
    }

    function getTradingFee() external view returns (uint24) {
        return tradingFee;
    }

    function getCreationFee() external view returns (uint256) {
        return creationFee;
    }

    function collectTradingFee(address token, uint256 amount) external {
        require(authorizedTokenFactories[msg.sender], "Unauthorized");
        emit FeeCollected(token, amount);
    }

    receive() external payable {
        emit CreationFeeCollected(msg.sender, msg.value);
    }
}
