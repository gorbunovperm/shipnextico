/**
 * @author Emil Dudnyk
 */
const fs      = require('fs');
const _       = require('lodash');
const abi     = require('ethereumjs-abi');
const Promise = require('bluebird');
const fetch   = require('node-fetch');
import { get as _get , has as _has}  from'lodash';
import Web3   from 'web3';
import { networks } from '../truffle';

let networksName = {};
Object.keys(networks).forEach(network => {
  networksName[networks[network].network_id] = network;
})

export class Migration {
  static deployer = null;
  static artifacts = null;
  static ethPrice = 0;
  static network = null;
  static instances = [];
  static disableAllLog = false;
  static disableWriteFileLog = false;
  static logFile = __dirname+'/../deploy.log';
  static provider = null;

  constructor (contractFileName, constructorArgs = null, params = null) {
    let contract = Migration.artifacts.require(`./${contractFileName}.sol`);
    this.contract = contract;

    this.gasPrice = 0;
    this.args = [];
    this.argsConstructor = [];

    this.constructorArgs = constructorArgs;
    this.constructorArgsRaw = constructorArgs;
    this.constructorArgsType = [];
    this.params = params;

    this.name = contract.contractName;
    this.instance = null;
    this.address = null;
    this.abi = contract.abi;

    if(this.abi) {
      this.abi.forEach(abiElements => {
        if(abiElements.type === 'constructor' && Array.isArray(abiElements.inputs)) {
          abiElements.inputs.forEach(input => {
            this.constructorArgsType.push(input.type);
          })
        }
      })
    }

    this.constructorABI = null;
    this.deployGasUsed = 0;
    let network = networks[Migration.network];
    if(network.hasOwnProperty('provider')) {
      network.host = '127.0.0.1';
      network.port = 9545;
    }
    this.web3 = new Web3(Migration.provider || `http://${network.host || 'localhost'}:${network.port || 8545}`);

    this.prepeaContractDeploy(constructorArgs, params);

    if(this.gasPrice == 0) {
      this.web3.eth.getGasPrice()
        .then(gasPrice => {
          this.gasPrice = gasPrice;
          Migration.gasPrice = gasPrice;
        });
    }

    const instances =  new Proxy(this, {
      get(target, name) {
        if (target[name]) return target[name];
        if(target.instance && target.instance.hasOwnProperty(name)) {
          return function(...args) {
            return target.instance[name].apply( this, arguments )
              .then((result) => {
                let gasUsed = result.receipt.gasUsed;
                let gasEth  = this.web3.utils.fromWei((result.receipt.gasUsed * target.gasPrice).toString(), 'ether');
                let gasUsd = (gasEth * Migration.ethPrice).toFixed(2);
                Migration.log(`\n${target.name}->${name}(${args.length ? args.join(','): ''});\ngasUsed: ${gasUsed} - ${parseFloat(gasEth).toFixed(4)}ETH - ${gasUsd}$`);
                return result;
              })
          }
        }
      }
    });

    Migration.instances[this.name]=instances;
    return instances;
  }

  static setDeployer(deployer) {
    Migration.deployer = deployer;
  }
  static setArtifacts(artifacts) {
    Migration.artifacts = artifacts;
  }
  static setNetwork(network) {
    Migration.network = network;
  }

  static getEthPrice() {
    return fetch('https://api.coinmarketcap.com/v2/ticker/?limit=5')
      .then(res => res.json())
      .then(result => {
        Migration.ethPrice = _get(result, 'data.1027.quotes.USD.price', 0);
      });
  }

  static getInfoAll() {
    Object.keys(Migration.instances).forEach(key => {
      Migration.instances[key].getInfo();
    })
  }

  timeTravel(time) {
    if(Migration.network != 'develop') {
      return Promise.resolve(true);
    }
    return new Promise((resolve, reject) => {
      this.web3.currentProvider.sendAsync({
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

  latestTime () {
    return this.web3.eth.getBlock('latest')
      .then(block => {
        return block.timestamp;
      });
  }

  prepeaContractDeploy(args = null, params = null) {
    this.args = [this.contract];
    if(args) {
      if(typeof args === "object") {
        args = this.getConstructor(args);
        this.argsConstructor = args;
        this.args = this.args.concat(args);
      } else {
        this.args.push(args);
        this.argsConstructor = args;
        args = [args];
      }
    }
    if(this.params || params) {
      params = _.assign({}, this.params, params);
    }
    if(params) {
      this.args.push(params);
      this.params = params;
    }
    this.constructorArgs = args;
    this.constructorABI = abi.rawEncode(this.constructorArgsType, args).toString('hex');
  }

  deploy(args = null, params = null) {
    if(args || params) {
      if(typeof args === "object" && this.constructorArgsRaw && typeof this.constructorArgsRaw === "object") {
        args = _.assign({},this.constructorArgsRaw, args);
        this.constructorArgsRaw = args;
      } else {
        this.constructorArgsRaw = args;
      }
      this.prepeaContractDeploy(args, params);
    }
    return new Promise((resolve, reject) => {
      return Migration.deployer.deploy.apply(Migration.deployer,this.args)
        .then((instance) => {
          if(instance) {
            return this.web3.eth.getTransactionReceipt(instance.transactionHash)
              .then(receipt => {
                this.deployGasUsed = _get(receipt,'gasUsed',0);
                this.address = this.contract.address;
                this.instance = instance;
                resolve(true);
              });
          } else {
            reject({
              contract: this.name,
              message:`------ ERROR instance [${this.name}]------`
            });
          }
        })
        .catch((e) => {
          reject({
            contract: this.name,
            message:`------ ERROR [${this.name}]------`,
            error:e
          });
        });
    });
  }

  getInfo(print = true) {
    let gasUsed = this.deployGasUsed;
    let gasEth  = this.web3.utils.fromWei((gasUsed * this.gasPrice).toString(), 'ether');
    let gasUsd = (gasEth * Migration.ethPrice).toFixed(2);
    let log = {
address: `
 ${this.name}:
  Address:      ${this.address}`,
gas: `
  gasUsed:      ${gasUsed} - ${parseFloat(gasEth).toFixed(4)}ETH - ${gasUsd}$`,
constructor: `
  constructor: 
  ${this.getConstructorRemix()}`,
addToWallet: `
  addToWallet:
  ${this.getAddToWallet()}`,
contractABI: `
  ContractABI:
  ${this.constructorABI || ''}`,
abi: `
  ABI:
  ${JSON.stringify(this.abi)}`,
bytecode: `
  bytecode:
  ${this.getContractBytecode()}`
};
    if(!Migration.disableWriteFileLog) {
      fs.appendFileSync(Migration.logFile, Object.keys(log)
        .map(item => log[item])
        .join('')
      );
    }
    if(print && !Migration.disableAllLog) {
      console.log(log.address,log.constructor,log.gas);
    } else {
      return {
        name: this.name,
        address: this.address,
        constructorAbi:JSON.stringify(this.abi),
        abi: this.abi,
      }
    }
  }

  getName() {
    return this.name
  }
  getAddress() {
    return this.address
  }

  getDistContractFileFromSourcePath() {
    const file = this.contract.sourcePath.replace(__dirname+'/../contracts/','').replace('/','.');
    if(file && fs.existsSync(__dirname+'/../dist/'+file)) {
      return __dirname+'/../dist/'+file;
    }
    return null;
  }

  getContractBytecode() {
    // const file = this.getDistContractFileFromSourcePath();
    // const input = fs.readFileSync(file);
    // const output = solc.compile(input.toString(), 1);
    // const bytecode = _.get(output,`contracts.:${this.contract.contractName}].bytecode`,null);
    //
    // // Contract object
    // const contract = this.contract.web3.eth.contract(this.abi);
    // // Get contract data
    // const contractData = contract.new.getData({
    //   data: '0x' + bytecode
    // });
    return this.contract.bytecode;
  }

  getAddToWallet() {
    return `CustomContracts.upsert({address: "${this.address}"}, { $set: { address: "${this.address}", name: "${this.name}", jsonInterface: ${JSON.stringify(this.abi)} }});`
  }

  getConstructor(args = {}) {
    let array = [];
    for(let i in args){
      array.push(args[i]);
    }
    return array;
  }
  getConstructorRemix() {
    let ret = '()';

    let tmpArgs = null;

    if(this.argsConstructor && Array.isArray(this.argsConstructor)) {
      tmpArgs = this.argsConstructor;
    } else if(this.argsConstructor && typeof this.argsConstructor === "string") {
      tmpArgs = [this.argsConstructor]
    }
    if(tmpArgs) {
      ret = `("${tmpArgs.join('","')}")`;
    }

    return ret;
  }

  static clearLog() {
    if(!Migration.disableWriteFileLog) {
      if (fs.existsSync(Migration.logFile)) {
        fs.truncateSync(Migration.logFile);
      } else {
        fs.closeSync(fs.openSync(Migration.logFile, 'w'));
      }
    }
  }
  static log(str,str1 = '') {
    if(!Migration.disableAllLog) {
      console.log(str, str1);
    }
    if(!Migration.disableWriteFileLog) {
      fs.appendFileSync(Migration.logFile, str + str1 + '\n');
    }
  }
  static logToFile(str, str1 = '') {
    if(!Migration.disableWriteFileLog) {
      fs.appendFileSync(Migration.logFile, str + str1 + '\n');
    }
  }

  static writeDeployInfo(token = null) {
    let next = Promise.resolve(true);
    let symbol = '';
    let addWalletString = '';
    if(token && Migration.instances.hasOwnProperty(token)) {
      next = Migration.instances[token].instance.symbol()
        .then(result => {
          symbol = result;
          return result;
        });
    }
    Object.keys(Migration.instances).forEach(key => {
      addWalletString+=Migration.instances[key].getAddToWallet()+'\n';
    });
    return next
      .then(() => {
        Migration.logToFile(`\n
Add contract to Ethereum Wallet console:

CustomContracts.find().fetch().map(function(contract) { CustomContracts.remove(contract._id) });
${token ? `Tokens.find({symbol:"${symbol}"}).fetch().map(function(token) {Tokens.remove(token._id)});
tokenId = Helpers.makeId('token', "${Migration.instances[token].address}");
Tokens.upsert(tokenId, {$set: {
    address: "${Migration.instances[token].address}",
    name: "${Migration.instances[token].name}",
    symbol: "${symbol}",
    balances: {},
    decimals: 18
}});` : ''}
${addWalletString}
`);
      })

  }
  callAndEstimateGas(method = null, args) {
    return this.web3.eth.getGasPrice()
      .then(gasPrice => {
        if(!method) {
          console.log(`Gas Price: ${gasPrice} wei | ${this.web3.utils.fromWei(gasPrice, 'ether')} ether`);
        }
        return gasPrice;
      })
      .then((gasPrice) => {
        if(method) {
          console.log(`callAndEstimateGas[${method}]:`,args);
          let props = {
            gasEstimation: this.instance[method].estimateGas.apply(this, args || null),
            result: this.instance[method].apply(this, args || null)
          };
          return Promise.props(props)
            .then(resultProps => {
              console.log(resultProps.gasEstimation, resultProps.result.receipt.gasUsed, resultProps.result.receipt.cumulativeGasUsed);
              let retResult = {
                gasPrice,
                ...resultProps,
                cost: (resultProps.gasEstimation * gasPrice),
                costEther: this.web3.utils.fromWei((resultProps.result.receipt.gasUsed * gasPrice).toString(), 'ether')
              };
              console.log(`${this.name}->${method}(${args.length ? args.join(','): ''});\ngasUsed: ${resultProps.result.receipt.gasUsed}(${retResult.costEther}) ether`);
              return retResult;
            })
        }
        return { gasPrice };
      })
      .catch(err => {
        console.error(`callAndEstimateGas[${method}(${args.join(',')})]:`,err);
        return Promise.reject(err);
      })
  }

}

export class Contract {
  static artifacts = null;
  static ethPrice = 0;
  static network = null;
  static instances = [];
  static disableAllLog = false;
  static disableWriteFileLog = false;
  static logFile = __dirname+'/../deploy.log';
  static provider = null;

  static async build (contractFileName) {
    let contract = Contract.artifacts.require(`./${contractFileName}.sol`);
    const instance = await contract.deployed();
    return new Contract(instance,contract);
  }

  static async new (contractFileName, ...args) {
    let arg = Array.isArray(args[0]) ? args[0] : args;
    let contract = Contract.artifacts.require(`./${contractFileName}.sol`);
    const instance = await contract.new.apply(contract, arg);
    contract.address = instance.address;
    return new Contract(instance, contract);
  }

  static async init (contractFileName, address) {
    let contract = Contract.artifacts.require(`./${contractFileName}.sol`);
    const instance = null;
    contract.address = address;
    return new Contract(instance,contract);
  }

  constructor(contractInstance,contract) {
    if (typeof contract === 'undefined') {
      throw new Error(`Cannot be called. Need use Contract.build('ContractName')`);
    }
    this.contract = contract;
    this.contractInstance = contractInstance;
    this.abi = contract.abi;
    this.name = contract.contractName;
    this.address = contract.address;
    this.gasPrice = 0;
    this.contractPublicConstants = {};

    let network = networks[Contract.network];

    if(Contract.network === 'develop') {
      network.host = '127.0.0.1';
      network.port = 9545;
    }
    this.web3 = new Web3(Contract.provider || `http://${network.host || 'localhost'}:${network.port || 8545}`);

    if(this.gasPrice === 0) {
      this.web3.eth.getGasPrice()
        .then(gasPrice => {
          this.gasPrice = gasPrice;
          Contract.gasPrice = gasPrice;
        });
    }

    this.instance = new this.web3.eth.Contract(this.abi, this.address);

    this.getContractConstants();

    const instances =  new Proxy(this, {
      get(target, name) {
        if (name in target) {
          return target[name];
        } else if (name in target.instance) {
          return target.instance[name];
        } else if(_has(target,`instance.methods.${name}`)) {
          return function (...args) {
            let func = target.instance.methods[name](...args);
            const sendFunc = func.send;

            func.send = function (funcArgs) {
              if(typeof funcArgs == "string") {
                funcArgs = { from: funcArgs }
              }
              return sendFunc.call(func, funcArgs)
                .then((result) => {
                  if(funcArgs.nolog) {
                    return result;
                  }
                  let gasUsed = result.gasUsed;
                  let gasEth = target.web3.utils.fromWei((gasUsed * target.gasPrice).toString(), 'ether');
                  let gasUsd = (gasEth * Contract.ethPrice).toFixed(2);
                  Contract.log(`\n${target.name}->${name}(${args.length ? args.join(',') : ''});\ngasUsed: ${gasUsed} - ${parseFloat(gasEth).toFixed(4)}ETH - ${gasUsd}$`);
                  return result;
                })
            };

            return func;
          };
        }
      }
    });

    Contract.instances[this.name]=instances;
    return instances;
  }

  static setArtifacts(artifacts) {
    Contract.artifacts = artifacts;
  }
  static setNetwork(network) {
    Contract.network = networksName[network];
  }
  static setProvider(provider) {
    Contract.provider = provider;
  }

  static getEthPrice() {
    return fetch('https://api.coinmarketcap.com/v2/ticker/?limit=5')
      .then(res => res.json())
      .then(result => {
        Contract.ethPrice = _get(result, 'data.1027.quotes.USD.price', 0);
      });
  }

  static clearLog() {
    if(!Contract.disableWriteFileLog) {
      if (fs.existsSync(Contract.logFile)) {
        fs.truncateSync(Contract.logFile);
      } else {
        fs.closeSync(fs.openSync(Contract.logFile, 'w'));
      }
    }
  }
  static log(str,str1 = '') {
    if(!Contract.disableAllLog) {
      console.log(str, str1);
    }
    if(!Contract.disableWriteFileLog) {
      fs.appendFileSync(Contract.logFile, str + str1 + '\n');
    }
  }
  static logToFile(str, str1 = '') {
    if(!Contract.disableWriteFileLog) {
      fs.appendFileSync(Contract.logFile, str + str1 + '\n');
    }
  }

  getContractConstants() {
    this.abi.forEach((method) => {
      if (method.constant && method.inputs.length == 0) {
        let func = this.instance.methods[method.name].apply(this.instance.methods[method.name], []).call;
        this.contractPublicConstants[method.name] = {
          name: method.name,
          function: func,
          type: method.outputs[0] && method.outputs[0].type,
          returns: method.outputs
        };
      }
    });
  }

  getContractStatic(key = null) {
    return new Promise((resolve, reject) => {
      let promisesProps = {};
      for(let method in this.contractPublicConstants) {
        let contractMethod = this.contractPublicConstants[method];
        promisesProps[method] = contractMethod.function()
          .then(value => {
            // if(this.contractPublicConstantFormater[method]) {
            //   return this.contractPublicConstantFormater[method](value, contractMethod)
            // }
            return this._convertReturnValue(value, contractMethod.type)
          })
          .catch(err => {
            return reject(err);
          });
      }
      return Promise.props(promisesProps)
        .then(resolve)
        .catch(reject);
    });
  }

  _convertReturnValue (value, targetType) {
    if (targetType === 'bytes32') {
      value = this.web3.utils.toAscii(value).replace(/\u0000/g, '');
    }
    if(targetType === 'string') {
      const regex = /^[\[\{](.+)[\]\}]$/gm;
      if(regex.exec(value)) {
        value = JSON.parse(value);
      }
    }
    return value;
  }

}

export function usdToCents(value) {
  return Math.round(100 * parseFloat(value.toString().replace(/[^\d.]/g, '')));
}

/**
 * Deep diff between two object, using lodash
 * @param  {Object} object Object compared
 * @param  {Object} base   Object to compare with
 * @param  {Boolean} showDiff
 * @return {Object}        Return a new object who represent the diff
 */
export function diff(base = {}, object = {}, showDiff = false, invert = false) {
  return _.transform(base, (result, value, key) => {
    if (!_.isEqual(value, object[key])) {
      if(_.isObject(value) && _.isObject(object[key])) {
        if(Object.keys(object[key]).length > Object.keys(value).length) {
          result[key] = diff(object[key], value, showDiff, true);
        } else {
          result[key] = diff(value, object[key], showDiff, invert);
        }
      } else {
        if(invert) {
          result[key] = showDiff ? { base: object[key], new: value } : value || object[key];
        } else {
          result[key] = showDiff ? { base:value, new: object[key] }: object[key] || '*';
        }
      }
    }
  });
}
