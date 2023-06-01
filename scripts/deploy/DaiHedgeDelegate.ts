import * as dotenv from "dotenv";
import { ethers } from 'hardhat';
import * as hre from 'hardhat';
import * as winston from 'winston';

import { deployRecordContract, getContractRecord } from '../lib/lib';

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
                filename: 'log/deploy/DaiHedgeDelegate.log',
                handleExceptions: true,
                maxsize: (5 * 1024 * 1024), // 5 mb
                maxFiles: 5
            })
        ]
    });

    ///
    logger.info(`deploying DaiHedgeDelegate to ${hre.network.name}`);

    const [deployer] = await ethers.getSigners();
    logger.info(`connected as ${deployer.address}`);

    const jbOperatorStoreAddress = getContractRecord('JBOperatorStore').address;
    const jbDirectoryAddress = getContractRecord('JBDirectory').address;
    const jbProjectsAddress = getContractRecord('JBProjects').address;
    const jbEthPaymentTerminalAddress = getContractRecord('JBETHPaymentTerminal').address;
    const jbDaiPaymentTerminalAddress = getContractRecord('JBDAIPaymentTerminal').address;
    const jbSingleTokenPaymentTerminalStoreAddress = getContractRecord('JBSingleTokenPaymentTerminalStore').address;

    deployRecordContract('DaiHedgeDelegate', [
        jbOperatorStoreAddress,
        jbDirectoryAddress,
        jbProjectsAddress,
        jbEthPaymentTerminalAddress,
        jbDaiPaymentTerminalAddress,
        jbSingleTokenPaymentTerminalStoreAddress
    ], deployer, 'DaiHedgeDelegate', `./deployments/${hre.network.name}/extensions.json`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// npx hardhat run scripts/deploy/DaiHedgeDelegate.ts --network goerli
