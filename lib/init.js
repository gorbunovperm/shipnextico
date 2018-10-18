const Web3 = require('web3');

const yargs = require('yargs');
const argv = yargs.argv;

const { Contract } = require('../lib');
const { getDeployContractAddress,getUserInfo } = require('../lib/utils');

let owner,manager,ShipCoin,ShipCoinCurrency,ShipCoinStorage,ShipCoinBonusSystem,ShipCoinCrowdsale;

async function init() {
  //addWhiteList,changeMainWallet,getContributionInfoById,getContributorId
  await ShipCoinStorage.addMultiOwnerTypes([1,3,4,5], manager).send({ from: owner, gas: 300000 });

  //updateCurrency
  await ShipCoinCurrency.addMultiOwnerType(6, manager).send({ from: owner });

  //addPay
  await ShipCoinCrowdsale.addMultiOwnerTypes([6], manager).send({ from: owner });

  //addPay,editPay,addPreSaleBonus,editPreSaleBonus
  await ShipCoinCurrency.addMultiOwnerTypes([2,3,4,5], ShipCoinCrowdsale.address).send({ from: owner, gas: 300000 });

  //getContributorId,getContributorAddressById,getContributorIndexes,checkUserIdExists,addPayment
  //editPaymentByUserId,getUserPaymentById,processPreSaleBonus,reCountUserPreSaleBonus,
  //setReceivedCoin,setRefund,refundPay,refundETHContributors,refundPaymentByUserId,changeSupportChangeMainWallet
  await ShipCoinStorage.addMultiOwnerTypes([5,6,7,8,9,10,11,12,13,15,16,18,19,20,21], ShipCoinCrowdsale.address).send({
    from: owner,
    gas: 500000
  });

  if((await ShipCoinCrowdsale.state().call()) == 0) {
    await ShipCoinCrowdsale.startPreSale().send({from: owner});
  }

  if((await ShipCoinCrowdsale.state().call()) != 1) {
    throw 'State not change to preSale';
  }
}

async function getAllContractInfo(){
  let ShipCoinData = await ShipCoin.getContractStatic();
  let ShipCoinCurrencyData = await ShipCoinCurrency.getContractStatic();
  let ShipCoinStorageData = await ShipCoinStorage.getContractStatic();
  let ShipCoinBonusSystemData = await ShipCoinBonusSystem.getContractStatic();
  let ShipCoinCrowdsaleData = await ShipCoinCrowdsale.getContractStatic();

  console.dir({ShipCoinData,ShipCoinCurrencyData,ShipCoinStorageData,ShipCoinBonusSystemData,ShipCoinCrowdsaleData}, { colors: true, depth: 5 });
}

let userInit = {
  id: 2,
  address: '0x4dc884abb17d11de6102fc1ef2cee0ebd31df248',
  payments: {
    "ETH": [
      Web3.utils.toWei('1'),      //  1 ETH
      Web3.utils.toWei('0.55'),   //  0.55 ETH
      Web3.utils.toWei('0.556'),  //  0.556 ETH
    ],
    "NOETH": [
      {"ticker": "BTC", "value": 100000000, 'pId': 1}, // 1 BTC
      {"ticker": "USD", "value": 10000, 'pId': 2}, // 100$
      {"ticker": "USD", "value": 125000, 'pId': 3}, // 1250$
      {"ticker": "USD", "value": 58000, 'pId': 35}, // 580$
      {"ticker": "BTC", "value": 50000000, 'pId': 45}, // 0.5 BTC
    ]
  }
};

module.exports = async function(callback) {
  try {

    Contract.setArtifacts(artifacts);
    Contract.getEthPrice();
    Contract.setProvider(this.web3.currentProvider);
    Contract.setNetwork(this.web3.version.network);
    const web3 = new Web3(this.web3.currentProvider);

    if(Contract.network == 'development') {
      owner = '0x2BF64b0ebd7Ba3E20C54Ec9F439c53e87E9d0a70';
      manager = '0xA5Fe0dEda5E1a0FCc34B02B5BE6857e30C9023fE';
    }

    if(Contract.network == 'rinkeby') {
      owner = '0x49b7776eA56080439000fD54c45d72d3AC213020';
      manager = '0x49b7776eA56080439000fD54c45d72d3AC213020';
    }

    const contractAddress = await getDeployContractAddress();

    ShipCoin            = await Contract.init('ShipCoin',             contractAddress.ShipCoin            || '0xe40d2fee1554cd536c630bf5af30fdfe97f924de');
    ShipCoinStorage     = await Contract.init('ShipCoinStorage',      contractAddress.ShipCoinStorage     || '0x6134cf6bd676ff7abd287a02b54774de9fd2b79a');
    ShipCoinBonusSystem = await Contract.init('ShipCoinBonusSystem',  contractAddress.ShipCoinBonusSystem || '0xdb482bb377487c67de33543ce64f308f21c20ade');
    ShipCoinCurrency    = await Contract.init('ShipCoinCurrency',     contractAddress.ShipCoinCurrency    || '0xd859dc3f136cb137b6bd36614c597691aa136bfa');
    ShipCoinCrowdsale   = await Contract.init('ShipCoinCrowdsale',    contractAddress.ShipCoinCrowdsale   || '0xbf21aa80269579f4e411ef17e25114468ba3d6b8');

    let firstState = await ShipCoinCrowdsale.state().call();

    if(firstState == 0) {
      await init(ShipCoinStorage,ShipCoinCrowdsale,ShipCoinCurrency,owner,manager);
    }

    if(argv.afterInit) {
      if(Contract.network == 'development') {
        await web3.eth.personal.unlockAccount(manager,  "123123123", 15000);
        await web3.eth.personal.unlockAccount(userInit.address,    "123123123", 15000);
      }
      switch (argv.afterInit) {
        case 1:
        case 'addWhiteList':
          if((await ShipCoinStorage.getContributionInfo(userInit.address).call({ from: manager })).active == false) {
            await ShipCoinStorage.addWhiteList(userInit.id, userInit.address).send({ from: manager, gas: 200000 });
            if((await ShipCoinStorage.getContributionInfo(userInit.address).call({ from: manager })).active == true) {
              console.log(`addWhiteList added:[${userInit.address}]`);
            } else {
              throw `addWhiteList no added: [${userInit.address}]`;
            }
          } else {
            console.log(`addWhiteList before added:[${userInit.address}]`);
          }
          break;

        case 2:
        case 'paymentETH':
          let value = web3.utils.toWei((argv.value || 1).toString());
          console.log(`Payment ${value} in wei`);
          await web3.eth.sendTransaction({
            from: userInit.address,
            to: ShipCoinCrowdsale.address,
            value: value,
            gas: 600000
          });

          break;

        case 3:
        case 'permissionAddPay':
          let address = argv.address.toString();

          if(!address || !web3.utils.isAddress(address)) {
            throw `address not valid`;
          }
          //addPay
          await ShipCoinCrowdsale.addMultiOwnerType(6, address).send({ from: owner });
          break;

        case 4:
        case 'init':
          await init(ShipCoinStorage,ShipCoinCrowdsale,ShipCoinCurrency,owner,manager);
          break;

        case 5:
        case 'showUserInfo':
          let id = argv.id && argv.id.toString();
          console.dir({userData:await getUserInfo(ShipCoinStorage,id || userInit.id)}, { colors: true, depth: 5 });
          break;

        case 6:
        case 'getAllContractInfo':
          await getAllContractInfo();
          break;

        default:
          throw 'arguments afterInit must be set';
      }
    } else {
      if(firstState == 1) {
        throw 'Crowdsale state is preSale. No need initial';
      }
      await getAllContractInfo()
    }

    return callback(null);
  } catch (e) {
    callback(e);
  }
};

