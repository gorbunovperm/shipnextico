import Web3 from 'web3';
import Promise from 'bluebird';
import { inspect } from 'util';

import { Contract, usdToCents, diff } from  '../lib';

import {
  getCurrency, getPaymentData,
  latestTime , makeid, getUsdFromCurrency
} from "../lib/utils";

import moment from 'moment';

const web3 = new Web3(global.web3.currentProvider);

const BN = web3.utils.BN;

let ShipCoin      = null;
let ShipCoinCurrency      = null;
let ShipCoinStorage       = null;
let ShipCoinBonusSystem   = null;
let ShipCoinCrowdsale     = null;

let eth,btc,eur,amb;

let countUsers = 1000;
let totalUSDpayment = 0;
let totalUSDpaymentMore10000Dolars = 0;
let users = {};

Contract.setArtifacts(artifacts);
Contract.getEthPrice();
Contract.setProvider(global.web3.currentProvider);
Contract.setNetwork(global.web3.version.network);
Contract.disableAllLog = (Contract.network === 'develop');

let owner,accounts,multisigAddress,ownerStartBalance;
let addressUsed = [];

function getAddress() {
  let tmpAddress = '0x'+makeid();

  if(addressUsed[tmpAddress] || !web3.utils.isAddress(tmpAddress)) {
    tmpAddress = getAddress();
  }
  addressUsed[tmpAddress] = true;
  return tmpAddress;
}

contract('Check limits', async (accountsData) => {
  [owner,...accounts] = accountsData;
  if(Contract.network == 'development') {
    owner = '0x2BF64b0ebd7Ba3E20C54Ec9F439c53e87E9d0a70';
  }

  if (Contract.network === "development") {
    multisigAddress = '0x220cD6eBB62F9aD170C9bf7984F22A3afc023E7d';
  } else if (Contract.network === "develop") {
    multisigAddress = '0x0f4f2ac550a1b4e2280d04c21cea7ebd822934b5';
  } else if (Contract.network === 'rinkeby') {
    multisigAddress = '0x49b7776eA56080439000fD54c45d72d3AC213020';
  }

  before(async () => {
    if(Contract.network != 'develop') {
      countUsers = 100;
    }

    Contract.log(`Test limits from ${countUsers} users:`);

    try {

      await getCurrency().then(currency => {
        eth = currency.eth;
        btc = currency.btc;
        eur = currency.eur;
        amb = currency.amb;
      });

      ShipCoin = await Contract.new('ShipCoin');
      ShipCoinCurrency = await Contract.new('ShipCoinCurrency', [usdToCents(eth), usdToCents(btc), usdToCents(eur), usdToCents(amb)]);
      ShipCoinStorage = await Contract.new('ShipCoinStorage');
      ShipCoinBonusSystem = await Contract.new('ShipCoinBonusSystem');
      ShipCoinCrowdsale = await Contract.new('ShipCoinCrowdsale');

      let now = ((await latestTime()) * 1000);

      await ShipCoinCrowdsale.init(
        ShipCoin.address,
        ShipCoinStorage.address,
        ShipCoinCurrency.address,
        ShipCoinBonusSystem.address,
        multisigAddress,
        moment(now).unix(),
        moment(now).add(28, 'days').unix(),
        moment(now).add(29, 'days').unix(),
        moment(now).add(84, 'days').unix()
      ).send({from: owner, gas: 300000});

      //addPay,editPay,addPreSaleBonus,editPreSaleBonus
      await ShipCoinCurrency.addMultiOwnerTypes([2, 3, 4, 5], ShipCoinCrowdsale.address).send({
        from: owner,
        gas: 300000
      });

      //getContributorId,getContributorAddressById,checkUserIdExists,addPayment
      //editPaymentByUserId,getUserPayment,processPreSaleBonus,reCountUserPreSaleBonus,
      //setReceivedCoin,setRefund,refundPay,refundETHContributors,refundPaymentByUserId
      await ShipCoinStorage.addMultiOwnerTypes([5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 18, 19, 20], ShipCoinCrowdsale.address).send({
        from: owner,
        gas: 500000
      });

      await ShipCoinCrowdsale.startPreSale().send({from: owner});

      ownerStartBalance = web3.utils.fromWei(web3.utils.toBN(await web3.eth.getBalance(owner)), 'ether');

    } catch (e) {
      console.error('Error before:',e);
      assert.throw(e);
    }

  });

  it('Add users to whiteList', async () => {
    for(let i = 1; i <= countUsers; i++) {
      let address = getAddress();
      try {
        await ShipCoinStorage.addWhiteList(i, address).send({from: owner, gas: 200000, nolog: true});
      } catch (e) {
        console.log('Add users to whiteList',i,address);
      }
    }
  });

  it('Payment in USD', async () => {
    for(let i = 1; i <= countUsers; i++) {
      let paymentValue = (Math.round(Math.random() * i + Math.random()) * 100000) + 100000;
      totalUSDpayment += paymentValue;
      if(paymentValue >= 1000000) {
        totalUSDpaymentMore10000Dolars++;
        users[i]=true;
      }
      try {
        await ShipCoinCrowdsale.addPay('USD', paymentValue, i, i, 0).send({
          from: owner,
          gas: 600000,
          nolog: true
        });
      } catch (e) {
        console.error(i,paymentValue);
        assert.ifError(e);
      }
    }
  });

  it('Payment in BTC', async () => {
    let currencyData = await ShipCoinCurrency.getContractStatic();
    for(let i = 1; i <= countUsers; i++) {
      let paymentValue = (Math.round(Math.random() * i + Math.random()) * 10000000) + 60000000;
      let usdRaisedCurrency = getUsdFromCurrency('BTC', paymentValue, currencyData).toString();
      totalUSDpayment += parseInt(usdRaisedCurrency);
      if(!users[i] && usdRaisedCurrency >= 1000000) {
        totalUSDpaymentMore10000Dolars++;
        users[i]=true;
      }
      try {
        await ShipCoinCrowdsale.addPay('BTC', paymentValue, i, (i*countUsers+1), 0).send({
          from: owner,
          gas: 600000,
          nolog: true
        });
      } catch (e) {
        console.error(i,paymentValue);
        assert.ifError(e);
      }
    }
  });

  it('Check payment info', async () => {
    let contractCurrencyUsdRaised = 0;
    let usersUsdAbs = 0;
    let nextContributorIndex,getCountNeedProcessPreSaleBonus,getCountNeedSendSHPC,getCountETHRefund;
    let ownerBalance = web3.utils.fromWei(web3.utils.toBN(await web3.eth.getBalance(owner)), 'ether');
    try {
      nextContributorIndex = await ShipCoinStorage.nextContributorIndex().call();
    } catch (e) {
      console.log('nextContributorIndex',e);
    }
    try {
      getCountNeedProcessPreSaleBonus = await ShipCoinStorage.getCountNeedProcessPreSaleBonus(10000000,0,countUsers).call();
    } catch (e) {
      console.log('getCountNeedProcessPreSaleBonus',e);
    }
    try {
      getCountNeedSendSHPC = await ShipCoinStorage.getCountNeedSendSHPC(0,countUsers).call();
    } catch (e) {
      console.log('getCountNeedSendSHPC',e);
    }
    try {
      getCountETHRefund = await ShipCoinStorage.getCountETHRefund(0,countUsers).call();
    } catch (e) {
      console.log('getCountETHRefund',e);
    }

    console.log('use eth:', (ownerStartBalance - ownerBalance));

    for(let i = 0; i < nextContributorIndex; i++) {
      let uId = await ShipCoinStorage.getContributorIndexes(i).call();
      let userData = await ShipCoinStorage.getContributionInfoById(uId).call();

      usersUsdAbs += parseInt(userData.usdAbsRaisedInCents);
    }

    let contractUsdAbsRaisedInCents = await ShipCoinCurrency.getUsdAbsRaisedInCents().call();
    let contractCurrencyPaymentData = JSON.parse(await ShipCoinCurrency.getCurrencyData().call());

    for (let key in contractCurrencyPaymentData) {
      let currency = contractCurrencyPaymentData[key];
      contractCurrencyUsdRaised += parseInt(currency.usdRaised);
    }

    assert.equal(contractUsdAbsRaisedInCents, contractCurrencyUsdRaised, 'contract usdAbsRaisedInCents');
    assert.equal(totalUSDpayment, usersUsdAbs, 'users usdAbsRaisedInCents');
    assert.equal(totalUSDpayment, contractUsdAbsRaisedInCents, 'totalUSDpayment');
    assert.equal(totalUSDpaymentMore10000Dolars, getCountNeedProcessPreSaleBonus, 'totalUSDpaymentMore10000Dolars');

  });

});


