// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFeeCollector {
    event FeeCollected(address indexed token, uint256 amount);
    event CreationFeeCollected(address indexed creator, uint256 amount);
    event FeeUpdated(uint256 newTradingFee, uint256 newCreationFee);

    function getTradingFee() external view returns (uint24);

    function getCreationFee() external view returns (uint256);

    function setFees(uint256 _tradingFee, uint256 _creationFee) external;

    function collectTradingFee(address token, uint256 amount) external;

    function withdrawFees(address token) external;
}
