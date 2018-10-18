pragma solidity ^0.4.24;


contract ICurrency {
  function getUsdAbsRaisedInCents() external view returns(uint);
  function getCoinRaisedBonusInWei() external view returns(uint);
  function getCoinRaisedInWei() public view returns(uint);
  function getUsdFromETH(uint ethWei) public view returns(uint);
  function getTokenFromETH(uint ethWei) public view returns(uint);
  function getCurrencyRate(string _ticker) public view returns(uint);
  function addPay(string _ticker, uint value, uint usdAmount, uint coinRaised, uint coinRaisedBonus) public returns(bool);
  function checkTickerExists(string ticker) public view returns(bool);
  function getUsdFromCurrency(string ticker, uint value) public view returns(uint);
  function getUsdFromCurrency(string ticker, uint value, uint usd) public view returns(uint);
  function getUsdFromCurrency(bytes32 ticker, uint value) public view returns(uint);
  function getUsdFromCurrency(bytes32 ticker, uint value, uint usd) public view returns(uint);
  function getTokenWeiFromUSD(uint usdCents) public view returns(uint);
  function editPay(bytes32 ticker, uint currencyValue, uint currencyUsdRaised, uint _usdAbsRaisedInCents, uint _coinRaisedInWei, uint _coinRaisedBonusInWei) public returns(bool);
  function getCurrencyList(string ticker) public view returns(bool active, uint usd, uint devision, uint raised, uint usdRaised, uint usdRaisedExchangeRate, uint counter, uint lastUpdate);
  function getCurrencyList(bytes32 ticker) public view returns(bool active, uint usd, uint devision, uint raised, uint usdRaised, uint usdRaisedExchangeRate, uint counter, uint lastUpdate);
  function getTotalUsdRaisedInCents() public view returns(uint);
  function getAllCurrencyTicker() public view returns(string);
  function getCoinUSDRate() public view  returns(uint);
  function addPreSaleBonus(uint bonusToken) public returns(bool);
  function editPreSaleBonus(uint beforeBonus, uint afterBonus) public returns(bool);
}
