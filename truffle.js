require('babel-register');
require('babel-polyfill');

module.exports = {
  networks: {
    development: {
      host: process.env.HOST || "localhost",
      port: 8545,
      network_id: 1515,
      gas: 6700000, // Gas limit used for deploys
      gasPrice: 21000000000 // 21 Gwei
    },
    develop: {
      host: "127.0.0.1",
      port: 9545,
      network_id: 4447,
      gas: 6700000, // Gas limit used for deploys
      gasPrice: 21000000000, // 21 Gwei,
      from: '0x627306090abab3a6e1400e9345bc60c78a8bef57'
    },
    rinkeby: {
      host: process.env.HOST || "localhost",
      port: 8545,
      network_id: 4,
      gas: 6700000, // Gas limit used for deploys
      from: '0x49b7776ea56080439000fd54c45d72d3ac213020'
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  mocha: {
    useColors: true,
    enableTimeouts: false
  }
};
