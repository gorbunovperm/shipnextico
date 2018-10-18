### ShipNext ICO

```bash
git clone https://github.com/emil-dudnyk/shipnextico.git
cd shipnextico
npm i -g truffle babel-cli soljitsu solhint solium solc truffle-flattener && npm i
```

check solium test https://github.com/duaraghav8/Solium#readme
```bash
npm run solium
```

check solhint test https://github.com/protofire/solhint
```bash
npm run solhint
```

etherscan contractsVerified combine contract https://github.com/BlockChainCompany/soljitsu
```bash
soljitsu combine --src-dir=./contracts --dest-dir=./dist
```

etherscan contractsVerified combine contract when truffle deploy https://github.com/nomiclabs/truffle-flattener
```bash
cd ./contracts
truffle-flattener ShipCoinCrowdsale.sol >> ../dist/truffle_ShipCoinCrowdsale.sol
truffle-flattener ShipCoinStorage.sol >> ../dist/truffle_ShipCoinStorage.sol
truffle-flattener ShipCoinCurrency.sol >> ../dist/truffle_ShipCoinCurrency.sol
truffle-flattener ShipCoinBonusSystem.sol >> ../dist/truffle_ShipCoinBonusSystem.sol
```

```bash
truffle develop
```

truffle(develop)>
```bash
migrate
```
example output
```bash
truffle(develop)> migrate
Using network 'develop'.

Running migration: 1_initial_migration.js
  Deploying Migrations...
  ... 0x08a335fdf8546644f1633b8b188d06991320ea471701727c5fae30fc1982da3a
  Migrations: 0x8cdaf0cd259887258bc13a92c0a6da92698644c0
Saving artifacts...
Running migration: 2_deploy_sale.js
  Running step...
  Replacing ShipCoin...
  ... 0x0bec695dbc9643c99cf47c966da55cdc28d5003b367a6a9b4f7c6f79a0fb1365
  ShipCoin: 0xf12b5dd4ead5f743c6baa640b0216200e89b60da
  Replacing ShipCoinStorage...
  ... 0xdaebc9bba5950149b6d59091e1ff9e5d4c4ca89617c3e33a1b533de18ac1bd9e
  ShipCoinStorage: 0x345ca3e014aaf5dca488057592ee47305d9b3e10
  Replacing ShipCoinBonusSystem...
  ... 0x2ac9a30f21d0e5b901feb50464537dfd204b4e3f0d157ea4d66bebea52eb2860
  ShipCoinBonusSystem: 0xf25186b5081ff5ce73482ad761db0eb0d25abfbf
  Replacing ShipCoinCurrency...
  ... 0xec44d612e4f11c1ff31b42c16722fd61b10dc3a9c6d066d1b1d9c71e8a7e93e9
  ShipCoinCurrency: 0x8f0483125fcb9aaaefa9209d8e9d7b9c8b9fb90f
  Replacing ShipCoinCrowdsale...
  ... 0x9e2854b299b671cb1b69dce0b11cb524ede4288c735e609885f234fdecae53dd
  ShipCoinCrowdsale: 0x9fbda871d559710256a2502a2517b794b482db40
  ... 0x085c08c11a0d3241bdacdd13404bd34dd4d6f6f522d4db65b259dfb245bc1de8
Saving artifacts...

```

truffle(develop)>
```bash
test
```
example output
```bash
truffle(develop)> test
Using network 'develop'.



  Contract: Sale
--------------------------- sale test --------------------------
 ShipCoinStorage   | 0xaa588d3737b611bafd7bd713445b314bd453a5c8
 ShipCoinCurrency  | 0x75c35c980c0d37ef46df04d31a140b65503c0eed
 ShipCoinCrowdsale | 0x82d50ad3c1091866e258fd0f1a7cc9674609d254
 Manager           | 0xf17f52151ebef6c7334fad080c5704d77216b732
 MultiSig          | 0x0f4f2ac550a1b4e2280d04c21cea7ebd822934b5
 ETH               | 206.57$  +0.01$  in cents(20657)
 BTC               | 6541.60$ +0.01$  in cents(654160)
 EUR               | 1.16$    +0.01$  in cents(116)
----------------------------------------------------------------

    ✓ The manager does not have the rights to perform the functions addWhiteList,getContributorId,getContributionInfoById (148ms)
    ✓ Add rights to the manager on the functions addWhiteList,getContributorId,getContributionInfoById (110ms)
    ✓ Checking the rights of the manager for the functions addWhiteList,getContributorId,getContributionInfoById (78ms)
    ✓ Adding users to WhiteList (315ms)
    ✓ Checking if users are added (246ms)
    ✓ Account manager functions execution getContributorId,getContributionInfoById (71ms)
    Updating exchange rate
      ✓ Checking the right to change course (114ms)
      ✓ Adding the right to the manager to the function updateCurrency (44ms)
      ✓ Checking the rights of the manager for the function updateCurrency
      ✓ Exchange rate update by manager (195ms)
      ✓ Checking that the exchange rate is correctly changed by the manager (100ms)
    ShipCoinCrowdsale
      ✓ Adding the right ShipCoinCrowdsale (391ms)
      ✓ Verify the right ShipCoinCrowdsale (322ms)
      ✓ User balance user1,user2,user3 > 1 ETH
      ✓ Check, status = 0
      ✓ Checking that you can not send eth until the contract is up and running
      ✓ Start PreSale (45ms)
      ✓ Checking the status of the sail = 1 (46ms)
      ✓ Payment in ETH (1016ms)
      ✓ Contract balance ETH
      ✓ Payment in btc,usd,eur (1166ms)
      ✓ Refund payment in pre-sale (4954ms)
      ✓ Verify users billing information (2054ms)
    Changing a user payment in BTC
      ✓ Nothing changed (5470ms)
      ✓ Change of payment amount 2 BTC (5354ms)
      ✓ The change in the dollar exchange rate 2000$ (5628ms)
      ✓ Change of percent of bonuses 20% (5281ms)
      ✓ Change all 3 BTC,2200$,10% (5294ms)
    Changing a user payment in ETH
      ✓ Nothing changed (5263ms)
      ✓ Change of payment amount to 10 ETH (5477ms)
      ✓ The change in the dollar exchange rate 850$ (5583ms)
      ✓ Change of percent of bonuses 5% (5705ms)
      ✓ Change all 11ETH,857.51$,10% (5555ms)
    Crowdsale softcap
      ✓ Reach softcap (1538ms)
      ✓ Refund payment before pre-sale bonusafter activeSoftCapAchieved (4774ms)
      ✓ Check users presale bonus (4906ms)
      ✓ Check change userPayment and reCalc PreSale bonus (5243ms)
    Sale
      ✓ State = SALE
      ✓ Bonus 20% for the first 48 hours | 0 - 2 days (10236ms)
      ✓ Bonus 15% for weeks 1-2 starting from day 3 | 3 - 14 days (11118ms)
      ✓ Bonus 10% for weeks 3-4 | 15 - 28 days (10166ms)
      ✓ Bonus 5% for weeks 5-6 | 29 - 42 days (10515ms)
      ✓ Bonus 0 for weeks 7-8 | 43 - 56 days (10527ms)
      ✓ Sale state set end (66ms)
      ✓ Refund payment (4602ms)
      ✓ Get contributor SHPC (2505ms)
      ✓ Send SHPC to contributors (3537ms)

  Contract: Check refund
------------------------- refund test --------------------------
 ShipCoinStorage   | 0xecfcab0a285d3380e488a39b4bb21e777f8a4eac
 ShipCoinCurrency  | 0x0d8cc4b8d15d4c3ef1d70af0071376fb26b5669b
 ShipCoinCrowdsale | 0x4e72770760c011647d4873f60a3cf6cdea896cd8
 Manager           | 0xf17f52151ebef6c7334fad080c5704d77216b732
 MultiSig          | 0x0f4f2ac550a1b4e2280d04c21cea7ebd822934b5
 ETH               | 206.40$ in cents(20640)
 BTC               | 6540.16$ in cents(654016)
 EUR               | 1.15$ in cents(115)
----------------------------------------------------------------

    ✓ Payment in ETH (903ms)
    ✓ Payment in btc,usd,eur (694ms)
    ✓ Refund payment (5693ms)
    ✓ Refund user (2033ms)
    ✓ Refund users (2692ms)

  Contract: Check limits
    ✓ Add users to whiteList (43196ms)
    ✓ Payment in USD (14185ms)
    ✓ Payment in BTC (149672ms)
use eth: 11.649873600000006
    ✓ Check payment info (133208ms)


  56 passing (8m)


```