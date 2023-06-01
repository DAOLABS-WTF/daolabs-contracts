import * as dotenv from "dotenv";
import * as fs from 'fs';
import { ethers, upgrades } from 'hardhat';
import * as hre from 'hardhat';
import * as winston from 'winston';

import { deployRecordContract, getContractRecord, verifyContract } from '../lib/lib';

async function main() {
    dotenv.config();

    const logger = winston.createLogger({
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(info => { return `${info.timestamp}|${info.level}|${info.message}`; })
        ),
        transports: [
            new winston.transports.Console({
                level: 'info'
            }),
            new winston.transports.File({
                level: 'debug',
                filename: 'log/deploy/extensions.log',
                handleExceptions: true,
                maxsize: (5 * 1024 * 1024), // 5 mb
                maxFiles: 5
            })
        ]
    });

    ///
    logger.info(`deploying Deployer_v001 to ${hre.network.name}`);

    const deploymentLogPath = `./deployments/${hre.network.name}/extensions.json`;
    if (!fs.existsSync(deploymentLogPath)) {
        fs.writeFileSync(deploymentLogPath, `{ "${hre.network.name}": { } }`);
    }

    const platformLogPath = `./deployments/${hre.network.name}/platform.json`;

    const [deployer] = await ethers.getSigners();
    logger.info(`connected as ${deployer.address}`);

    await deployRecordContract('NFTokenFactory', [], deployer, 'NFTokenFactory', deploymentLogPath);

    const nftokenFactoryAddress = getContractRecord('NFTokenFactory', deploymentLogPath).address;
    const deployerFactory = await ethers.getContractFactory('Deployer_v001', {
        libraries: { NFTokenFactory: nftokenFactoryAddress },
        signer: deployer
    });

    const jbDirectoryAddress = getContractRecord('JBDirectory', platformLogPath).address;
    const jbProjectsAddress = getContractRecord('JBProjects', platformLogPath).address;
    const jbOperatorStoreAddress = getContractRecord('JBOperatorStore', platformLogPath).address;
    const deployerProxy = await upgrades.deployProxy(deployerFactory, [jbDirectoryAddress, jbProjectsAddress, jbOperatorStoreAddress], { kind: 'uups', initializer: 'initialize' });
    logger.info(`waiting for ${deployerProxy.deployTransaction.hash}`);
    await deployerProxy.deployed();
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(deployerProxy.address);
    logger.info(`deployed proxy ${deployerProxy.address} for ${implementationAddress}`);

    await verifyContract('Deployer_v001', deployerProxy.address, []);

    const deploymentLog = JSON.parse(fs.readFileSync(deploymentLogPath).toString());
    deploymentLog[hre.network.name]['DeployerProxy'] = {};
    deploymentLog[hre.network.name]['DeployerProxy']['address'] = deployerProxy.address;
    deploymentLog[hre.network.name]['DeployerProxy']['version'] = 1;
    deploymentLog[hre.network.name]['DeployerProxy']['implementation'] = implementationAddress;
    deploymentLog[hre.network.name]['DeployerProxy']['abi'] = JSON.parse(deployerFactory.interface.format('json') as string);
    deploymentLog[hre.network.name]['DeployerProxy']['verified'] = false;
    fs.writeFileSync(deploymentLogPath, JSON.stringify(deploymentLog, undefined, 4));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// npx hardhat run scripts/deploy/Deployer_v001.ts --network goerli
