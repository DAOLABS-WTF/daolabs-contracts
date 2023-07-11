import * as dotenv from 'dotenv';
import { ethers } from 'hardhat';
import * as hre from 'hardhat';
import * as winston from 'winston';

import { verifyRecordContract } from '../lib/lib';

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
                filename: 'log/deploy/JBToken.log',
                handleExceptions: true,
                maxsize: 5 * 1024 * 1024, // 5 mb
                maxFiles: 5
            })
        ]
    });

    ///
    logger.info(`deploying sample NFToken to ${hre.network.name}`);

    const deploymentLogPath = `./deployments/${hre.network.name}/extensions.json`;

    const [deployer] = await ethers.getSigners();
    logger.info(`connected as ${deployer.address}`);

    const address = '';
    const name = '';
    const symbol = '';
    const projectId = '';

    await verifyRecordContract('JBToken', address, [name, symbol, projectId], deploymentLogPath);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// npx hardhat run scripts/deploy/NFToken.ts --network goerli
