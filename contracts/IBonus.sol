pragma solidity ^0.4.24;


contract IBonus {
  function getCurrentDayBonus(uint startSaleDate, bool saleState) public view returns(uint);
  function _currentDay(uint startSaleDate, bool saleState) public view returns(uint);
  function getBonusData() public view returns(string);
  function getPreSaleBonusPercent() public view returns(uint);
  function getMinReachUsdPayInCents() public view returns(uint);
}
