const fs = require("fs");
const path = require("path");
const solc = require('solc');

const basePath = path.join(__dirname, '../contracts');

function getFiles(dir) {
  let files = [];
  fs.readdirSync(dir)
    .forEach((file) => {
      let name = dir + '/' + file;
        (file.indexOf('.') !== 0) && (file.slice(-4) === '.sol') && files.push(name);
    });
  return files;
}

function mkdirSyncRecursive(directory) {
  if (!fs.existsSync(directory)) {
    let path = directory.replace(/\/$/, '').split('/');
    for (let i = 1; i <= path.length; i++) {
      let segment = path.slice(0, i).join('/');
      if (segment.length > 10 && !fs.existsSync(segment)) {
        fs.mkdirSync(segment);
      }
    }
  }
}

function getAbi(contractName) {
  let abi = null;
  let output;
  if (!abi) {
    let names = contractName.split('/');
    let name = names[names.length - 1].replace('.sol', '');
    let contractKey = `:${name}`;

    let contractData = fs.readFileSync(contractName).toString();
    let inputs = {
      [contractName]: contractData
    };

    output = solc.compile(contractData,1);

    if (output.contracts && output.contracts[contractKey] && output.contracts[contractKey].interface) {
      abi = output.contracts[contractKey].interface;
    }
  }
  if (!abi) {
    console.log(output);
    throw new Error(`${contractName}: Can not compile abi`);
  }

  return abi;
}

mkdirSyncRecursive(__dirname+'/../build/abi');
let contracts = getFiles(__dirname+'/../dist');

contracts.forEach((contractName) => {
  let names = contractName.split('/');
  let name = names[names.length - 1].replace('.sol', '');
  if (~['ShipCoinBonusSystem','ShipCoinCrowdsale','ShipCoinCurrency','ShipCoinStorage'].indexOf(name)) {
    let abi = getAbi(contractName);
    if(abi) {
      fs.writeFileSync(__dirname+'/../build/abi/'+name+'.json', abi.toString());
    }
  }
});
