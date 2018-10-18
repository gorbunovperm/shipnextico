import fetch  from 'node-fetch';
import _get   from 'lodash/get';
import _defaultsDeep  from 'lodash/defaultsDeep';
import Web3 from 'web3';
import { inspect } from 'util';
import { usdToCents } from '../lib';
import { readFile } from 'fs';
import { diff } from "./index";

const BN = Web3.utils.BN;

// source: https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/test/helpers/increaseTime.js
export function increaseTime(duration) {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(
      {
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [duration],
        id: id
      },
      err1 => {
        if (err1) return reject(err1);

        web3.currentProvider.sendAsync(
          {
            jsonrpc: "2.0",
            method: "evm_mine",
            id: id + 1
          },
          (err2, res) => {
            return err2 ? reject(err2) : resolve(res);
          }
        );
      }
    );
  });
}

export function createSnapshot() {
  const id = Date.now();
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(
      {
        jsonrpc: "2.0",
        method: "evm_snapshot",
        id: id
      },
      (err, res) => {
        return err ? reject(err) : resolve(res.result);
      }
    );
  });
}

export function revertSnapshot(revert_id) {
  const id = Date.now();
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(
      {
        jsonrpc: "2.0",
        method: "evm_revert",
        id: id,
        params: [revert_id],
      },
      (err, res) => {
        return err ? reject(err) : resolve(res);
      }
    );
  });
}

/**
 * Beware that due to the need of calling two separate ganache methods and rpc calls overhead
 * it's hard to increase time precisely to a target point so design your test to tolerate
 * small fluctuations from time to time.
 *
 * @param target time in seconds
 */
export async function increaseTimeTo (target) {
  let now = (await latestTime());

  if (target < now) throw Error(`Cannot increase current time(${now}) to a moment in the past(${target})`);
  let diff = target - now;
  return increaseTime(diff);
}

export async function latestTime () {
  const block = await web3.eth.getBlock('latest');
  return block.timestamp;
}

export const timeIncrease = {
  seconds: function (val) { return val; },
  minutes: function (val) { return val * this.seconds(60); },
  hours: function (val) { return val * this.minutes(60); },
  days: function (val) { return val * this.hours(24); },
  weeks: function (val) { return val * this.days(7); },
  years: function (val) { return val * this.days(365); },
};

export function timeTravel(time) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: "2.0",
      method: "evm_increaseTime",
      params: [time], // 86400 is num seconds in day
      id: new Date().getTime()
    }, (err, result) => {
      if(err){ return reject(err) }
      return resolve(result)
    });
  })
}

export function mineBlock() {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: "2.0",
      method: "evm_mine"
    }, (err, result) => {
      if(err){ return reject(err) }
      return resolve(result)
    });
  })
}

export function getCurrency(retInCents = false) {
  let currency = {
    eth: 0,
    btc: 0,
    eur: 0,
    inCents: function(key) {
      return usdToCents(this[key])
    }
  };

  return fetch('https://api.coinmarketcap.com/v2/ticker/?limit=5')
    .then(res => res.json())
    .then(result => {
      currency.btc = _get(result, 'data.1.quotes.USD.price', 0);
      currency.eth = _get(result, 'data.1027.quotes.USD.price', 0);
      return fetch('http://free.currencyconverterapi.com/api/v5/convert?q=EUR_USD&compact=y')
    })
    .then(res => res.json())
    .then(result => {
      currency.eur = _get(result, 'EUR_USD.val', 0);
      if(retInCents) {
        for(let key in currency) {
          currency[key] = usdToCents(currency[key]);
        }
      }
      return currency;
    })
}

export function checkEditPay(uId, payId, payValue, currencyUSD = 0, bonusPercent = 0) {
  return async function(owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale, showDetail = false) {

    let currencyData = await ShipCoinCurrency.getContractStatic();
    let crowdsaleData = await ShipCoinCrowdsale.getContractStatic();
    let userData = await getUserInfo(ShipCoinStorage,uId);

    currencyUSD = currencyUSD > 0 ? currencyUSD : userData.paymentInfo[payId].currencyUSD;
    bonusPercent = bonusPercent > 0 ? bonusPercent : userData.paymentInfo[payId].bonusPercent;

    const payType = userData.paymentInfo[payId].pType;

    let editPay = {};
    let afterEditPay = {};

    try {
      await ShipCoinCrowdsale.editPay(uId, payId, payValue, currencyUSD, bonusPercent).send({from: owner, gas: 500000});

      let raised = new BN(currencyData.getCurrencyData[payType].raised).sub(new BN(userData.paymentInfo[payId].payValue)).add(new BN(payValue));
      let usdRaisedCurrency = getUsdFromCurrency(payType, raised, currencyData);

      let payUsdAmount = getUsdFromCurrency(payType, payValue, currencyData, currencyUSD);

      let usdRaised = new BN(currencyData.getCurrencyData[payType].usdRaised).sub(new BN(userData.paymentInfo[payId].usdAbsRaisedInCents)).add(payUsdAmount);

      let {
        tokenBonus: payTokenBonus,
        tokenWithoutBonus: payTokenWithoutBonus,
        totalToken: payTotalToken
      } = calcToken(payUsdAmount, currencyData.getCoinUSDRate, bonusPercent);

      let getCoinRaisedInWei = new BN(currencyData.getCoinRaisedInWei).sub(new BN(userData.paymentInfo[payId].totalToken)).add(payTotalToken);
      let getUsdAbsRaisedInCents = new BN(currencyData.getUsdAbsRaisedInCents).sub(new BN(userData.paymentInfo[payId].usdAbsRaisedInCents)).add(payUsdAmount);
      let getCoinRaisedBonusInWei = new BN(currencyData.getCoinRaisedBonusInWei).sub(new BN(userData.paymentInfo[payId].tokenBonus)).add(payTokenBonus);

      let calculateMaxCoinIssued = new BN(crowdsaleData.calculateMaxCoinIssued).add(new BN(userData.paymentInfo[payId].totalToken)).sub(payTotalToken);

      let userPayInCurrency = new BN(userData.payInCurrency[payType]).sub(new BN(userData.paymentInfo[payId].payValue)).add(new BN(payValue));
      let userTotalToken = new BN(userData.totalToken).sub(new BN(userData.paymentInfo[payId].totalToken)).add(payTotalToken);


      let paymentUserCurrencyUSD = new BN(currencyUSD);
      let paymentUserPayValue = new BN(payValue);
      let paymentUserTotalToken = new BN(payTotalToken);
      let paymentUserTokenWithoutBonus = new BN(payTokenWithoutBonus);
      let paymentUserTokenBonus = new BN(payTokenBonus);
      let paymentUserBonusPercent = new BN(bonusPercent);

      let userTokenWithoutBonus = new BN(userData.tokenWithoutBonus).sub(new BN(userData.paymentInfo[payId].tokenWithoutBonus)).add(payTokenWithoutBonus);
      let userTokenBonus = new BN(userData.tokenBonus).sub(new BN(userData.paymentInfo[payId].tokenBonus)).add(paymentUserTokenBonus);

      let userUsdAbsRaisedInCents = new BN(userData.usdAbsRaisedInCents).sub(new BN(userData.paymentInfo[payId].usdAbsRaisedInCents)).add(payUsdAmount);
      let paymentUserUsdAbsRaisedInCents = new BN(payUsdAmount);

      let getTotalUsdRaisedInCentsValue = getTotalUsdRaisedInCents(currencyData, payType, raised);

      let paymentInfo = {
        [payId]: {
          currencyUSD: paymentUserCurrencyUSD.toString(),
          payValue: paymentUserPayValue.toString(),
          totalToken: paymentUserTotalToken.toString(),
          tokenWithoutBonus: paymentUserTokenWithoutBonus.toString(),
          tokenBonus: paymentUserTokenBonus.toString(),
          bonusPercent: paymentUserBonusPercent.toString(),
          usdAbsRaisedInCents: paymentUserUsdAbsRaisedInCents.toString(),
          refund: userData.paymentInfo[payId].refund,
        }
      };

      let maxPayTime = 0;
      if(crowdsaleData.state != 2) {
        maxPayTime = crowdsaleData.startSaleDate;
      }

      let userPreSaleReceivedBonus = new BN('0');

      if(crowdsaleData.state > 1) {
        let { beforePreSaleBonusToken, bonusPreSaleToken, preSaleReceivedBonus } = reCountUserPreSaleBonus({
          preSaleReceivedBonus: userData.preSaleReceivedBonus,
          usdAbsRaisedInCents: userUsdAbsRaisedInCents,
          tokenWithoutBonus: userTokenWithoutBonus,
          paymentInfo: _defaultsDeep({}, paymentInfo, userData.paymentInfo)
        }, crowdsaleData.getMinReachUsdPayInCents, crowdsaleData.getPreSaleBonusPercent, maxPayTime);

        getCoinRaisedInWei = getCoinRaisedInWei.sub(beforePreSaleBonusToken).add(bonusPreSaleToken);
        getCoinRaisedBonusInWei = getCoinRaisedBonusInWei.sub(beforePreSaleBonusToken).add(bonusPreSaleToken);
        calculateMaxCoinIssued = calculateMaxCoinIssued.add(beforePreSaleBonusToken).sub(bonusPreSaleToken);

        userTotalToken = userTotalToken.sub(beforePreSaleBonusToken).add(bonusPreSaleToken);
        userTokenBonus = userTokenBonus.sub(beforePreSaleBonusToken).add(bonusPreSaleToken);
        userPreSaleReceivedBonus = preSaleReceivedBonus;
      }

      editPay = {
        currencyData: {
          getTotalUsdRaisedInCents: getTotalUsdRaisedInCentsValue.toString(),
          getCurrencyData: {
            [payType]: {
              'raised': raised.toString(),
              'usdRaised': usdRaised.toString(),
              'usdRaisedCurrency': usdRaisedCurrency.toString(),
            }
          },
          getCoinRaisedInWei: getCoinRaisedInWei.toString(),
          getUsdAbsRaisedInCents: getUsdAbsRaisedInCents.toString(),
          getCoinRaisedBonusInWei: getCoinRaisedBonusInWei.toString(),
        },

        crowdsaleData: {
          calculateMaxCoinIssued: calculateMaxCoinIssued.toString()
        },

        userData: {
          payInCurrency: {
            [payType]: userPayInCurrency.toString()
          },
          totalToken: userTotalToken.toString(),
          tokenWithoutBonus: userTokenWithoutBonus.toString(),
          tokenBonus: userTokenBonus.toString(),
          usdAbsRaisedInCents: userUsdAbsRaisedInCents.toString(),
          preSaleReceivedBonus: userPreSaleReceivedBonus.toString(),
          paymentInfo
        }
      };

      let currencyDataNew = await ShipCoinCurrency.getContractStatic();
      let crowdsaleDataNew = await ShipCoinCrowdsale.getContractStatic();
      let userDataNew = await getUserInfo(ShipCoinStorage,uId,payId);

      afterEditPay = {
        currencyData: {
          getTotalUsdRaisedInCents: currencyDataNew.getTotalUsdRaisedInCents,
          getCurrencyData: {
            [payType]: {
              'raised': currencyDataNew.getCurrencyData[payType].raised,
              'usdRaised': currencyDataNew.getCurrencyData[payType].usdRaised.toString(),
              'usdRaisedCurrency': currencyDataNew.getCurrencyData[payType].usdRaisedCurrency.toString(),
            }
          },
          getCoinRaisedInWei: currencyDataNew.getCoinRaisedInWei,
          getUsdAbsRaisedInCents: currencyDataNew.getUsdAbsRaisedInCents,
          getCoinRaisedBonusInWei: currencyDataNew.getCoinRaisedBonusInWei,
        },

        crowdsaleData: {
          calculateMaxCoinIssued: crowdsaleDataNew.calculateMaxCoinIssued
        },

        userData: {
          payInCurrency: {
            [payType]: userDataNew.payInCurrency[payType]
          },
          totalToken: userDataNew.totalToken,
          tokenWithoutBonus: userDataNew.tokenWithoutBonus,
          tokenBonus: userDataNew.tokenBonus,
          usdAbsRaisedInCents: userDataNew.usdAbsRaisedInCents,
          preSaleReceivedBonus: userDataNew.preSaleReceivedBonus,
          paymentInfo: {
            [payId]: {
              currencyUSD: userDataNew.paymentInfo[payId].currencyUSD.toString(),
              payValue: userDataNew.paymentInfo[payId].payValue,
              totalToken: userDataNew.paymentInfo[payId].totalToken,
              tokenWithoutBonus: userDataNew.paymentInfo[payId].tokenWithoutBonus,
              tokenBonus: userDataNew.paymentInfo[payId].tokenBonus,
              bonusPercent: userDataNew.paymentInfo[payId].bonusPercent.toString(),
              usdAbsRaisedInCents: userDataNew.paymentInfo[payId].usdAbsRaisedInCents,
              refund: userDataNew.paymentInfo[payId].refund
            }
          }
        }
      };

      if (showDetail) {
        console.log(inspect({currencyData, crowdsaleData, userData}, {colors: true, depth: 5}), '\n');
        console.log(inspect({currencyDataNew, crowdsaleDataNew, userDataNew}, {colors: true, depth: 5}), '\n');
        console.log(inspect({editPay, afterEditPay}, {colors: true, depth: 5}), '\n');
      }

    } catch (e) {
      console.error(e);
      assert.throw(e);
    }

    return assert.deepEqual(editPay,afterEditPay);
  }
}

export function checkRefundPay(uId, payId) {
  return async function(owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale, showDetail = false) {

    let beforeData, afterData, currencyData, crowdsaleData;

    let userData = await getUserInfo(ShipCoinStorage,uId);

    let payType = userData.paymentInfo[payId].pType;

    try {

      currencyData = await ShipCoinCurrency.getContractStatic();
      crowdsaleData = await ShipCoinCrowdsale.getContractStatic();

      let raised = new BN(currencyData.getCurrencyData[payType].raised).sub(new BN(userData.paymentInfo[payId].payValue));
      let usdRaised = new BN(currencyData.getCurrencyData[payType].usdRaised).sub(new BN(userData.paymentInfo[payId].usdAbsRaisedInCents));
      let usdRaisedCurrency = getUsdFromCurrency(payType, raised, currencyData);

      let userPayInCurrency = new BN(userData.payInCurrency[payType]).sub(new BN(userData.paymentInfo[payId].payValue));
      let userTotalToken = new BN(userData.totalToken).sub(new BN(userData.paymentInfo[payId].totalToken));
      let userTokenWithoutBonus = new BN(userData.tokenWithoutBonus).sub(new BN(userData.paymentInfo[payId].tokenWithoutBonus));
      let userTokenBonus = new BN(userData.tokenBonus).sub(new BN(userData.paymentInfo[payId].tokenBonus));
      let userUsdAbsRaisedInCents = new BN(userData.usdAbsRaisedInCents).sub(new BN(userData.paymentInfo[payId].usdAbsRaisedInCents));

      let getCoinRaisedInWei = new BN(currencyData.getCoinRaisedInWei).sub(new BN(userData.paymentInfo[payId].totalToken));
      let getUsdAbsRaisedInCents = new BN(currencyData.getUsdAbsRaisedInCents).sub(new BN(userData.paymentInfo[payId].usdAbsRaisedInCents));
      let getCoinRaisedBonusInWei = new BN(currencyData.getCoinRaisedBonusInWei).sub(new BN(userData.paymentInfo[payId].tokenBonus));

      let getTotalUsdRaisedInCentsValue = getTotalUsdRaisedInCents(currencyData, payType, raised);

      let maxPayTime = 0;
      if (crowdsaleData.state != 2) {
        maxPayTime = crowdsaleData.startSaleDate;
      }

      let userPreSaleReceivedBonus = new BN('0');
      userData.paymentInfo[payId].refund = true;
      if (crowdsaleData.state > 1) {
        let {beforePreSaleBonusToken, bonusPreSaleToken, preSaleReceivedBonus} = reCountUserPreSaleBonus({
          preSaleReceivedBonus: userData.preSaleReceivedBonus,
          usdAbsRaisedInCents: userUsdAbsRaisedInCents,
          tokenWithoutBonus: userTokenWithoutBonus,
          paymentInfo: userData.paymentInfo
        }, crowdsaleData.getMinReachUsdPayInCents, crowdsaleData.getPreSaleBonusPercent, maxPayTime);

        getCoinRaisedInWei = getCoinRaisedInWei.sub(beforePreSaleBonusToken).add(bonusPreSaleToken);
        getCoinRaisedBonusInWei = getCoinRaisedBonusInWei.sub(beforePreSaleBonusToken).add(bonusPreSaleToken);

        userTotalToken = userTotalToken.sub(beforePreSaleBonusToken).add(bonusPreSaleToken);
        userTokenBonus = userTokenBonus.sub(beforePreSaleBonusToken).add(bonusPreSaleToken);
        userPreSaleReceivedBonus = preSaleReceivedBonus;
      }

      beforeData = {
        userData: {
          payInCurrency: {
            [payType]: userPayInCurrency.toString()
          },
          totalToken: userTotalToken.toString(),
          tokenWithoutBonus: userTokenWithoutBonus.toString(),
          tokenBonus: userTokenBonus.toString(),
          usdAbsRaisedInCents: userUsdAbsRaisedInCents.toString(),
          preSaleReceivedBonus: userPreSaleReceivedBonus.toString(),
          paymentInfo: {
            [payId]: { refund: true }
          }
        },
        currencyData: {
          getTotalUsdRaisedInCents: getTotalUsdRaisedInCentsValue.toString(),
          getCurrencyData: {
            [payType]: {
              'raised': raised.toString(),
              'usdRaised': usdRaised.toString(),
              'usdRaisedCurrency': usdRaisedCurrency.toString(),
            }
          },
          getCoinRaisedInWei: getCoinRaisedInWei.toString(),
          getUsdAbsRaisedInCents: getUsdAbsRaisedInCents.toString(),
          getCoinRaisedBonusInWei: getCoinRaisedBonusInWei.toString(),
        },
      };

      await ShipCoinCrowdsale.refundPay(uId, payId).send({from: owner, gas: 900000});

      let userDataNew = await getUserInfo(ShipCoinStorage,uId,payId);
      let currencyDataNew = await ShipCoinCurrency.getContractStatic();


      afterData = {
        userData: {
          payInCurrency: {
            [payType]: userDataNew.payInCurrency[payType]
          },
          totalToken: userDataNew.totalToken,
          tokenWithoutBonus: userDataNew.tokenWithoutBonus,
          tokenBonus: userDataNew.tokenBonus,
          usdAbsRaisedInCents: userDataNew.usdAbsRaisedInCents,
          preSaleReceivedBonus: userDataNew.preSaleReceivedBonus,
          paymentInfo: {
            [payId]: {
              refund: userDataNew.paymentInfo[payId].refund
            }
          }
        },
        currencyData: {
          getTotalUsdRaisedInCents: currencyDataNew.getTotalUsdRaisedInCents,
          getCurrencyData: {
            [payType]: {
              'raised': currencyDataNew.getCurrencyData[payType].raised,
              'usdRaised': currencyDataNew.getCurrencyData[payType].usdRaised.toString(),
              'usdRaisedCurrency': currencyDataNew.getCurrencyData[payType].usdRaisedCurrency.toString(),
            }
          },
          getCoinRaisedInWei: currencyDataNew.getCoinRaisedInWei,
          getUsdAbsRaisedInCents: currencyDataNew.getUsdAbsRaisedInCents,
          getCoinRaisedBonusInWei: currencyDataNew.getCoinRaisedBonusInWei,
        },
      };

      if (showDetail) {
        console.log(inspect({currencyData, userData}, {colors: true, depth: 5}), '\n');
        console.log(inspect({currencyDataNew, userDataNew}, {colors: true, depth: 5}), '\n');
        console.log(inspect({beforeData, afterData}, {colors: true, depth: 5}), '\n');
      }

    } catch (e) {
      console.error('Error checkRefundPay:',e);
      assert.throw(e);
    }
    //console.log(inspect(diff(beforeData,afterData,true), { colors: true, depth: 5 }));
    assert.deepEqual(beforeData,afterData);
  }
}

export function getUsdFromCurrency(ticker, value, currencyData, usd = null) {
  return new BN(value.toString()).mul(new BN(usd || currencyData.getCurrencyData[ticker].usd)).div(new BN(currencyData.getCurrencyData[ticker].devision.toString()));
}

export function getTokenWeiFromUSD(usdInCents, coinUSDRate = 12) {
  return usdInCents.mul(new BN(Web3.utils.toWei('1'))).div(new BN(coinUSDRate));
}

export function calcToken(usdAmount, coinUSDRate, bonusPercent = 0) {
  let tokenWithoutBonus = getTokenWeiFromUSD(usdAmount,coinUSDRate);
  let tokenBonus = bonusPercent > 0 ? tokenWithoutBonus.mul(new BN(bonusPercent)).div(new BN('100')) : new BN('0');
  let totalToken = tokenWithoutBonus.add(tokenBonus);
  return { totalToken, tokenWithoutBonus, tokenBonus };
}

export function getTotalUsdRaisedInCents(currencyData, payType, _raised) {
  let totalUsdAmount = new BN('0');
  for (let key in currencyData.getCurrencyData) {
    let raised = (key == payType) ? _raised : currencyData.getCurrencyData[key].raised.toString();
    if (raised > 0) {
      totalUsdAmount = totalUsdAmount.add(getUsdFromCurrency(key,raised,currencyData));
    }
  }
  return totalUsdAmount.sub(totalUsdAmount.div(new BN('100')).mul(new BN(currencyData.getCurrVolPercent)));
}

export function reCountUserPreSaleBonus(userData, minTotalUsdAmountInCents, bonusPercent, maxPayTime) {
  let bonusPreSaleToken = new BN('0');
  let beforePreSaleBonusToken = new BN(userData.preSaleReceivedBonus);
  let preSaleReceivedBonus = new BN(userData.preSaleReceivedBonus);

  if (!beforePreSaleBonusToken.isZero()) {
    preSaleReceivedBonus = new BN('0');
  }

  if (userData.usdAbsRaisedInCents >= minTotalUsdAmountInCents) {
    if (maxPayTime > 0) {
      for (let key in userData.paymentInfo) {
        let _payment = userData.paymentInfo[key];
        if (!_payment.refund && _payment.bonusPercent == 0 && _payment.time < maxPayTime) {
          bonusPreSaleToken = bonusPreSaleToken.add(new BN(_payment.tokenWithoutBonus).mul(new BN(bonusPercent)).div(new BN('100')));
        }
      }
    } else {
      bonusPreSaleToken = new BN(userData.tokenWithoutBonus).mul(new BN(bonusPercent)).div(new BN('100'));
    }

    if (bonusPreSaleToken > 0) {
      preSaleReceivedBonus = bonusPreSaleToken;
    }
  }
  return { beforePreSaleBonusToken, bonusPreSaleToken, preSaleReceivedBonus };
}

export async function getAllUsersInfo(ShipCoinStorage, toString = false) {
  let usersCount = await ShipCoinStorage.nextContributorIndex().call();
  let users = {};
  let uId = null;
  for(let i = 0; i < usersCount; i++) {
    try {
      uId = await ShipCoinStorage.getContributorIndexes(i).call();
      let userPaymentInfo = await getUserInfo(ShipCoinStorage,uId,false);

      users[uId] = {
        usdAbsRaisedInCents: toString ? new BN(userPaymentInfo.usdAbsRaisedInCents).toString() : new BN(userPaymentInfo.usdAbsRaisedInCents),
        totalToken: toString ? new BN(userPaymentInfo.totalToken).toString() : new BN(userPaymentInfo.totalToken),
        tokenWithoutBonus: toString ? new BN(userPaymentInfo.tokenWithoutBonus).toString() : new BN(userPaymentInfo.tokenWithoutBonus),
        tokenBonus: toString ? new BN(userPaymentInfo.tokenBonus).toString() : new BN(userPaymentInfo.tokenBonus),
        preSaleReceivedBonus: toString ? new BN(userPaymentInfo.preSaleReceivedBonus).toString() : new BN(userPaymentInfo.preSaleReceivedBonus),
      };
    } catch (e) {
      console.error('Error getAllUsersInfo',e);
    }
  }

  return users;
}

export async function getAllUsers(ShipCoinStorage,getPaymentInfo = true) {
  let usersCount = await ShipCoinStorage.nextContributorIndex().call();
  let users = {};

  for(let i = 0; i < usersCount; i++) {
    let uId = await ShipCoinStorage.getContributorIndexes(i).call();
    users[uId] = await getUserInfo(ShipCoinStorage,uId,getPaymentInfo);
  }

  return users;
}

export async function getUserInfo(ShipCoinStorage,uId,getPaymentInfo = true) {

  let userData = await ShipCoinStorage.getContributionInfoById(uId).call();

  for(let key in userData) {
    if(Number.isInteger(parseInt(key))) {
      delete userData[key];
    }
  }

  if(userData.payInCurrency) {
    userData.payInCurrency = JSON.parse(userData.payInCurrency);
  }

  let paymentInfo = {};
  if(getPaymentInfo && Array.isArray(userData.paymentInfoIds) && userData.paymentInfoIds.length > 0) {
    if(typeof getPaymentInfo === 'number' && getPaymentInfo > 0) {
      paymentInfo[getPaymentInfo] = getPaymentData(await ShipCoinStorage.getUserPaymentById(uId, getPaymentInfo).call());
    } else {
      for (let k = 0; k < userData.paymentInfoIds.length; k++) {
        let paymentData = getPaymentData(await ShipCoinStorage.getUserPaymentById(uId, userData.paymentInfoIds[k]).call());
        paymentInfo[userData.paymentInfoIds[k]] = paymentData;
      }
    }
  }
  userData.paymentInfo = paymentInfo;

  return userData;
}

export function getPaymentData(paymentData) {
  for (let key in paymentData) {
    if (Number.isInteger(parseInt(key))) {
      delete paymentData[key];
    }
  }
  if (paymentData.pType) {
    paymentData.pType = Web3.utils.toAscii(paymentData.pType).replace(/\u0000/g, '');
  }
  return JSON.parse(JSON.stringify(paymentData));
}

export function checkPaySale(user, payValue, payType = 'ETH', bonusPercent = 0, payid = 0) {

  return async function(web3,owner,ShipCoinStorage,ShipCoinCurrency,ShipCoinCrowdsale) {
    let userData = await getUserInfo(ShipCoinStorage,user.id,false);
    let currencyData = await ShipCoinCurrency.getContractStatic();
    let crowdsaleData = await ShipCoinCrowdsale.getContractStatic();

    let usdAmount = getUsdFromCurrency(payType, payValue, currencyData);
    let {tokenBonus, tokenWithoutBonus, totalToken} = calcToken(usdAmount, currencyData.getCoinUSDRate, bonusPercent);
    let payInCurrency = new BN(userData.payInCurrency[payType]).add(new BN(payValue));
    let preSaleReceivedBonus = new BN(userData.preSaleReceivedBonus);

    let currencyTotalRaised = new BN(currencyData.getCurrencyData[payType].raised).add(new BN(payValue));

    let userPay = {
      userData: {
        payInCurrency: {[payType]: payInCurrency.toString()},
        totalToken: new BN(userData.totalToken).add(totalToken).toString(),
        tokenWithoutBonus: new BN(userData.tokenWithoutBonus).add(tokenWithoutBonus).toString(),
        tokenBonus: new BN(userData.tokenBonus).add(tokenBonus).toString(),
        usdAbsRaisedInCents: new BN(userData.usdAbsRaisedInCents).add(usdAmount).toString(),
        preSaleReceivedBonus: preSaleReceivedBonus.toString()
      },
      currencyData: {
        getTotalUsdRaisedInCents: getTotalUsdRaisedInCents(currencyData, payType, currencyTotalRaised).toString(),
        getCurrencyData: {
          [payType]: {
            'raised': currencyTotalRaised.toString(),
            'usdRaised': new BN(currencyData.getCurrencyData[payType].usdRaised).add(new BN(usdAmount)).toString(),
            'usdRaisedCurrency': new BN(currencyData.getCurrencyData[payType].usdRaisedCurrency).add(new BN(usdAmount)).toString(),
          }
        },
        getCoinRaisedInWei: new BN(currencyData.getCoinRaisedInWei).add(totalToken).toString(),
        getUsdAbsRaisedInCents: new BN(currencyData.getUsdAbsRaisedInCents).add(new BN(usdAmount)).toString(),
        getCoinRaisedBonusInWei: new BN(currencyData.getCoinRaisedBonusInWei).add(tokenBonus).toString(),
      },
      crowdsaleData: {
        calculateMaxCoinIssued: new BN(crowdsaleData.calculateMaxCoinIssued).sub(totalToken).toString()
      }
    };

    if (payType == 'ETH') {
      await web3.eth.sendTransaction({
        from: user.address,
        to: ShipCoinCrowdsale.address,
        value: payValue,
        gas: 600000
      })
    } else {
      await ShipCoinCrowdsale.addPay(payType, payValue, user.id, payid, 0).send({
        from: owner,
        gas: 600000
      });
    }

    let afterUserData = await getUserInfo(ShipCoinStorage,user.id,false);

    let currencyDataNew = await ShipCoinCurrency.getContractStatic();
    let crowdsaleDataNew = await ShipCoinCrowdsale.getContractStatic();

    let userPayResult = {
      userData: {
        payInCurrency: {[payType]: afterUserData.payInCurrency[payType]},
        totalToken: afterUserData.totalToken,
        tokenWithoutBonus: afterUserData.tokenWithoutBonus,
        tokenBonus: afterUserData.tokenBonus,
        usdAbsRaisedInCents: afterUserData.usdAbsRaisedInCents,
        preSaleReceivedBonus: afterUserData.preSaleReceivedBonus
      },
      currencyData: {
        getTotalUsdRaisedInCents: currencyDataNew.getTotalUsdRaisedInCents,
        getCurrencyData: {
          [payType]: {
            'raised': currencyDataNew.getCurrencyData[payType].raised,
            'usdRaised': currencyDataNew.getCurrencyData[payType].usdRaised.toString(),
            'usdRaisedCurrency': currencyDataNew.getCurrencyData[payType].usdRaisedCurrency.toString(),
          }
        },
        getCoinRaisedInWei: currencyDataNew.getCoinRaisedInWei,
        getUsdAbsRaisedInCents: currencyDataNew.getUsdAbsRaisedInCents,
        getCoinRaisedBonusInWei: currencyDataNew.getCoinRaisedBonusInWei,
      },

      crowdsaleData: {
        calculateMaxCoinIssued: crowdsaleDataNew.calculateMaxCoinIssued
      }
    };
    return assert.deepEqual(userPay, userPayResult);
    // console.log(inspect({userData,afterUserData}, { colors: true, depth: 5 }));
    // console.log(inspect(diff(userPay,userPayResult), { colors: true, depth: 5 }))
  }
}


export function makeid() {
  let text = "";
  let possible = "abcdef0123456789";

  for (let i = 0; i < 40; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}



function readFileAsync(path) {
  return new Promise((resolve, reject) => {
    readFile(path, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

export async function getDeployContractAddress() {
  let result = {};
  let deployLog = await readFileAsync(`${__dirname}/../deploy.log`);
  if(deployLog) {
    const regex = /^(\w+):\s+\[(.*)\]/gmi;
    let regexMath = deployLog.toString().match(regex);
    if (regexMath && Array.isArray(regexMath) && regexMath.length > 1) {
      let tmp = null;
      while ((tmp = regex.exec(deployLog)) !== null) {
        result[tmp[1]] = tmp[2];
      }
    }
  }
  return result;
}
