require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy")
require("solidity-coverage")
require("dotenv").config()
require("hardhat-gas-reporter")
require("@nomiclabs/hardhat-etherscan")
require("@nomiclabs/hardhat-waffle")
require("hardhat-contract-sizer")

// env needed to be added by youself with your keys and bindings
const GOREILLY_RPC_URL = process.env.GOREILLY_RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers:[{version:"0.8.0"},{version:"0.8.8"}]
  },
  defaultNetwork: "hardhat",
  networks: {
    goreilly: {
      url: GOREILLY_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 5,
      saveDeployments:true
    },
    locahost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
  },
  namedAccounts: {
    deployer: {
      default:0
    },
    player: {
      default:1
    }
  },
  mocha: {
    timeout: 500000
  },
  etherscan: {
    apiKey: {
      goerli: ETHERSCAN_API_KEY
    }
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    coinmarketcap: COINMARKETCAP_API_KEY,
    outputFile: "gas-report.txt",
    noColors: true
  }
}