import * as fs from 'fs';
import * as hre from 'hardhat';
import { deployRecordContract, getContractRecord, getPlatformConstant, logger, recordContractAbi } from '../lib/lib';

async function main() {
    const deploymentLogPath = `./deployments/${hre.network.name}/platform.json`;
    if (!fs.existsSync(deploymentLogPath)) {
        fs.mkdirSync(`./deployments/${hre.network.name}`, { recursive: true })
        fs.writeFileSync(deploymentLogPath, `{ "${hre.network.name}": { }, "constants": { } }`);
    }

    logger.info(`deploying DAOLABS Juicebox v3, core platform, fork to ${hre.network.name}`);

    const [deployer] = await hre.ethers.getSigners();
    logger.info(`connected as ${deployer.address}`);

    await deployRecordContract('JBETHERC20ProjectPayerDeployer', [], deployer);
    await deployRecordContract('JBETHERC20SplitsPayerDeployer', [], deployer);
    await deployRecordContract('JBOperatorStore', [], deployer);
    await deployRecordContract('JBPrices', [deployer.address], deployer);

    const jbOperatorStoreAddress = getContractRecord('JBOperatorStore').address;
    await deployRecordContract('JBProjects', [jbOperatorStoreAddress], deployer);

    const transactionCount = await deployer.getTransactionCount();
    const expectedFundingCycleStoreAddress = hre.ethers.utils.getContractAddress({ from: deployer.address, nonce: transactionCount + 1 });
    const jbProjectsAddress = getContractRecord('JBProjects').address;
    await deployRecordContract('JBDirectory', [jbOperatorStoreAddress, jbProjectsAddress, expectedFundingCycleStoreAddress, deployer.address], deployer);

    const jbDirectoryAddress = getContractRecord('JBDirectory').address;
    await deployRecordContract('JBFundingCycleStore', [jbDirectoryAddress], deployer);

    const jbFundingCycleStoreAddress = getContractRecord('JBFundingCycleStore').address;
    await deployRecordContract('JBTokenStore', [jbOperatorStoreAddress, jbProjectsAddress, jbDirectoryAddress, jbFundingCycleStoreAddress], deployer);

    await deployRecordContract('JBSplitsStore', [jbOperatorStoreAddress, jbProjectsAddress, jbDirectoryAddress], deployer);
    await deployRecordContract('JBFundAccessConstraintsStore', [jbDirectoryAddress], deployer);

    const jbTokenStoreAddress = getContractRecord('JBTokenStore').address;
    const jbSplitStoreAddress = getContractRecord('JBSplitsStore').address;
    const jbFundAccessConstraintsStoreAddress = getContractRecord('JBFundAccessConstraintsStore').address;
    await deployRecordContract('JBController3_1', [jbOperatorStoreAddress, jbProjectsAddress, jbDirectoryAddress, jbFundingCycleStoreAddress, jbTokenStoreAddress, jbSplitStoreAddress, jbFundAccessConstraintsStoreAddress], deployer, 'JBController');

    const jbPricesAddress = getContractRecord('JBPrices').address;
    await deployRecordContract('JBSingleTokenPaymentTerminalStore3_1', [jbDirectoryAddress, jbFundingCycleStoreAddress, jbPricesAddress], deployer, 'JBSingleTokenPaymentTerminalStore');

    await deployRecordContract('JBCurrencies', [], deployer);

    const jbCurrencies_ETH = getPlatformConstant('JBCurrencies_ETH');
    const jbSingleTokenPaymentTerminalStoreAddress = getContractRecord('JBSingleTokenPaymentTerminalStore').address;
    await deployRecordContract('JBETHPaymentTerminal3_1', [jbCurrencies_ETH, jbOperatorStoreAddress, jbProjectsAddress, jbDirectoryAddress, jbSplitStoreAddress, jbPricesAddress, jbSingleTokenPaymentTerminalStoreAddress, deployer.address], deployer, 'JBETHPaymentTerminal');

    const jbCurrencies_USD = getPlatformConstant('JBCurrencies_USD');
    const usdToken = getPlatformConstant('usdToken');
    await deployRecordContract(
        'JBERC20PaymentTerminal3_1',
        [
            usdToken,
            jbCurrencies_USD,
            jbCurrencies_ETH,
            2, // _payoutSplitsGroup, 2 = eth
            jbOperatorStoreAddress,
            jbProjectsAddress,
            jbDirectoryAddress,
            jbSplitStoreAddress,
            jbPricesAddress,
            jbSingleTokenPaymentTerminalStoreAddress,
            deployer.address],
        deployer,
        'JBDAIPaymentTerminal'
    );

    const jbETHPaymentTerminalAddress = getContractRecord('JBETHPaymentTerminal').address;
    const jbDAIPaymentTerminalAddress = getContractRecord('JBDAIPaymentTerminal').address;
    await deployRecordContract(
        'DaiHedgeDelegate',
        [
            jbOperatorStoreAddress,
            jbDirectoryAddress,
            jbProjectsAddress,
            jbETHPaymentTerminalAddress,
            jbDAIPaymentTerminalAddress,
            jbSingleTokenPaymentTerminalStoreAddress
        ],
        deployer);

    const daySeconds = 60 * 60 * 24;
    await deployRecordContract('JBReconfigurationBufferBallot', [daySeconds], deployer, 'JB1DayReconfigurationBufferBallot');
    await deployRecordContract('JBReconfigurationBufferBallot', [daySeconds * 3], deployer, 'JB3DayReconfigurationBufferBallot');
    await deployRecordContract('JBReconfigurationBufferBallot', [daySeconds * 7], deployer, 'JB7DayReconfigurationBufferBallot');

    logger.info('deployment complete');
    logger.info('deploying DAOLABS extensions');

    await deployRecordContract('RoleManager', [jbDirectoryAddress, jbOperatorStoreAddress, jbProjectsAddress, deployer.address], deployer);

    await deployRecordContract('VestingPlanManager', [], deployer);

    // await deployRecordContract('VeNftDeployer', [jbProjectsAddress, jbOperatorStoreAddress], deployer);

    await recordContractAbi('OperatorFilter', deployer);
    await recordContractAbi('NFToken', deployer);
    // await recordContractAbi('JBVeNft', deployer);
    // await recordContractAbi('VeTokenUriResolver', deployer);

    logger.info('deployment complete');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// npx hardhat run scripts/platform/deploy.ts --network goerli
