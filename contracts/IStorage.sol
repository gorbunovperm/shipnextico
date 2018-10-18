pragma solidity ^0.4.24;


contract IStorage {
  function processPreSaleBonus(uint minTotalUsdAmountInCents, uint bonusPercent, uint _start, uint _limit) external returns(uint);
  function checkNeedProcessPreSaleBonus(uint minTotalUsdAmountInCents) external view returns(bool);
  function getCountNeedProcessPreSaleBonus(uint minTotalUsdAmountInCents, uint start, uint limit) external view returns(uint);
  function reCountUserPreSaleBonus(uint uId, uint minTotalUsdAmountInCents, uint bonusPercent, uint maxPayTime) external returns(uint, uint);
  function getContributorIndexes(uint index) external view returns(uint);
  function checkNeedSendSHPC(bool proc) external view returns(bool);
  function getCountNeedSendSHPC(uint start, uint limit) external view returns(uint);
  function checkETHRefund(bool proc) external view returns(bool);
  function getCountETHRefund(uint start, uint limit) external view returns(uint);
  function addPayment(address _addr, string pType, uint _value, uint usdAmount, uint currencyUSD, uint tokenWithoutBonus, uint tokenBonus, uint bonusPercent, uint payId) public returns(bool);
  function addPayment(uint uId, string pType, uint _value, uint usdAmount, uint currencyUSD, uint tokenWithoutBonus, uint tokenBonus, uint bonusPercent, uint payId) public returns(bool);
  function checkUserIdExists(uint uId) public view returns(bool);
  function getContributorAddressById(uint uId) public view returns(address);
  function editPaymentByUserId(uint uId, uint payId, uint _payValue, uint _usdAmount, uint _currencyUSD, uint _totalToken, uint _tokenWithoutBonus, uint _tokenBonus, uint _bonusPercent) public returns(bool);
  function getUserPaymentById(uint uId, uint payId) public view returns(uint time, bytes32 pType, uint currencyUSD, uint bonusPercent, uint payValue, uint totalToken, uint tokenBonus, uint tokenWithoutBonus, uint usdAbsRaisedInCents, bool refund);
  function checkWalletExists(address addr) public view returns(bool result);
  function checkReceivedCoins(address addr) public view returns(bool);
  function getContributorId(address addr) public view returns(uint);
  function getTotalCoin(address addr) public view returns(uint);
  function setReceivedCoin(uint uId) public returns(bool);
  function checkPreSaleReceivedBonus(address addr) public view returns(bool);
  function checkRefund(address addr) public view returns(bool);
  function setRefund(uint uId) public returns(bool);
  function getEthPaymentContributor(address addr) public view returns(uint);
  function refundPaymentByUserId(uint uId, uint payId) public returns(bool);
  function changeSupportChangeMainWallet(bool support) public returns(bool);
}
