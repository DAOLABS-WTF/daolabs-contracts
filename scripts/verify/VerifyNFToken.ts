import * as dotenv from 'dotenv';
import { ethers } from 'hardhat';
import * as hre from 'hardhat';
import * as winston from 'winston';

import { getContractRecord, verifyRecordContract } from '../lib/lib';

async function main() {
    dotenv.config();

    const logger = winston.createLogger({
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf((info) => {
                return `${info.timestamp}|${info.level}|${info.message}`;
            })
        ),
        transports: [
            new winston.transports.Console({
                level: 'info'
            }),
            new winston.transports.File({
                level: 'debug',
                filename: 'log/deploy/NFToken.log',
                handleExceptions: true,
                maxsize: 5 * 1024 * 1024, // 5 mb
                maxFiles: 5
            })
        ]
    });

    ///
    logger.info(`verify NFToken on ${hre.network.name}`);

    const deploymentLogPath = `./deployments/${hre.network.name}/extensions.json`;

    const [deployer] = await ethers.getSigners();
    logger.info(`connected as ${deployer.address}`);

    const record = getContractRecord('NFToken');

    const nfTokenAddress = '0x0F5f857cdD344da87f4B423E77cA5F014b8dd0A3';

    const contract = new hre.ethers.Contract(nfTokenAddress, record.abi, deployer);

    const feeOracle = await contract.feeOracle();
    const operatorStore = await contract.operatorStore();
    const jbxDirectory = await contract.jbxDirectory();
    const jbxProjects = await contract.jbxProjects();

    const nfTokenArgs = [
        {
            name: 'Space Rick Riding a Panda',
            symbol: 'SPACERICK',
            baseUri: 'ipfs://bafybeigxudd6mdwlbr3mh3o377b5pziiifc7zmsm4yq27rlghcx6qm7opa/',
            revealed: true,
            contractUri: 'ipfs://bafkreiajzuavrsvxiewfn3l7nvocz4gj7xas6t7d5l4amlgknpbeoafp2i',
            maxSupply: '250',
            unitPrice: '10000000000000000',
            mintAllowance: '10'
        },
        {
            jbxOperatorStore: operatorStore,
            jbxDirectory: jbxDirectory,
            jbxProjects: jbxProjects
        },
        feeOracle
    ];

    console.log({
        feeOracle,
        operatorStore,
        jbxDirectory,
        jbxProjects
    });

    await verifyRecordContract('NFToken', nfTokenAddress, nfTokenArgs, deploymentLogPath);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// npx hardhat run scripts/deploy/NFToken.ts --network goerli
