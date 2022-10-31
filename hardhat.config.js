require("dotenv").config();
require("@nomiclabs/hardhat-waffle");

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;

const accounts = [
  process.env.PRIVATE_KEY,
];

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts,
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts,
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts,
    },
    hmy: {
      url: 'https://api.s0.t.hmny.io',
      accounts,
    },
    hmytest: {
      url: 'https://api.s0.b.hmny.io',
      accounts,
    },
  },
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  },
};
