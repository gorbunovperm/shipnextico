pragma solidity ^0.4.24;

import "./Ownable.sol";


/**
 * @title MultiOwnable
 * @dev The MultiOwnable contract has an owner address[], and provides basic authorization control
 */
contract MultiOwnable is Ownable {

  struct Types {
    mapping (address => bool) access;
  }
  mapping (uint => Types) private multiOwnersTypes;

  event AddOwner(uint _type, address addr);
  event AddOwner(uint[] types, address addr);
  event RemoveOwner(uint _type, address addr);

  modifier onlyMultiOwnersType(uint _type) {
    require(multiOwnersTypes[_type].access[msg.sender] || msg.sender == owner, "403");
    _;
  }

  function onlyMultiOwnerType(uint _type, address _sender) public view returns(bool) {
    if (multiOwnersTypes[_type].access[_sender] || _sender == owner) {
      return true;
    }
    return false;
  }

  function addMultiOwnerType(uint _type, address _owner) public onlyOwner returns(bool) {
    require(_owner != address(0));
    multiOwnersTypes[_type].access[_owner] = true;
    emit AddOwner(_type, _owner);
    return true;
  }
  
  function addMultiOwnerTypes(uint[] types, address _owner) public onlyOwner returns(bool) {
    require(_owner != address(0));
    require(types.length > 0);
    for (uint i = 0; i < types.length; i++) {
      multiOwnersTypes[types[i]].access[_owner] = true;
    }
    emit AddOwner(types, _owner);
    return true;
  }

  function removeMultiOwnerType(uint types, address _owner) public onlyOwner returns(bool) {
    require(_owner != address(0));
    multiOwnersTypes[types].access[_owner] = false;
    emit RemoveOwner(types, _owner);
    return true;
  }
}
