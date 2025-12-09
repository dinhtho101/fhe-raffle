require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: '../.env.local' });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== 'your_private_key_here' ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 20000000000, // 20 gwei
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia_fork: {
      url: "http://127.0.0.1:8545",
      forking: {
        url: "https://sepolia.infura.io/v3/",
        blockNumber: 4000000 // Optional: fork from specific block
      },
      chainId: 11155111
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};