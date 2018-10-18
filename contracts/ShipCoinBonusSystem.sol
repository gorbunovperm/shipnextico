pragma solidity ^0.4.24;

import "./IBonus.sol";
import "./lib/SafeMath.sol";
import "./base/MultiOwnable.sol";
import "./base/String.sol";


contract ShipCoinBonusSystem is IBonus, MultiOwnable, String {
  using SafeMath for uint256;

  struct Bonus {
    uint startDay;
    uint endDay;
    uint percent;
  }

  Bonus[] public bonus;

  uint256 private constant ONE_DAY = 86400;

  uint private preSaleBonusPercent = 40;
  uint private minReachUsdPayInCents = 500000;

  event AddBonus(uint startDay, uint endDay, uint percent);
  event ChangeBonus(uint startDay, uint endDay, uint percentOld, uint percentNew);
  event DeleteBonus(uint startDay, uint endDay, uint percent);

  /**
   * @dev constructor
   */
  constructor() public {
    bonus.push(Bonus(0, 2, 20)); // 20% for the first 48 hours | 0 - 2 days
    bonus.push(Bonus(3, 14, 15)); // 15% for weeks 1-2 starting from day 3 | 3 - 14 days
    bonus.push(Bonus(15, 28, 10)); // 10% for weeks 3-4 | 15 - 28 days
    bonus.push(Bonus(29, 42, 5));// 5% for weeks 5-6 | 29 - 42 days
  }

  /**
   * @dev Add or change bonus data
   * @param _startDay timestamp
   * @param _endDay timestamp
   * @param _percent uint
   */
  function addChangeBonus(uint _startDay, uint _endDay, uint _percent) public onlyMultiOwnersType(1) returns(bool) {
    for (uint i = 0; i < bonus.length; i++) {
      if (bonus[i].startDay == _startDay && bonus[i].endDay == _endDay) {
        uint oldPercent = bonus[i].percent;
        if (bonus[i].percent != _percent) {
          bonus[i].percent = _percent;
          emit ChangeBonus(_startDay, _endDay, oldPercent, _percent);
        }
        return true;
      }
    }
    bonus.push(Bonus(_startDay, _endDay, _percent));
    emit AddBonus(_startDay, _endDay, _percent);
    return true;
  }

  /**
   * @dev Delete bonus data
   * @param _startDay timestamp
   * @param _endDay timestamp
   * @param _percent uint
   */
  function delBonus(uint _startDay, uint _endDay, uint _percent) public onlyMultiOwnersType(2) returns(bool) {
    for (uint i = 0; i < bonus.length; i++) {
      if (bonus[i].startDay == _startDay && bonus[i].endDay == _endDay && bonus[i].percent == _percent) {
        delete bonus[i];
        emit DeleteBonus(_startDay, _endDay, _percent);
        return true;
      }
    }
    return false;
  }

  /**
   * @dev Get current day bonus percent.
   * @param startSaleDate timestamp
   * @param saleState bool
   */
  function getCurrentDayBonus(uint startSaleDate, bool saleState) public view returns(uint) {
    if (saleState) {
      for (uint i = 0; i < bonus.length; i++) {
        if ((startSaleDate > 0 && block.timestamp >= startSaleDate) && (_currentDay(startSaleDate, saleState) >= bonus[i].startDay) && (_currentDay(startSaleDate, saleState) <= bonus[i].endDay)) {
          if (bonus[i].percent > 0) {
            return bonus[i].percent;
          }
        }
      }
    }
    return 0;
  }

  /**
   * @dev Change preSale bonus percent
   * @param _bonus uint
   */
  function changePreSaleBonus(uint _bonus) public onlyOwner returns(bool) {
    require(_bonus > 20);
    preSaleBonusPercent = _bonus;
  }

  /**
   * @dev Change the minimum required amount to participate in the PreSale.
   * @param _minUsdInCents minReachUsdPayInCents
   */
  function changePreSaleMinUsd(uint _minUsdInCents) public onlyOwner returns(bool) {
    require(_minUsdInCents > 100000);
    minReachUsdPayInCents = _minUsdInCents;
  }

  /**
   * @dev Сurrent day from the moment of start sale
   * @param startSaleDate timestamp
   * @param saleState bool
   */
  function _currentDay(uint startSaleDate, bool saleState) public view returns(uint) {
    if (!saleState || startSaleDate == 0 || startSaleDate > block.timestamp) {
      return 0;
    }
    return block.timestamp.sub(startSaleDate).div(ONE_DAY);
  }

  /**
   * @dev get all bonus data in json format
   */
  function getBonusData() public view returns(string) {
    string memory _array = "[";
    for (uint i = 0; i < bonus.length; i++) {
      _array = strConcat(
          _array,
          strConcat("{\"startDay\":", uint2str(bonus[i].startDay), ",\"endDay\":", uint2str(bonus[i].endDay), ",\"percent\":"),
          uint2str(bonus[i].percent),
          (i+1 == bonus.length) ? "}]" : "},"
        );
    }
    return _array;
  }

  /**
   * @dev get preSale bonus prcent
   */
  function getPreSaleBonusPercent() public view returns(uint) {
    return preSaleBonusPercent;
  }

  /**
   * @dev get minimum required amount to participate in the PreSale
   */
  function getMinReachUsdPayInCents() public view returns(uint) {
    return minReachUsdPayInCents;
  }

}
