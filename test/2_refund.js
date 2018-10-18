import Web3 from 'web3';
import { inspect } from 'util';

import { Contract, usdToCents } from  '../lib';

import {
  getAllUsers, getCurrency, getUserInfo,
  increaseTimeTo, latestTime, checkRefundPay
} from "../lib/utils";

import moment from 'moment';

const web3 = new Web3(global.web3.currentProvider);

const BN = web3.utils.BN;

let ShipCoin      = null;
let ShipCoinCurrency      = null;
let ShipCoinStorage       = null;
let ShipCoinBonusSystem   = null;
let ShipCoinCrowdsale     = null;

let eth,btc,eur;
let usersData = {
  'user1': {
    id: 10,
    address: null,
    payments: {
      "ETH": [
        web3.utils.toWei('1'),      //  1 ETH
        web3.utils.toWei('0.55'),   //  0.55 ETH
        web3.utils.toWei('0.556'),  //  0.556 ETH
      ],
      "NOETH": [
        {"ticker": "BTC", "value": 100000000, 'pId': 1}, // 1 BTC
        {"ticker": "USD", "value": 10000,      'pId': 2}, // 100$
        {"ticker": "USD", "value": 125000,     'pId': 3}, // 1250$
      ]
    }
  },
  'user2': {
    id: 15,
    address: null,
    payments: {
      "NOETH": [
        {"ticker": "BTC", "value": 120000000, 'pId': 4}, // 1.2 BTC
      ]
    }
  },
  'user3': {
    id: 20,
    address: null,
    payments: {
      "NOETH": [
        {"ticker": "USD", "value": 500000, 'pId': 5}, // 5000$
      ]
    }
  },
  'user4': {
    id: 25,
    address: null,
    payments: {
      "ETH": [
        web3.utils.toWei('1'),      //  1 ETH
        web3.utils.toWei('0.65'),   //  0.65 ETH
        web3.utils.toWei('0.673'),  //  0.673 ETH
      ],
    }
  },
  'user5': {
    id: 30,
    address: null,
    payments: {
      "ETH": [
        web3.utils.toWei('1'),      //  1 ETH
      ],
    }
  }
};

Contract.setArtifacts(artifacts);
Contract.getEthPrice();
Contract.setProvider(global.web3.currentProvider);
Contract.setNetwork(global.web3.version.network);
Contract.disableAllLog = (Contract.network === 'develop');

let owner,manager,user1,user2,user3,user4,user5,accounts,multisigAddress;

contract('Check refund', async (accountsData) => {
  [owner,manager,user1,user2,user3,user4,user5,...accounts] = accountsData;
  if(Contract.network == 'development') {
    manager = '0xA5Fe0dEda5E1a0FCc34B02B5BE6857e30C9023fE';
    user1 = '0x4dc884abb17d11de6102fc1ef2cee0ebd31df248';
    user2 = '0xbaB73be18f0739Cd3160FBbc5E140EA3c940F5D6';
    user3 = '0x158956caa3249F39774aD9377c22eA53C0ba2236';
    user4 = '0x4e49f84f5dbaa8d994a4b7b198842deb0a5a58ec';
    user5 = '0x27f41ffcd787aea219eb9cfd2418bc0551317c09';
  }

  if (Contract.network === "development") {
    multisigAddress = '0x220cD6eBB62F9aD170C9bf7984F22A3afc023E7d';
  } else if (Contract.network === "develop") {
    multisigAddress = '0x0f4f2ac550a1b4e2280d04c21cea7ebd822934b5';
  } else if (Contract.network === 'rinkeby') {
    multisigAddress = '0x49b7776eA56080439000fD54c45d72d3AC213020';
  }

  before(async () => {
    Contract.log('Test refund');

    try {

      await getCurrency().then(currency => {
        eth = currency.eth;
        btc = currency.btc;
        eur = currency.eur;
      });

      ShipCoin = await Contract.new('ShipCoin');
      ShipCoinCurrency = await Contract.new('ShipCoinCurrency', [usdToCents(eth), usdToCents(btc), usdToCents(eur)]);
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

      console.log(`------------------------- refund test --------------------------`);
      console.log(` ShipCoinStorage   | ${ShipCoinStorage.address}`);
      console.log(` ShipCoinCurrency  | ${ShipCoinCurrency.address}`);
      console.log(` ShipCoinCrowdsale | ${ShipCoinCrowdsale.address}`);
      console.log(` Manager           | ${manager}`);
      console.log(` MultiSig          | ${multisigAddress}`);
      console.log(` ETH               | ${eth.toFixed(2)}$ in cents(${usdToCents(eth)})`);
      console.log(` BTC               | ${btc.toFixed(2)}$ in cents(${usdToCents(btc)})`);
      console.log(` EUR               | ${eur.toFixed(2)}$ in cents(${usdToCents(eur)})`);
      console.log(`----------------------------------------------------------------\n`);

      if (Contract.network == 'development') {
        await web3.eth.personal.unlockAccount(manager, "123123123", 15000);
        await web3.eth.personal.unlockAccount(user1, "123123123", 15000);
        await web3.eth.personal.unlockAccount(user2, "123123123", 15000);
        await web3.eth.personal.unlockAccount(user3, "123123123", 15000);
        await web3.eth.personal.unlockAccount(user4, "123123123", 15000);
        await web3.eth.personal.unlockAccount(user5, "123123123", 15000);
      }

      usersData.user1.address = user1;
      usersData.user2.address = user2;
      usersData.user3.address = user3;
      usersData.user4.address = user4;
      usersData.user5.address = user5;

      //addWhiteList,changeMainWallet,getContributionInfoById,getContributorId
      await ShipCoinStorage.addMultiOwnerTypes([1, 3, 4, 5], manager).send({from: owner, gas: 300000});

      //addPay,editPay,addPreSaleBonus,editPreSaleBonus
      await ShipCoinCurrency.addMultiOwnerTypes([2, 3, 4, 5], ShipCoinCrowdsale.address).send({
        from: owner,
        gas: 300000
      });

      //getContributorId,getContributorAddressById,getContributorIndexes,checkUserIdExists,addPayment
      //editPaymentByUserId,getUserPayment,processPreSaleBonus,reCountUserPreSaleBonus,
      //setReceivedCoin,setRefund,refundPay,refundETHContributors,refundPaymentByUserId,changeSupportChangeMainWallet
      await ShipCoinStorage.addMultiOwnerTypes([5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 18, 19, 20, 21], ShipCoinCrowdsale.address).send({
        from: owner,
        gas: 500000
      });

      for (let key in usersData) {
        let user = usersData[key];
        await ShipCoinStorage.addWhiteList(user.id, user.address).send({from: owner, gas: 200000});
      }

      await ShipCoinCrowdsale.startPreSale().send({from: owner});

    } catch (e) {
      console.error('Error before:',e);
      assert.throw(e);
    }

  });

  it('Payment in ETH', async () => {
    for (let key in usersData) {
      let user = usersData[key];
      if (user.payments && user.payments.ETH) {
        for (let paymentValue of user.payments.ETH) {
          try {
            await web3.eth.sendTransaction({
              from: user.address,
              to: ShipCoinCrowdsale.address,
              value: paymentValue,
              gas: 600000
            });
          } catch (e) {
            assert.ifError(e);
          }
        }
      }
    }
  });

  it('Payment in btc,usd,eur', async () => {
    for (let key in usersData) {
      let user = usersData[key];
      if (user.payments && user.payments.NOETH) {
        for (let payment of user.payments.NOETH) {
          try {
            await ShipCoinCrowdsale.addPay(payment.ticker, payment.value, user.id, payment.pId, 0).send({
              from: owner,
              gas: 600000
            });
          } catch (e) {
            assert.ifError(e);
          }
        }
      }
    }
  });

  it('Refund payment', async () => {
    let user = usersData.user1;
    let payId = user.payments.NOETH[0].pId;
    await checkRefundPay(user.id,payId)(owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale);
  });

  it('Refund user', async () => {
    let user = usersData.user5;
    let userInfo = await getUserInfo(ShipCoinStorage,user.id,false);
    assert.isFalse(await ShipCoinCrowdsale.refundETH().send({ from: user.address, gas: 300000 }).catch(e =>  false),'checkFailGetSHPC 1');

    let { endSaleDate } = await ShipCoinCrowdsale.getContractStatic();

    if(Contract.network === 'develop') {
      await increaseTimeTo(endSaleDate);
    } else {
      await ShipCoinCrowdsale.setEndSaleDate(moment(((await latestTime()) * 1000)).unix()).send({ from: owner });
    }
    await ShipCoinCrowdsale.saleSetRefund().send({ from: owner });

    let crowdsaleData = await ShipCoinCrowdsale.getContractStatic();

    assert.equal(crowdsaleData.state,5,'status refund');

    await ShipCoinCrowdsale.refundETH().send({ from: user.address, gas: 300000 });

    let afterETHBalance = new BN(await ShipCoinCrowdsale.getETHBalance().call());
    let userInfoAfter = await ShipCoinStorage.getContributionInfoById(user.id).call();

    assert.equal(new BN(crowdsaleData.getETHBalance).sub(new BN(userInfo.payInCurrency.ETH)).toString(),afterETHBalance.toString());
    assert.isTrue(userInfoAfter.refund);

    assert.isFalse(await ShipCoinCrowdsale.refundETH().send({ from: user.address, gas: 300000 }).catch(e =>  false),'checkFailGetSHPC 1');

  });

  it('Refund users', async () => {
    let beforeETHBalance = new BN(await ShipCoinCrowdsale.getETHBalance().call());

    assert.equal(await ShipCoinStorage.getCountETHRefund(0,100).call(), 2);

    let allUsersRefund = true;

    let totalRefund = new BN('0');
    let allUsersData = await getAllUsers(ShipCoinStorage);

    for(let key in allUsersData) {
      if(allUsersData[key].payInCurrency.ETH > 0 && !allUsersData[key].refund) {
        totalRefund = totalRefund.add(new BN(allUsersData[key].payInCurrency.ETH));
      }
    }

    await ShipCoinCrowdsale.refundETHContributors(0, 10).send({ from: owner, gas: 600000 });

    assert.equal(await ShipCoinStorage.getCountETHRefund(0,100).call(), 0);

    let afterETHBalance = new BN(await ShipCoinCrowdsale.getETHBalance().call());

    assert.equal(beforeETHBalance.sub(totalRefund).toString(),afterETHBalance.toString());

    let allUsersDataAfter = await getAllUsers(ShipCoinStorage);
    for(let key in allUsersDataAfter) {
      if(allUsersDataAfter[key].payInCurrency.ETH > 0 && !allUsersDataAfter[key].refund) {
        allUsersRefund = false;
        break;
      }
    }
    assert.isTrue(allUsersRefund);

    assert.isFalse(await ShipCoinCrowdsale.refundPay(usersData.user1.id, usersData.user1.payments.NOETH[0].pId).send({ from: owner, gas: 600000 }).catch(e =>  false),'check pay refund 1');
  });

});
