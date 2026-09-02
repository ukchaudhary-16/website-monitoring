// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MonitorToken
 * @dev ERC-20 token used for rewarding honest nodes and staking in the DePIN monitoring network
 * Only MonitorRegistry can mint new tokens
 */
contract MonitorToken is ERC20, ERC20Burnable, Ownable {
    // MonitorRegistry is the only address allowed to mint
    address public monitorRegistry;

    event MonitorRegistryUpdated(address indexed newRegistry);

    constructor(uint256 initialSupply) ERC20("Monitor", "MON") Ownable(msg.sender) {
        // Mint initial supply to deployer (treasury)
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Set the MonitorRegistry contract address (can only mint tokens)
     * @param _monitorRegistry Address of the MonitorRegistry contract
     */
    function setMonitorRegistry(address _monitorRegistry) external onlyOwner {
        require(_monitorRegistry != address(0), "Invalid registry address");
        monitorRegistry = _monitorRegistry;
        emit MonitorRegistryUpdated(_monitorRegistry);
    }

    /**
     * @dev Mint new tokens (only MonitorRegistry can call this)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == monitorRegistry, "Only MonitorRegistry can mint");
        require(to != address(0), "Cannot mint to zero address");
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from an address (only MonitorRegistry can call this)
     * Used for slashing dishonest nodes
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address from, uint256 amount) public override {
        require(msg.sender == monitorRegistry || msg.sender == from, "Unauthorized burn");
        _burn(from, amount);
    }

    /**
     * @dev Get total circulating supply
     */
    function getCirculatingSupply() external view returns (uint256) {
        return totalSupply();
    }
}
