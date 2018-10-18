/**
 * @author Emil Dudnyk
 */
const moment   = require('moment');
const Promise  = require('bluebird');
const { Migration } = require( '../lib');
const { getCurrency } = require( '../lib/utils');

module.exports = function(deployer, network, accounts) {
    Migration.clearLog();
    Migration.setDeployer(deployer);
    Migration.setArtifacts(artifacts);
    Migration.getEthPrice();
    Migration.setNetwork(network);
    Migration.disableAllLog = (network === 'develop');
    //Migration.disableWriteFileLog = (network === 'develop');
    Migration.provider = this.web3.currentProvider;

    /* base */
    let multisigAddress = null;
    let ethPrice = 0;
    let btcPrice = 0;
    let eurPrice = 117;

    if (network === "development") {
      multisigAddress = '0x220cD6eBB62F9aD170C9bf7984F22A3afc023E7d';
    } else if (network === "develop") {
      multisigAddress = '0x0f4f2ac550a1b4e2280d04c21cea7ebd822934b5';
    } else if (network === 'rinkeby') {
      multisigAddress = '0x49b7776eA56080439000fD54c45d72d3AC213020';
    }

    let ShipCoin = new Migration('ShipCoin');
    let ShipCoinBonusSystem = new Migration('ShipCoinBonusSystem');
    let ShipCoinStorage = new Migration('ShipCoinStorage');
    let ShipCoinCurrency = new Migration('ShipCoinCurrency', {
      _ethPrice: ethPrice,
      _btcPrice: btcPrice,
      _eurPrice: eurPrice
    });
    let ShipCoinCrowdsale = new Migration('ShipCoinCrowdsale');

  deployer.then(() => {
    return getCurrency(true)
      .then(currency => {
        ethPrice = currency.eth;
        btcPrice = currency.btc;
        eurPrice = currency.eur;
      })
      .then(() => ShipCoin.deploy())
      .then(() => ShipCoinStorage.deploy())
      .then(() => ShipCoinBonusSystem.deploy())
      .then(() => ShipCoinCurrency.deploy({_ethPrice: ethPrice, _btcPrice: btcPrice, _eurPrice: eurPrice}))
      .then(() => ShipCoinCrowdsale.deploy()
      )
      .then(() => ShipCoinCrowdsale.init(
        ShipCoin.address,
        ShipCoinStorage.address,
        ShipCoinCurrency.address,
        ShipCoinBonusSystem.address,
        multisigAddress,
        moment().unix(),
        moment().add(28, 'days').unix(),
        moment().add(29, 'days').unix(),
        moment().add(84, 'days').unix()
      ))
      .then(() => {
        Migration.log('\n\n\nDeployInfo');
        Migration.log('ShipCoin:              ', `[${ShipCoin.address}]`);
        Migration.log('ShipCoinStorage:       ', `[${ShipCoinStorage.address}]`);
        Migration.log('ShipCoinBonusSystem:   ', `[${ShipCoinBonusSystem.address}]`);
        Migration.log('ShipCoinCurrency:      ', `[${ShipCoinCurrency.address}]`);
        Migration.log('ShipCoinCrowdsale:     ', `[${ShipCoinCrowdsale.address}]`);
        Migration.log('gasPrice:              ', Migration.gasPrice);
        Migration.log('ethPrice:              ', Migration.ethPrice);
        Migration.log('btcPrice:              ', btcPrice);
        multisigAddress && Migration.log('multisigAddress:       ', multisigAddress);

        Migration.getInfoAll();
        Migration.writeDeployInfo('ShipCoin');
        return Promise.resolve(true);
      })
      .catch(e => {
        console.log('------ Migration Error ------\n');
        console.error(e);
      });
  });
};
