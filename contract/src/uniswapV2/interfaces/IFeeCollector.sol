// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFeeCollector {
    function getTradingFee() external view returns (uint24);

    function getCreationFee() external view returns (uint256);

    function collectTradingFee(address token, uint256 amount) external;
}
