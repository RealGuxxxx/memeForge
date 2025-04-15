// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Token is ERC20, Ownable {
    uint8 private immutable decimalsValue;
    uint256 private immutable totalSupplyValue;
    string private logoIpfsHashValue;

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimalsParam,
        address owner,
        string memory logoHash
    ) ERC20(name, symbol) Ownable(owner) {
        _mint(owner, initialSupply);
        decimalsValue = decimalsParam;
        totalSupplyValue = initialSupply;
        logoIpfsHashValue = logoHash;
    }

    function logoIpfsHash() public view returns (string memory) {
        return logoIpfsHashValue;
    }

    function totalSupply() public view override returns (uint256) {
        return totalSupplyValue;
    }

    function decimals() public view override returns (uint8) {
        return decimalsValue;
    }

    function transferOwnership(address newOwner) public override onlyOwner {
        _transferOwnership(newOwner);
    }

}
