import * as dotenv from 'dotenv';
import { ethers } from 'hardhat';
import * as hre from 'hardhat';
import * as winston from 'winston';
import path from 'path';
import fs from 'fs';

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
                filename: 'log/token/JBToken.log',
                handleExceptions: true,
                maxsize: 5 * 1024 * 1024, // 5 mb
                maxFiles: 5
            })
        ]
    });

    ///
    logger.info(`airdroping JBToken on ${hre.network.name} network`);

    const deploymentLogPath = `./deployments/${hre.network.name}/platform.json`;

    const [deployer] = await ethers.getSigners();
    logger.info(`connected as ${deployer.address}`);

    const contractRecord = getContractRecord('JBController', deploymentLogPath);
    const contract = new hre.ethers.Contract(contractRecord.address, contractRecord.abi, deployer);

    const airdropFile = path.join(__dirname, './airdrop.json');
    const airdropJson = JSON.parse(fs.readFileSync(airdropFile).toString());

    const drops = airdropJson.airdrop;
    for (const drop of drops) {
        if (drop.done) continue;

        const projectId = airdropJson.projectId;
        const tokenCount = drop.amount;
        const beneficiary = drop.beneficiary;
        const memo = airdropJson.memo || '';
        const preferClaimedTokens = Boolean(airdropJson.preferClaimedTokens);
        const useReservedRate = Boolean(airdropJson.useReservedRate);

        const txn = await contract.mintTokensOf(
            projectId,
            hre.ethers.utils.parseEther(tokenCount.toString()),
            beneficiary,
            memo,
            preferClaimedTokens,
            useReservedRate
        );

        try {
            await txn.wait(3);

            if (txn.hash) {
                logger.info(`Minted ${tokenCount} tokens of project ${projectId} to ${beneficiary} in txn ${txn.hash}`);
                drop.done = true;
                fs.writeFileSync(airdropFile, JSON.stringify(airdropJson, null, '  '));
            }
        } catch (error) {
            console.error(error.message);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// npx hardhat run scripts/deploy/NFToken.ts --network goerli
