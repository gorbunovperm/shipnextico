pragma solidity ^0.4.24;

import "./base/MultiOwnable.sol";
import "./base/String.sol";
import "./lib/SafeMath.sol";
import "./ICurrency.sol";


/**
 * @title Convert eth,btc,eur to usd and storage payment from currency
 */
contract ShipCoinCurrency is ICurrency, MultiOwnable, String {
  using SafeMath for uint256;

  uint private coinUSDRate = 12; // in wei 0.12$
  uint private currVolPercent = 5; // 5% currency volatility

  // Amount of wei raised SHPC
  uint256 private coinRaisedInWei = 0;
  // Amount of cents raised USD at the time of payment
  uint private usdAbsRaisedInCents = 0;
  uint private coinRaisedBonusInWei = 0;

  struct CurrencyData {
    bool active;
    uint usd;
    uint devision;
    uint raised;
    uint usdRaised;
    uint counter;
    uint lastUpdate;
  }

  mapping(bytes32 => CurrencyData) private currencyList;

  bytes32[] private currencyTicker;

  /* Events */
  event ChangeCoinUSDRate(uint oldPrice, uint newPrice);
  event ChangeCurrVolPercent(uint oldPercent, uint newPercent);
  event ChangeCurrency();
  event AddPay();
  event EditPay();

  /**
   * @dev constructor 50328,655575,116
   * @param _ethPrice in cents example 58710 = 587.10$
   * @param _btcPrice in cents example 772301 = 7723.01$
   * @param _eurPrice in cents example 117 = 1.17$
   */
  constructor(uint _ethPrice, uint _btcPrice, uint _eurPrice) public {

    require(addUpdateCurrency("ETH", _ethPrice, (1 ether)));
    require(addUpdateCurrency("BTC", _btcPrice, (10**8)));
    require(addUpdateCurrency("USD", 1, 1));
    require(addUpdateCurrency("EUR", _eurPrice, 100));

  }

  /**
   * @dev Returns the collected amount in dollars. Summarize at the rate when the payment was made.
   */ 
  function getUsdAbsRaisedInCents() external view returns(uint) {
    return usdAbsRaisedInCents;
  }
  
  /**
   * @dev Return the amount of SHPC sold as a bonus.
   */
  function getCoinRaisedBonusInWei() external view returns(uint) {
    return coinRaisedBonusInWei;
  }
  
  /**
   * @dev Add or Update currency
   */
  function addUpdateCurrency(string _ticker, uint _usd, uint _devision) public returns(bool) {
    return addUpdateCurrency(_ticker, _usd, _devision, 0, 0);
  }
  
  /**
   * @dev Add or Update currency
   */
  function addUpdateCurrency(string _ticker, uint _usd) public returns(bool) {
    return addUpdateCurrency(_ticker, _usd, 0, 0, 0);
  }

  /**
   * @dev Add or Update currency
   * @param _ticker string
   * @param _usd uint rate in cents
   * @param _devision uint
   * @param _raised uint
   * @param _usdRaised uint raised in usd cents
   */
  function addUpdateCurrency(string _ticker, uint _usd, uint _devision, uint _raised, uint _usdRaised) public onlyMultiOwnersType(1) returns(bool) {
    require(_usd > 0, "1");

    bytes32 ticker = stringToBytes32(_ticker);

    if (!currencyList[ticker].active) {
      currencyTicker.push(ticker);
    }
    currencyList[ticker] = CurrencyData({
      active : true,
      usd : _usd,
      devision : (_devision == 0) ? currencyList[ticker].devision : _devision,
      raised : currencyList[ticker].raised > 0 ? currencyList[ticker].raised : _raised,
      usdRaised: currencyList[ticker].usdRaised > 0 ? currencyList[ticker].usdRaised : _usdRaised,
      counter: currencyList[ticker].counter > 0 ? currencyList[ticker].counter : 0,
      lastUpdate: block.timestamp
    });

    return true;
  }

  /**
   * @dev Set SHPC price in cents
   */
  function setCoinUSDRate(uint _value) public onlyOwner returns(bool) {
    require(_value > 0);
    uint oldCoinUSDRate = coinUSDRate;
    coinUSDRate = _value;
    emit ChangeCoinUSDRate(oldCoinUSDRate, coinUSDRate);
    return true;
  }

  /**
   * @dev Percent deducted from the amount raised getTotalUsdRaisedInCents
   */
  function setCurrVolPercent(uint _value) public onlyOwner returns(bool) {
    require(_value > 0 && _value <= 10);
    uint oldCurrVolPercent = currVolPercent;
    currVolPercent = _value;
    emit ChangeCurrVolPercent(oldCurrVolPercent, currVolPercent);
    return true;
  }

  /**
   * @dev Returns the number of SHPC from USD
   * @param usdCents amount of dollars in cents example 100$ = 10000
   * @return SHPC in wei
   */
  function getTokenWeiFromUSD(uint usdCents) public view returns(uint) {
    return usdCents.mul(1 ether).div(coinUSDRate); // (100.00$ * (10**18)) / 0.12$ = 833333333333333333333 SHPC wei = 833.33 SHPC
  }

  /**
   * @dev Returns the number of SHPC in wei
   * @param ethWei eth в wei
   * @return SHPC in wei
   */
  function getTokenFromETH(uint ethWei) public view returns(uint) {
    return ethWei.mul(currencyList["ETH"].usd).div(coinUSDRate); // (1 ETH * 587.10$) / 0.12$ =  4892500000000000000000 SHPC wei = 4892.50 SHPC
  }

  /**
   * @dev Returns the amount of USD from ETH
   * @param ethWei ETH в wei
   * @return USD in cents
   */
  function getUsdFromETH(uint ethWei) public view returns(uint) {
    return ethWei.mul(currencyList["ETH"].usd).div(1 ether);
  }

  /**
   * @dev Add payment data to currency
   * @param _ticker string
   * @param value uint
   * @param usdAmount uint in cents
   * @param coinRaised uint in wei
   * @param coinRaisedBonus uint in wei (optional field)
   */
  function addPay(string _ticker, uint value, uint usdAmount, uint coinRaised, uint coinRaisedBonus) public onlyMultiOwnersType(2) returns(bool) {
    require(value > 0);
    require(usdAmount > 0);
    require(coinRaised > 0);

    bytes32 ticker = stringToBytes32(_ticker);
    assert(currencyList[ticker].active);

    coinRaisedInWei += coinRaised;
    coinRaisedBonusInWei += coinRaisedBonus;
    usdAbsRaisedInCents += usdAmount;

    currencyList[ticker].usdRaised += usdAmount;
    currencyList[ticker].raised += value;
    currencyList[ticker].counter++;

    emit AddPay();
    return true;
  }

  /**
   * @dev Chacnge currency data when change contributor payment
   * @param ticker bytes32
   * @param currencyValue uint
   * @param currencyUsdRaised uint in cents
   * @param _usdAbsRaisedInCents uint in cents
   * @param _coinRaisedInWei uint in wei
   * @param _coinRaisedBonusInWei uint in wei (optional field)
   */
  function editPay(
    bytes32 ticker,
    uint currencyValue,
    uint currencyUsdRaised,
    uint _usdAbsRaisedInCents,
    uint _coinRaisedInWei,
    uint _coinRaisedBonusInWei
  )
  public
  onlyMultiOwnersType(3)
  returns(bool)
  {
    require(currencyValue > 0);
    require(currencyUsdRaised > 0);
    require(_usdAbsRaisedInCents > 0);
    require(_coinRaisedInWei > 0);
    assert(currencyList[ticker].active);

    coinRaisedInWei = _coinRaisedInWei;
    coinRaisedBonusInWei = _coinRaisedBonusInWei;
    usdAbsRaisedInCents = _usdAbsRaisedInCents;

    currencyList[ticker].usdRaised = currencyUsdRaised;
    currencyList[ticker].raised = currencyValue;


    emit EditPay();

    return true;
  }

  /**
   * @dev Add bonus SHPC
   */
  function addPreSaleBonus(uint bonusToken) public onlyMultiOwnersType(4) returns(bool) {
    coinRaisedInWei += bonusToken;
    coinRaisedBonusInWei += bonusToken;
    emit EditPay();
    return true;
  }

  /**
   * @dev Change bonus SHPC
   */
  function editPreSaleBonus(uint beforeBonus, uint afterBonus) public onlyMultiOwnersType(5) returns(bool) {
    coinRaisedInWei -= beforeBonus;
    coinRaisedBonusInWei -= beforeBonus;

    coinRaisedInWei += afterBonus;
    coinRaisedBonusInWei += afterBonus;
    emit EditPay();
    return true;
  }

  /**
   * @dev Returns the sum of investments with conversion to dollars at the current rate with a deduction of interest. 
   */
  function getTotalUsdRaisedInCents() public view returns(uint) {
    uint totalUsdAmount = 0;
    if (currencyTicker.length > 0) {
      for (uint i = 0; i < currencyTicker.length; i++) {
        if (currencyList[currencyTicker[i]].raised > 0) {
          totalUsdAmount += getUsdFromCurrency(currencyTicker[i], currencyList[currencyTicker[i]].raised);
        }
      }
    }
    return subPercent(totalUsdAmount, currVolPercent);
  }

  /**
   * @dev Converts to dollars
   */
  function getUsdFromCurrency(string ticker, uint value) public view returns(uint) {
    return getUsdFromCurrency(stringToBytes32(ticker), value);
  }

  /**
   * @dev Converts to dollars
   */
  function getUsdFromCurrency(string ticker, uint value, uint usd) public view returns(uint) {
    return getUsdFromCurrency(stringToBytes32(ticker), value, usd);
  }

  /**
   * @dev Converts to dollars
   */
  function getUsdFromCurrency(bytes32 ticker, uint value) public view returns(uint) {
    return getUsdFromCurrency(ticker, value, 0);
  }

  /**
   * @dev Converts to dollars
   */
  function getUsdFromCurrency(bytes32 ticker, uint value, uint usd) public view returns(uint) {
    if (currencyList[ticker].active && value > 0) {
      return value.mul(usd > 0 ? usd : currencyList[ticker].usd).div(currencyList[ticker].devision);
    }
    return 0;
  }

  /**
   * @dev Returns information about available currencies in json format
   */
  function getAllCurrencyTicker() public view returns(string) {
    string memory _tickers = "{";
    for (uint i = 0; i < currencyTicker.length; i++) {
      _tickers = strConcat(_tickers, strConcat("\"", bytes32ToString(currencyTicker[i]), "\":"), uint2str(currencyList[currencyTicker[i]].usd), (i+1 < currencyTicker.length) ? "," : "}");
    }
    return _tickers;
  }

  /**
   * @dev Update currency rate.
   */
  function updateCurrency(string ticker, uint value) public onlyMultiOwnersType(6) returns(bool) {
    bytes32 _ticker = stringToBytes32(ticker);
    require(currencyList[_ticker].active);
    require(value > 0);

    currencyList[_ticker].usd = value;
    currencyList[_ticker].lastUpdate = block.timestamp;
    emit ChangeCurrency();
    return true;
  }

  /**
   * @dev Check currency is available.
   */
  function checkTickerExists(string ticker) public view returns(bool) {
    return currencyList[stringToBytes32(ticker)].active;
  }

  /**
   * @dev Returns currency info.
   */
  function getCurrencyList(string ticker)
    public
    view
    returns(
      bool active,
      uint usd,
      uint devision,
      uint raised,
      uint usdRaised,
      uint usdRaisedExchangeRate,
      uint counter,
      uint lastUpdate
    )
  {
    return getCurrencyList(stringToBytes32(ticker));
  }

  /**
   * @dev Return curency info.
   */
  function getCurrencyList(bytes32 ticker)
    public
    view
    returns(
      bool active,
      uint usd,
      uint devision,
      uint raised,
      uint usdRaised,
      uint usdRaisedExchangeRate,
      uint counter,
      uint lastUpdate
    )
  {
    CurrencyData memory _obj = currencyList[ticker];
    uint _usdRaisedExchangeRate = getUsdFromCurrency(ticker, _obj.raised);
    return (
      _obj.active,
      _obj.usd,
      _obj.devision,
      _obj.raised,
      _obj.usdRaised,
      _usdRaisedExchangeRate,
      _obj.counter,
      _obj.lastUpdate
    );
  }

  function getCurrencyRate(string _ticker) public view returns(uint) {
    return currencyList[stringToBytes32(_ticker)].usd;
  }

  /**
   * @dev Return all currency data in json.
   */
  function getCurrencyData() public view returns(string) {
    string memory _array = "{";

    if (currencyTicker.length > 0) {
      for (uint i = 0; i < currencyTicker.length; i++) {
        if (currencyList[currencyTicker[i]].active) {
          _array = strConcat(_array, strConcat("\"", bytes32ToString(currencyTicker[i]), "\":"), getJsonCurrencyData(currencyList[currencyTicker[i]]), (i+1 == currencyTicker.length) ? "}" : ",");
        }
      }
    } else {
      return "[]";
    }

    return _array;
  }

  /**
   * @dev Returns the number of SHPC sold
   */
  function getCoinRaisedInWei() public view returns(uint) {
    return coinRaisedInWei;
  }

  /**
   * @dev Returns SHPC price in cents
   */
  function getCoinUSDRate() public view returns(uint) {
    return coinUSDRate;
  }

  /**
   * @dev Returns percent.
   */
  function getCurrVolPercent() public view returns(uint) {
    return currVolPercent;
  }

  /**
   * @dev Returns json info from currency
   */
  function getJsonCurrencyData(CurrencyData memory _obj) private pure returns (string) {
    return strConcat(
      strConcat("{\"usd\":", uint2str(_obj.usd), ",\"devision\":", uint2str(_obj.devision), ",\"raised\":\""),
      strConcat(uint2str(_obj.raised), "\",\"usdRaised\":", uint2str(_obj.usdRaised), ",\"usdRaisedCurrency\":", uint2str((_obj.raised.mul(_obj.usd).div(_obj.devision)))),
      strConcat(",\"counter\":", uint2str(_obj.counter), ",\"lastUpdate\":", uint2str(_obj.lastUpdate), "}")
    );
  }

  /**
   * @dev Calculate the percentage of the amount 
   * example: 100 - 5% = 95
   */
  function subPercent(uint a, uint b) private pure returns(uint) {
    uint c = (a / 100) * b;
    assert(c <= a);
    return a - c;
  }

}
