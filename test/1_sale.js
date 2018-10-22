import Web3 from 'web3';
import { inspect } from 'util';

import { Contract, usdToCents } from  '../lib';
import {
  getCurrency, checkEditPay, getAllUsersInfo,
  increaseTimeTo, timeIncrease, latestTime,
  checkPaySale, getAllUsers, checkRefundPay, getUserInfo
} from "../lib/utils";

import moment from 'moment';

const web3 = new Web3(global.web3.currentProvider);

const BN = web3.utils.BN;

let ShipCoin      = null;
let ShipCoinCurrency      = null;
let ShipCoinStorage       = null;
let ShipCoinCrowdsale     = null;

let eth,btc,eur,amb, totalUserETHPayment = 0;
let userDataCurrencyPayment = { ETH:0 };
let usersData = {
  'user1': {
    id: 10,
    address: null,
    payments: {
      "ETH": [
        web3.utils.toWei('7'),      //  7 ETH
        web3.utils.toWei('5.55'),   //  5.55 ETH
        web3.utils.toWei('5.556'),  //  5.556 ETH
      ],
      "NOETH": [
        {"ticker": "BTC", "value": 100000000,   'pId': 1}, // 1 BTC
        {"ticker": "USD", "value": 100000,       'pId': 2}, // 1000$
        {"ticker": "USD", "value": 125000,      'pId': 3}, // 1250$
        {"ticker": "USD", "value": 158000,       'pId': 35}, // 1580$
        {"ticker": "BTC", "value": 50000000,    'pId': 45}, // 0.5 BTC
      ]
    }
  },
  'user2': {
    id: 15,
    address: null,
    payments: {
      "NOETH": [
        {"ticker": "BTC", "value": 120000000, 'pId': 4}, // 1.2 BTC
        {"ticker": "BTC", "value": 300000000, 'pId': 43}, // 3 BTC
      ]
    }
  },
  'user3': {
    id: 20,
    address: null,
    payments: {
      "NOETH": [
        {"ticker": "USD", "value": 1000000, 'pId': 5}, // 10000$
      ]
    }
  },
  'user4': {
    id: 25,
    address: null,
    payments: {}
  },
  'user5': {
    id: 30,
    address: null,
    payments: {}
  }
};

//Contract.clearLog();
Contract.setArtifacts(artifacts);
Contract.getEthPrice();
Contract.setProvider(global.web3.currentProvider);
Contract.setNetwork(global.web3.version.network);
Contract.disableAllLog = (Contract.network === 'develop');
//Contract.disableWriteFileLog = (network === 'develop');

let owner,manager,user1,user2,user3,user4,user5,multiSig,accounts;
let multiSigBalance = 0;

contract('Sale', async (accountsData) => {
  [owner,manager,user1,user2,user3,user4,user5,multiSig,...accounts] = accountsData;
  if(Contract.network == 'development') {
    manager = '0xA5Fe0dEda5E1a0FCc34B02B5BE6857e30C9023fE';
    user1 = '0x4dc884abb17d11de6102fc1ef2cee0ebd31df248';
    user2 = '0xbaB73be18f0739Cd3160FBbc5E140EA3c940F5D6';
    user3 = '0x158956caa3249F39774aD9377c22eA53C0ba2236';
    user4 = '0x4e49f84f5dbaa8d994a4b7b198842deb0a5a58ec';
    user5 = '0x27f41ffcd787aea219eb9cfd2418bc0551317c09';
    multiSig = '0x220cD6eBB62F9aD170C9bf7984F22A3afc023E7d';
  }

  before(async () => {
    Contract.log('Test sale');

    ShipCoin  = await Contract.build('ShipCoin');
    ShipCoinCurrency  = await Contract.build('ShipCoinCurrency');
    ShipCoinStorage   = await Contract.build('ShipCoinStorage');
    ShipCoinCrowdsale = await Contract.build('ShipCoinCrowdsale');

    await getCurrency().then(currency => {
      eth=currency.eth+0.01;
      btc=currency.btc+0.01;
      eur=currency.eur+0.01;
      amb=currency.amb+0.01;
    });

    console.log(`--------------------------- sale test --------------------------`);
    console.log(` ShipCoinStorage   | ${ShipCoinStorage.address}`);
    console.log(` ShipCoinCurrency  | ${ShipCoinCurrency.address}`);
    console.log(` ShipCoinCrowdsale | ${ShipCoinCrowdsale.address}`);
    console.log(` Manager           | ${manager}`);
    console.log(` MultiSig          | ${multiSig}`);
    console.log(` ETH               | ${eth.toFixed(2)}$  +0.01$  in cents(${usdToCents(eth)})`);
    console.log(` BTC               | ${btc.toFixed(2)}$ +0.01$  in cents(${usdToCents(btc)})`);
    console.log(` EUR               | ${eur.toFixed(2)}$    +0.01$  in cents(${usdToCents(eur)})`);
    console.log(` AMB               | ${amb.toFixed(2)}$    +0.01$  in cents(${usdToCents(amb)})`);
    console.log(`----------------------------------------------------------------\n`);

    if(Contract.network == 'development') {
      await web3.eth.personal.unlockAccount(manager,  "123123123", 15000);
      await web3.eth.personal.unlockAccount(user1,    "123123123", 15000);
      await web3.eth.personal.unlockAccount(user2,    "123123123", 15000);
      await web3.eth.personal.unlockAccount(user3,    "123123123", 15000);
      await web3.eth.personal.unlockAccount(user4,    "123123123", 15000);
      await web3.eth.personal.unlockAccount(user5,    "123123123", 15000);
    }

    multiSigBalance = new BN(await web3.eth.getBalance(multiSig));

    usersData.user1.address = user1;
    usersData.user2.address = user2;
    usersData.user3.address = user3;
    usersData.user4.address = user4;
    usersData.user5.address = user5;
  });

  it(`The manager does not have the rights to perform the functions addWhiteList,getContributorId,getContributionInfoById`, async () => {
    assert.isFalse(await ShipCoinStorage.addWhiteList(usersData.user1.id, user1).send({ from: manager, gas: 200000 }).catch(e =>  false),'addWhiteList');
    assert.isFalse(await ShipCoinStorage.getContributorId(user1).send({ from: manager }).catch(e => false),'getContributorId');
    assert.isFalse(await ShipCoinStorage.getContributionInfoById(usersData.user1.address).send({ from: manager }).catch(e => false),'getContributionInfoById');
  });

  it(`Add rights to the manager on the functions addWhiteList,getContributorId,getContributionInfoById`, async () => {
    //addWhiteList,changeMainWallet,getContributionInfoById,getContributorId
    await ShipCoinStorage.addMultiOwnerTypes([1,3,4,5], manager).send({ from: owner, gas: 300000 });
  });

  it(`Checking the rights of the manager for the functions addWhiteList,getContributorId,getContributionInfoById`, async () => {
    assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(1, manager).call({ from: manager }),'addWhiteList');
    assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(5, manager).call({ from: manager }),'getContributorId');
    assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(4, manager).call({ from: manager }),'getContributionInfoById');
  });

  it(`Adding users to WhiteList`, async () => {
    for(let key in usersData) {
      let user = usersData[key];
      await ShipCoinStorage.addWhiteList(user.id,user.address).send({ from: manager, gas: 200000 });
    }
  });

  it(`Checking if users are added`, async () => {
    for(let key in usersData) {
      let user = usersData[key];
      assert.isTrue((await ShipCoinStorage.getContributionInfo(user.address).call({ from: manager })).active);
    }
    assert.isFalse((await ShipCoinStorage.getContributionInfo(manager).call({ from: manager })).active);
  });

  it(`Account manager functions execution getContributorId,getContributionInfoById`, async () => {
    assert.isNotNull(await ShipCoinStorage.getContributorId(user1).call({ from: manager }),'getContributorId');
    assert.isNotNull(await ShipCoinStorage.getContributionInfoById(usersData.user1.address).call({ from: manager }),'getContributionInfoById');
  });

  describe('Updating exchange rate', async () => {

    it('Checking the right to change course', async () => {
      assert.isFalse(await ShipCoinCurrency.updateCurrency("ETH",usdToCents(eth)).send({ from: manager }).catch(e => false),'ETH');
      assert.isFalse(await ShipCoinCurrency.updateCurrency("BTC",usdToCents(btc)).send({ from: manager }).catch(e => false),'BTC');
      assert.isFalse(await ShipCoinCurrency.updateCurrency("EUR",usdToCents(eur)).send({ from: manager }).catch(e => false),'EUR');
      assert.isFalse(await ShipCoinCurrency.updateCurrency("AMB",usdToCents(amb)).send({ from: manager }).catch(e => false),'AMB');
    });

    it('Adding the right to the manager to the function updateCurrency', async () => {
      await ShipCoinCurrency.addMultiOwnerType(6, manager).send({ from: owner });//updateCurrency
    });

    it(`Checking the rights of the manager for the function updateCurrency`, async () => {
      assert.isTrue(await ShipCoinCurrency.onlyMultiOwnerType(6, manager).call({ from: manager }),'updateCurrency');
    });

    it('Exchange rate update by manager', async () => {
     await ShipCoinCurrency.updateCurrency("ETH",usdToCents(eth)).send({ from: manager });
     await ShipCoinCurrency.updateCurrency("BTC",usdToCents(btc)).send({ from: manager });
     await ShipCoinCurrency.updateCurrency("EUR",usdToCents(eur)).send({ from: manager });
     await ShipCoinCurrency.updateCurrency("AMB",usdToCents(amb)).send({ from: manager });
    });

    it('Checking that the exchange rate is correctly changed by the manager', async () => {
      assert.equal(web3.utils.toBN(await ShipCoinCurrency.getCurrencyRate("ETH").call({})).toNumber(), usdToCents(eth),'ETH');
      assert.equal(web3.utils.toBN(await ShipCoinCurrency.getCurrencyRate("BTC").call({})).toNumber(), usdToCents(btc),'BTC');
      assert.equal(web3.utils.toBN(await ShipCoinCurrency.getCurrencyRate("EUR").call({})).toNumber(), usdToCents(eur),'EUR');
      assert.equal(web3.utils.toBN(await ShipCoinCurrency.getCurrencyRate("AMB").call({})).toNumber(), usdToCents(amb),'AMB');
    });

  });

  describe('ShipCoinCrowdsale', async () => {

    it('Adding the right ShipCoinCrowdsale', async () => {
      //addPay,editPay,addPreSaleBonus,editPreSaleBonus
      await ShipCoinCurrency.addMultiOwnerTypes([2,3,4,5], ShipCoinCrowdsale.address).send({ from: owner, gas: 300000 });

      //getContributorId,getContributorAddressById,getContributorIndexes,checkUserIdExists,addPayment
      //editPaymentByUserId,getUserPaymentById,processPreSaleBonus,reCountUserPreSaleBonus,
      //setReceivedCoin,setRefund,refundPay,refundETHContributors,refundPaymentByUserId,changeSupportChangeMainWallet
      await ShipCoinStorage.addMultiOwnerTypes([5,6,7,8,9,10,11,12,13,15,16,18,19,20,21], ShipCoinCrowdsale.address).send({
        from: owner,
        gas: 500000
      });
    });

    it('Verify the right ShipCoinCrowdsale', async () => {
      assert.isTrue(await ShipCoinCurrency.onlyMultiOwnerType(2, ShipCoinCrowdsale.address).call(), 'addPay');
      assert.isTrue(await ShipCoinCurrency.onlyMultiOwnerType(3, ShipCoinCrowdsale.address).call(), 'editPay');
      assert.isTrue(await ShipCoinCurrency.onlyMultiOwnerType(4, ShipCoinCrowdsale.address).call(), 'addPreSaleBonus');
      assert.isTrue(await ShipCoinCurrency.onlyMultiOwnerType(5, ShipCoinCrowdsale.address).call(), 'editPreSaleBonus');

      assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(5, ShipCoinCrowdsale.address).call(), 'getContributorId');
      assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(6, ShipCoinCrowdsale.address).call(), 'getContributorAddressById');
      assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(7, ShipCoinCrowdsale.address).call(), 'getContributorIndexes');
      assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(8, ShipCoinCrowdsale.address).call(), 'checkUserIdExists');
      assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(9, ShipCoinCrowdsale.address).call(), 'addPayment');
      assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(10, ShipCoinCrowdsale.address).call(), 'editPaymentByUserId');
      assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(11, ShipCoinCrowdsale.address).call(), 'getUserPayment');
      assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(12, ShipCoinCrowdsale.address).call(), 'processPreSaleBonus');
      assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(13, ShipCoinCrowdsale.address).call(), 'reCountUserPreSaleBonus');
      assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(15, ShipCoinCrowdsale.address).call(), 'setReceivedCoin');
      assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(16, ShipCoinCrowdsale.address).call(), 'setRefund');
      assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(18, ShipCoinCrowdsale.address).call(), 'refundPay');
      assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(19, ShipCoinCrowdsale.address).call(), 'refundETHContributors');
      assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(20, ShipCoinCrowdsale.address).call(), 'refundPaymentByUserId');
      assert.isTrue(await ShipCoinStorage.onlyMultiOwnerType(21, ShipCoinCrowdsale.address).call(), 'changeSupportChangeMainWallet');
    });

    it('User balance user1,user2,user3 > 1 ETH', async () => {
      assert.isAbove(parseFloat(web3.utils.fromWei(web3.utils.toBN(await web3.eth.getBalance(usersData.user1.address)), 'ether')), 1);
      assert.isAbove(parseFloat(web3.utils.fromWei(web3.utils.toBN(await web3.eth.getBalance(usersData.user2.address)), 'ether')), 1);
      assert.isAbove(parseFloat(web3.utils.fromWei(web3.utils.toBN(await web3.eth.getBalance(usersData.user3.address)), 'ether')), 1);
    });

    it('Check, status = 0', async () => {
      assert.equal(await ShipCoinCrowdsale.state().call(), 0);
    });

    it('Checking that you can not send eth until the contract is up and running', async () => {
      assert.isFalse(await web3.eth.sendTransaction({
        from: usersData.user1.address,
        to: ShipCoinCrowdsale.address,
        value: web3.utils.toWei('5'), // 5 ETH
        gas: 600000
      }).catch(e => false));
    });

    it('Start PreSale', async () => {
      await ShipCoinCrowdsale.startPreSale().send({from: owner});
    });

    it('Checking the status of the sail = 1', async () => {
      assert.equal(await ShipCoinCrowdsale.state().call(), 1);
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
              totalUserETHPayment += parseInt(paymentValue);
            } catch (e) {
              assert.ifError(e);
            }
          }
        }
      }
      userDataCurrencyPayment['ETH'] = totalUserETHPayment;
    });

    it(`Contract balance ETH`, async () => {
      assert.equal(web3.utils.fromWei(web3.utils.toBN(await web3.eth.getBalance(ShipCoinCrowdsale.address)), 'ether'), web3.utils.fromWei(web3.utils.toBN(totalUserETHPayment), 'ether'));
    });

    it('Payment in btc,usd,eur,amb', async () => {
      for (let key in usersData) {
        let user = usersData[key];
        if (user.payments && user.payments.NOETH) {
          for (let payment of user.payments.NOETH) {
            if (!userDataCurrencyPayment.hasOwnProperty(payment.ticker)) {
              userDataCurrencyPayment[payment.ticker] = 0;
            }
            try {
              await ShipCoinCrowdsale.addPay(payment.ticker, payment.value, user.id, payment.pId, 0).send({
                from: owner,
                gas: 600000
              });
              userDataCurrencyPayment[payment.ticker] += parseInt(payment.value);
            } catch (e) {
              assert.ifError(e);
            }
          }
        }
      }
    });

    it('Refund payment in pre-sale', async () => {
      let user = usersData.user1;
      let payId = user.payments.NOETH[3].pId;
      await checkRefundPay(user.id,payId)(owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale);
      userDataCurrencyPayment[user.payments.NOETH[3].ticker] -= parseInt(user.payments.NOETH[3].value);
    });

    it('Verify users billing information', async () => {
      let totalUserUsdAbsRaisedInCents = 0;
      let contractCurrencyUsdRaised = 0;
      let totalUserCurrencyPayment = {};
      let contractCurrencyPayment = {};

      for (let key in usersData) {
        let user = usersData[key];
        let userPaymentInfo = await getUserInfo(ShipCoinStorage,user.id,false);

        for (let key in userPaymentInfo.payInCurrency) {
          if (!totalUserCurrencyPayment.hasOwnProperty(key)) {
            totalUserCurrencyPayment[key] = 0;
          }
          totalUserCurrencyPayment[key] += parseInt(userPaymentInfo.payInCurrency[key]);
        }

        totalUserUsdAbsRaisedInCents += parseInt(userPaymentInfo.usdAbsRaisedInCents);
      }

      let contractUsdAbsRaisedInCents = await ShipCoinCurrency.getUsdAbsRaisedInCents().call();
      let contractCurrencyPaymentData = JSON.parse(await ShipCoinCurrency.getCurrencyData().call());

      for (let key in contractCurrencyPaymentData) {
        let currency = contractCurrencyPaymentData[key];
        contractCurrencyUsdRaised += parseInt(currency.usdRaised);
        if (currency.counter > 0) {
          if (!contractCurrencyPayment.hasOwnProperty(key)) {
            contractCurrencyPayment[key] = 0;
          }
          contractCurrencyPayment[key] += parseInt(currency.raised);
        }
      }

      assert.equal(contractUsdAbsRaisedInCents, totalUserUsdAbsRaisedInCents, 'contract usdAbsRaisedInCents');
      assert.equal(contractCurrencyUsdRaised, totalUserUsdAbsRaisedInCents, 'users usdAbsRaisedInCents');
      assert.deepEqual(userDataCurrencyPayment, contractCurrencyPayment, 'contract currencyData');
      assert.deepEqual(userDataCurrencyPayment, totalUserCurrencyPayment, 'users payInCurrency');

    });

  });

  describe('Changing a user payment in BTC', async () => {
    it('Nothing changed', async () => {
      await checkEditPay(usersData.user1.id, 1, 100000000, 0, 0)(owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale);
    });
    it('Change of payment amount 2 BTC', async () => {
      await checkEditPay(usersData.user1.id, 1, 200000000, 0, 0)(owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale);
    });
    it('The change in the dollar exchange rate 2000$', async () => {
      await checkEditPay(usersData.user1.id, 1, 200000000, 200000, 0)(owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale);
    });
    it('Change of percent of bonuses 20%', async () => {
      await checkEditPay(usersData.user1.id, 1, 200000000, 200000, 20)(owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale);
    });
    it('Change all 3 BTC,2200$,10%', async () => {
      await checkEditPay(usersData.user1.id, 1, 300000000, 220000, 10)(owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale);
    });
  });

  describe('Changing a user payment in ETH', async () => {
    let paymentEthId = null;
    let uId = usersData.user1.id;
    let oldPaymentValue = 0;
    before(async () => {
      let userData = await getUserInfo(ShipCoinStorage,uId);
      for (let payId in userData.paymentInfo) {
        if(userData.paymentInfo[payId].pType === 'ETH') {
          paymentEthId = payId;
          oldPaymentValue = userData.paymentInfo[payId].payValue;
          break;
        }
      }
    });

    it('Nothing changed', async () => {
      await checkEditPay(uId, paymentEthId, oldPaymentValue, 0, 0)(owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale);
    });
    it('Change of payment amount to 10 ETH', async () => {
      await checkEditPay(uId, paymentEthId, web3.utils.toWei('10'), 0, 0)(owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale);
    });
    it('The change in the dollar exchange rate 850$', async () => {
      await checkEditPay(uId, paymentEthId, web3.utils.toWei('10'), 85000, 0)(owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale);
    });
    it('Change of percent of bonuses 5%', async () => {
      await checkEditPay(uId, paymentEthId, web3.utils.toWei('10'), 85000, 5)(owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale);
    });
    it('Change all 11ETH,857.51$,10%', async () => {
      await checkEditPay(uId, paymentEthId, web3.utils.toWei('11'), 85751, 10)(owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale);
    });
   });

  describe('Crowdsale softcap', async () => {
    it('Reach softcap', async () => {
      try {
        await ShipCoinCrowdsale.addPay('USD', 530000000, 10, 100, 0).send({from:owner,gas:600000});
        let { checkSoftCapAchieved, getETHBalance } = await ShipCoinCrowdsale.getContractStatic();

        assert.isTrue(checkSoftCapAchieved,'checkSoftCapAchieved');
        assert.isFalse(await ShipCoinCrowdsale.activeSoftCapAchieved().send({ from: owner, gas: 100000 }).catch(e =>  false),'activeSoftCapAchieved');

        await ShipCoin.transfer(ShipCoinCrowdsale.address, web3.utils.toWei('600000000')).send({ from: owner, gas: 100000 });

        await ShipCoinCrowdsale.activeSoftCapAchieved().send({ from: owner, gas: 200000 });

        if(getETHBalance > 0) {
          await ShipCoinCrowdsale.getEther().send({from: owner, gas: 200000});
          let newMultiSigBalance = new BN(await web3.eth.getBalance(multiSig));
          multiSigBalance = multiSigBalance.add(new BN(getETHBalance).div(new BN(2)));
          assert.equal(multiSigBalance.toString(), newMultiSigBalance.toString(), 'checkMultiSigWallet');
        }
      } catch (e) {
        console.error('Crowdsale softcap error:',e);
        assert.throw(e);
      }
    });

    it('Refund payment before pre-sale bonusafter activeSoftCapAchieved', async () => {
      let user = usersData.user1;
      let payId = user.payments.NOETH[4].pId;
      await checkRefundPay(user.id,payId)(owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale);
    });

    it('Check users presale bonus', async () => {
      let preSaleBonus = await ShipCoinCrowdsale.getPreSaleBonusPercent().call();
      let ShipCoinCurrencyData = await ShipCoinCurrency.getContractStatic();

      let beforeUserData = await getAllUsersInfo(ShipCoinStorage);
      let minReachUsdPayInCents = await ShipCoinCrowdsale.getMinReachUsdPayInCents().call();

      let allBonusToken = new BN('0');
      for(let key in beforeUserData) {
        if(!beforeUserData[key].refund) {
          let bonusToken = new BN(beforeUserData[key].tokenWithoutBonus.mul(new BN(preSaleBonus)).div(new BN(100)));
          allBonusToken = allBonusToken.add(bonusToken);
          beforeUserData[key].totalToken = beforeUserData[key].totalToken.add(bonusToken).toString();
          beforeUserData[key].tokenBonus = bonusToken.toString();
          beforeUserData[key].tokenWithoutBonus = beforeUserData[key].tokenWithoutBonus.toString();
          beforeUserData[key].usdAbsRaisedInCents = beforeUserData[key].usdAbsRaisedInCents.toString();
          beforeUserData[key].preSaleReceivedBonus = bonusToken.toString();
        }
      }

      assert.equal(await ShipCoinCrowdsale.state().call(), 1, 'state == 1');

      try {
        await ShipCoinCrowdsale.startCalculatePreSaleBonus().send({from: owner, gas: 50000});
        await ShipCoinCrowdsale.processSetPreSaleBonus(0, 10).send({from: owner, gas: 250000});
      } catch (e) {
        console.log('Error processSetPreSaleBonus:');
        assert.ifError(e);
      }

      assert.equal(await ShipCoinStorage.getCountNeedProcessPreSaleBonus(minReachUsdPayInCents,0,100).call(), 0,'getCountNeedProcessPreSaleBonus');

      try {
        await ShipCoinCrowdsale.startSale().send({from: owner, gas: 500000});
      } catch (e) {
        console.log('Error startSale');
        assert.ifError(e);
      }
      assert.equal(await ShipCoinCrowdsale.state().call(), 3,'state');

      let afterUserData = await getAllUsersInfo(ShipCoinStorage, true);

      let { getCoinRaisedInWei, getCoinRaisedBonusInWei } = await ShipCoinCurrency.getContractStatic();

      assert.deepEqual(beforeUserData,afterUserData, 'deep equal userData');
      assert.equal(new BN(ShipCoinCurrencyData.getCoinRaisedInWei).add(allBonusToken), getCoinRaisedInWei,'getCoinRaisedInWei');
      assert.equal(new BN(ShipCoinCurrencyData.getCoinRaisedBonusInWei).add(allBonusToken), getCoinRaisedBonusInWei,'getCoinRaisedBonusInWei');
    });

    it('Check change userPayment and reCalc PreSale bonus', async () => {
      let uId = usersData.user3.id;
      await checkEditPay(uId, 5, 500000, 0, 0)(owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale);
    });

  });

  describe('Sale', async () => {
    let startSale;
    let payType = 'ETH';

    before(async () => {
      let { startSaleDate } = await ShipCoinCrowdsale.getContractStatic();
      startSale = parseInt(startSaleDate);
      if(Contract.network === 'develop') {
        await increaseTimeTo(startSaleDate);
      } else {
        await ShipCoinCrowdsale.setStartSaleDate(moment(((await latestTime()) * 1000)).unix()).send({ from: owner });
      }
    });

    it('State = SALE', async () => {
      assert.equal(await ShipCoinCrowdsale.state().call(), 3,'state');
    });

    it('Bonus 20% for the first 48 hours | 0 - 2 days', async () => {
      assert.equal(await ShipCoinCrowdsale.getCurrentDayBonus().call(), 20);
      await checkPaySale(usersData.user4,web3.utils.toWei('5'),payType,20)(web3,owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale);
      await checkPaySale(usersData.user5,530000,'USD',20,10)(web3,owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale);
    });

    if(Contract.network === 'develop') {
      it('Bonus 15% for weeks 1-2 starting from day 3 | 3 - 14 days', async () => {
        await increaseTimeTo(startSale + timeIncrease.days(3));
        assert.equal(await ShipCoinCrowdsale.getCurrentDayBonus().call(), 15);
        await checkPaySale(usersData.user4, web3.utils.toWei('5'), payType, 15)(web3, owner, ShipCoinStorage, ShipCoinCurrency, ShipCoinCrowdsale);
        await checkPaySale(usersData.user5, 10000000, 'BTC', 15, 11)(web3, owner, ShipCoinStorage, ShipCoinCurrency, ShipCoinCrowdsale);
      });

      it('Bonus 10% for weeks 3-4 | 15 - 28 days', async () => {
        await increaseTimeTo(startSale + timeIncrease.days(15));
        assert.equal(await ShipCoinCrowdsale.getCurrentDayBonus().call(), 10);
        await checkPaySale(usersData.user4, web3.utils.toWei('5'), payType, 10)(web3, owner, ShipCoinStorage, ShipCoinCurrency, ShipCoinCrowdsale);
        await checkPaySale(usersData.user5, 10000, 'EUR', 10, 12)(web3, owner, ShipCoinStorage, ShipCoinCurrency, ShipCoinCrowdsale);
        await checkPaySale(usersData.user5, web3.utils.toWei('10000'), 'AMB', 10, 12)(web3, owner, ShipCoinStorage, ShipCoinCurrency, ShipCoinCrowdsale);
      });

      it('Bonus 5% for weeks 5-6 | 29 - 42 days', async () => {
        await increaseTimeTo(startSale + timeIncrease.days(29));
        assert.equal(await ShipCoinCrowdsale.getCurrentDayBonus().call(), 5);
        await checkPaySale(usersData.user4, web3.utils.toWei('5'), payType, 5)(web3, owner, ShipCoinStorage, ShipCoinCurrency, ShipCoinCrowdsale);
        await checkPaySale(usersData.user5, 25000, 'USD', 5, 13)(web3, owner, ShipCoinStorage, ShipCoinCurrency, ShipCoinCrowdsale);
      });

      it('Bonus 0 for weeks 7-8 | 43 - 56 days', async () => {
        await increaseTimeTo(startSale + timeIncrease.days(43));
        assert.equal(await ShipCoinCrowdsale.getCurrentDayBonus().call(), 0);
        await checkPaySale(usersData.user4, web3.utils.toWei('5'), payType, 0)(web3, owner, ShipCoinStorage, ShipCoinCurrency, ShipCoinCrowdsale);
        await checkPaySale(usersData.user5, 12000, 'USD', 0, 14)(web3, owner, ShipCoinStorage, ShipCoinCurrency, ShipCoinCrowdsale);
      });
    }

    after(async () => {
      let beforeUserdata = await getUserInfo(ShipCoinStorage,usersData.user4.id);
      await ShipCoinCrowdsale.reCountUserPreSaleBonus(usersData.user4.id).send({from:owner});
      let afterUserdata = await getUserInfo(ShipCoinStorage,usersData.user4.id);
      assert.deepEqual(beforeUserdata,afterUserdata);
    });

    it('Sale state set end', async () => {
      assert.equal(await ShipCoinCrowdsale.state().call(), 3,'state');
      await ShipCoinCrowdsale.saleSetEnded().send({ from: owner });
      assert.equal(await ShipCoinCrowdsale.state().call(), 4,'state');
    });

    it('Get ETH after contract sale end', async () => {
      assert.isFalse(await ShipCoinCrowdsale.getEther().send({ from: user1.address, gas: 200000 }).catch(e =>  false),'checkGetEtherPermission');
      let { getETHBalance } = await ShipCoinCrowdsale.getContractStatic();
      if(getETHBalance > 0) {
        await ShipCoinCrowdsale.getEther().send({from: owner, gas: 200000});
        let newMultiSigBalance = new BN(await web3.eth.getBalance(multiSig));

        assert.equal(multiSigBalance.add(new BN(getETHBalance).div(new BN(2))).toString(), newMultiSigBalance.toString(), 'checkMultiSigWallet');
      }
      assert.isFalse(await ShipCoinCrowdsale.getEther().send({ from: owner, gas: 200000 }).catch(e =>  false),'checkGetEther');
    });

    it('Refund payment', async () => {
      let user = usersData.user2;
      let payId = user.payments.NOETH[1].pId;

      await checkRefundPay(user.id,payId)(owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale);
    });

    it('Get contributor SHPC', async () => {
      assert.equal(await ShipCoinStorage.getCountNeedSendSHPC(0,100).call(), 5);

      let { unfreezeRefundPreSale, unfreezeRefundAll } = await ShipCoinCrowdsale.getContractStatic();

      // No PreSale bonus user
      let user = usersData.user1;
      let userInfo = await ShipCoinStorage.getContributionInfoById(user.id).call();
      let beforeCoinBalance = new BN(await ShipCoinCrowdsale.getCoinBalance().call());

      let curTime = await latestTime();
      if(curTime < unfreezeRefundPreSale || curTime < unfreezeRefundAll) {
        assert.isFalse(await ShipCoinCrowdsale.getCoins().send({ from: user.address, gas: 300000 }).catch(e =>  false),'checkFailGetSHPC 1');
        assert.equal(await ShipCoinStorage.getCountNeedSendSHPC(0,100).call(), 5);
        await ShipCoinCrowdsale.sendSHPCtoContributors(0, 10).send({ from: owner, gas: 600000 });
        assert.equal(await ShipCoinStorage.getCountNeedSendSHPC(0,100).call(), 5);
      }

      //let snapshotId = await createSnapshot();
      if(Contract.network === 'develop') {
        await increaseTimeTo(curTime + timeIncrease.days(13));
      } else {
        await ShipCoinCrowdsale.setUnfreezeRefund(moment(curTime * 1000).unix()).send({ from: owner });
      }

      try {
        await ShipCoinCrowdsale.getCoins().send({from: user.address, gas: 300000});
      } catch (e) {
        console.error('Error getCoins:');
        assert.throw(e);
      }
      let afterCoinBalance = new BN(await ShipCoinCrowdsale.getCoinBalance().call());
      let userInfoAfter = await ShipCoinStorage.getContributionInfoById(user.id).call();

      assert.equal(beforeCoinBalance.sub(new BN(userInfo.totalToken)).toString(),afterCoinBalance.toString());
      assert.isTrue(userInfoAfter.receivedCoins);
      assert.equal(await ShipCoinStorage.getCountNeedSendSHPC(0,100).call(), 4);
      //await revertSnapshot(snapshotId);

      // have pre Sale bonus get SHPC before sale user
      user = usersData.user4;
      userInfo = await ShipCoinStorage.getContributionInfoById(user.id).call();
      beforeCoinBalance = new BN(await ShipCoinCrowdsale.getCoinBalance().call());

      curTime = await latestTime();

      if(curTime < unfreezeRefundPreSale || curTime < unfreezeRefundAll) {
        assert.isFalse(await ShipCoinCrowdsale.getCoins().send({ from: user.address, gas: 300000 }).catch(e =>  false),'checkFailGetSHPC 3');
        assert.equal(await ShipCoinStorage.getCountNeedSendSHPC(0,100).call(), 4);
      }

      //snapshotId = await createSnapshot();

      if(Contract.network === 'develop') {
        await increaseTimeTo(curTime + timeIncrease.days(1));
      } else {
        try {
          await ShipCoinCrowdsale.setStartSaleDate(moment(curTime * 1000).subtract(2, 'days').unix()).send({from: owner});
          await ShipCoinCrowdsale.setUnfreezeRefund(moment(curTime * 1000).subtract(1, 'days').unix()).send({from: owner});
        } catch (e) {
          console.error('Error setUnfreezeRefund');
          assert.throw(e);
        }
      }

      try {
        await ShipCoinCrowdsale.getCoins().send({from: user.address, gas: 500000});
      } catch (e) {
        console.error('Error getCoins');
        assert.throw(e);
      }
      afterCoinBalance = new BN(await ShipCoinCrowdsale.getCoinBalance().call());
      userInfoAfter = await ShipCoinStorage.getContributionInfoById(user.id).call();

      assert.equal(beforeCoinBalance.sub(new BN(userInfo.totalToken)).toString(),afterCoinBalance.toString());
      assert.isTrue(userInfoAfter.receivedCoins);
      assert.equal(await ShipCoinStorage.getCountNeedSendSHPC(0,100).call(), 3);
      //await revertSnapshot(snapshotId);

    });

    it('Send SHPC to contributors', async () => {
      let beforeCoinBalance = new BN(await ShipCoinCrowdsale.getCoinBalance().call());

      assert.equal(await ShipCoinStorage.getCountNeedSendSHPC(0,100).call(), 3);

      let allUsersReceivedCoins = true;

      let totalUserTokens = new BN('0');
      let allUsersData = await getAllUsers(ShipCoinStorage);

      for(let key in allUsersData) {
        if(!allUsersData[key].receivedCoins) {
          totalUserTokens = totalUserTokens.add(new BN(allUsersData[key].totalToken));
        }
      }
      try {
        await ShipCoinCrowdsale.sendSHPCtoContributors(0, 10).send({from: owner, gas: 600000})
      } catch (e) {
        console.error('Error sendSHPCtoContributors:');
        assert.throw(e);
      }

      assert.equal(await ShipCoinStorage.getCountNeedSendSHPC(0,100).call(), 0);

      let afterCoinBalance = new BN(await ShipCoinCrowdsale.getCoinBalance().call());

      assert.equal(beforeCoinBalance.sub(totalUserTokens).toString(),afterCoinBalance.toString());

      let allUsersDataAfter = await getAllUsers(ShipCoinStorage);
      for(let key in allUsersDataAfter) {
        if(!allUsersDataAfter[key].receivedCoins) {
          allUsersReceivedCoins = false;
          break;
        }
      }

      assert.isTrue(allUsersReceivedCoins);

    });

  });

});
