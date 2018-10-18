pragma solidity ^0.4.24;


/**
 * @title String
 * @dev ConcatenationString, uintToString, stringsEqual, stringToBytes32, bytes32ToString
 */
contract String {

  function strConcat(string _a, string _b, string _c, string _d, string _e) internal pure returns (string memory) {
    bytes memory _ba = bytes(_a);
    bytes memory _bb = bytes(_b);
    bytes memory _bc = bytes(_c);
    bytes memory _bd = bytes(_d);
    bytes memory _be = bytes(_e);
    bytes memory abcde = bytes(new string(_ba.length + _bb.length + _bc.length + _bd.length + _be.length));
    uint k = 0;
    uint i;
    for (i = 0; i < _ba.length; i++) {
      abcde[k++] = _ba[i];
    }
    for (i = 0; i < _bb.length; i++) {
      abcde[k++] = _bb[i];
    }
    for (i = 0; i < _bc.length; i++) {
      abcde[k++] = _bc[i];
    }
    for (i = 0; i < _bd.length; i++) {
      abcde[k++] = _bd[i];
    }
    for (i = 0; i < _be.length; i++) {
      abcde[k++] = _be[i];
    }
    return string(abcde);
  }

  function strConcat(string _a, string _b, string _c, string _d) internal pure returns(string) {
    return strConcat(_a, _b, _c, _d, "");
  }

  function strConcat(string _a, string _b, string _c) internal pure returns(string) {
    return strConcat(_a, _b, _c, "", "");
  }

  function strConcat(string _a, string _b) internal pure returns(string) {
    return strConcat(_a, _b, "", "", "");
  }

  function uint2str(uint i) internal pure returns(string) {
    if (i == 0) {
      return "0";
    }
    uint j = i;
    uint length;
    while (j != 0) {
      length++;
      j /= 10;
    }
    bytes memory bstr = new bytes(length);
    uint k = length - 1;
    while (i != 0) {
      bstr[k--] = byte(uint8(48 + i % 10));
      i /= 10;
    }
    return string(bstr);
  }

  function stringsEqual(string memory _a, string memory _b) internal pure returns(bool) {
    bytes memory a = bytes(_a);
    bytes memory b = bytes(_b);

    if (a.length != b.length)
      return false;

    for (uint i = 0; i < a.length; i++) {
      if (a[i] != b[i]) {
        return false;
      }
    }

    return true;
  }

  function stringToBytes32(string memory source) internal pure returns(bytes32 result) {
    bytes memory _tmp = bytes(source);
    if (_tmp.length == 0) {
      return 0x0;
    }
    assembly {
      result := mload(add(source, 32))
    }
  }

  function bytes32ToString(bytes32 x) internal pure returns (string) {
    bytes memory bytesString = new bytes(32);
    uint charCount = 0;
    uint j;
    for (j = 0; j < 32; j++) {
      byte char = byte(bytes32(uint(x) * 2 ** (8 * j)));
      if (char != 0) {
        bytesString[charCount] = char;
        charCount++;
      }
    }
    bytes memory bytesStringTrimmed = new bytes(charCount);
    for (j = 0; j < charCount; j++) {
      bytesStringTrimmed[j] = bytesString[j];
    }
    return string(bytesStringTrimmed);
  }

  function inArray(string[] _array, string _value) internal pure returns(bool result) {
    if (_array.length == 0 || bytes(_value).length == 0) {
      return false;
    }
    result = false;
    for (uint i = 0; i < _array.length; i++) {
      if (stringsEqual(_array[i],_value)) {
        result = true;
        return true;
      }
    }
  }
}
