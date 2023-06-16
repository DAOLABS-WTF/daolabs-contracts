import * as fs from 'fs';
import * as hre from 'hardhat';

import { logger, verifyRecordContract } from './lib/lib';

async function main() {
    const files = ['platform', 'extensions'];
    for (const file of files) {
        const deploymentLogPath = `./deployments/${hre.network.name}/${file}.json`;
        let deployedContracts = JSON.parse(fs.readFileSync(deploymentLogPath).toString());

        const contractKeys = Object.keys(deployedContracts[hre.network.name]);

        for (const unverified of contractKeys) {
            await verifyRecordContract(
                unverified,
                deployedContracts[hre.network.name][unverified]['address'],
                deployedContracts[hre.network.name][unverified]['args'],
                deploymentLogPath
            );
        }
    }

    logger.info('verification complete');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// npx hardhat run scripts/verify-all.ts --network goerli
