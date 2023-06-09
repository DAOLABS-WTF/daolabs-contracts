import * as fs from 'fs';
import * as hre from 'hardhat';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  deployRecordContract,
  getContractRecord,
  getPlatformConstant,
  logger,
  recordContractAbi
} from '../lib/lib';

async function main() {
  const deploymentLogPath = `./deployments/${hre.network.name}/platform.json`;
  if (!fs.existsSync(deploymentLogPath)) {
    fs.writeFileSync(deploymentLogPath, `{ "${hre.network.name}": { }, "constants": { } }`);
  }

  const deployment = fs.readFileSync(deploymentLogPath).toString();
  const network = JSON.parse(deployment)[hre.network.name];
  const contractNames = Object.keys(network);
  const contractAddresses = contractNames.map((name) => network[name].address);
  
  contractNames.forEach((name, i) => {
    console.log(`${name}: ${contractAddresses[i]}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
