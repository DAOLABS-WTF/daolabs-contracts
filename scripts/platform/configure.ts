import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import * as hre from 'hardhat';

import { deployRecordContract, getContractRecord, getPlatformConstant, logger } from '../lib/lib';
import { getTiered721DelegateData } from '../lib/nftRewards';
import { BigNumber, ContractReceipt } from 'ethers';

async function miscConfiguration(deployer: SignerWithAddress) {
    const jbDirectoryRecord = getContractRecord('JBDirectory');
    const jbControllerRecord = getContractRecord('JBController');

    const jbDirectoryContract = await hre.ethers.getContractAt(jbDirectoryRecord['abi'], jbDirectoryRecord['address'], deployer);

    const isAllowedToSetFirstController = await jbDirectoryContract
        .connect(deployer)
        ['isAllowedToSetFirstController(address)'](jbControllerRecord['address']);

    if (!isAllowedToSetFirstController) {
        const tx = await jbDirectoryContract.connect(deployer)['setIsAllowedToSetFirstController(address,bool)'](jbControllerRecord['address'], true);
        await tx.wait();

        logger.info(`set setIsAllowedToSetFirstController on JBDirectory at ${jbDirectoryRecord['address']} to true`);
    } else {
        logger.info(`setIsAllowedToSetFirstController on JBDirectory at ${jbDirectoryRecord['address']} already configured`);
    }
}

async function configureEtherPriceFeed(deployer: SignerWithAddress) {
    const jbPriceRecord = getContractRecord('JBPrices');
    const jbPricesContract = await hre.ethers.getContractAt(jbPriceRecord['abi'], jbPriceRecord['address'], deployer);
    const jbCurrencies_ETH = getPlatformConstant('JBCurrencies_ETH');
    const jbCurrencies_USD = getPlatformConstant('JBCurrencies_USD');

    const chainlinkV2UsdEthPriceFeed = getPlatformConstant('chainlinkV2UsdEthPriceFeed');
    if (chainlinkV2UsdEthPriceFeed === undefined) {
        logger.error(`Chainlink USD/ETH price feed not specified`);
        return;
    }

    const usdEthFeedAddress = await jbPricesContract.connect(deployer)['feedFor(uint256,uint256)'](jbCurrencies_USD, jbCurrencies_ETH);
    if (usdEthFeedAddress !== hre.ethers.constants.AddressZero) {
        logger.info(`Chainlink USD/ETH price feed already set on JBPrices at ${jbPriceRecord['address']}`);
        return;
    }

    await deployRecordContract('JBChainlinkV3PriceFeed', [chainlinkV2UsdEthPriceFeed], deployer);

    const priceFeedAddress = getContractRecord('JBChainlinkV3PriceFeed').address;
    await jbPricesContract.connect(deployer)['addFeedFor(uint256,uint256,address)'](jbCurrencies_USD, jbCurrencies_ETH, priceFeedAddress);

    logger.info(`set Chainlink USD/ETH price feed on JBPrices at ${jbPriceRecord['address']} to ${priceFeedAddress}`);
}

async function deployParentProject(deployer: SignerWithAddress) {
    const jbProjectsRecord = getContractRecord('JBProjects');
    const jbProjectsContract = await hre.ethers.getContractAt(jbProjectsRecord['abi'], jbProjectsRecord['address'], deployer);

    if (((await jbProjectsContract['count()']()) as BigNumber).toNumber() === 0) {
        logger.info('launching parent project');

        const tokenBeneficiaries = getPlatformConstant('tokenSplits', []);
        const payoutBeneficiaries = getPlatformConstant('payoutSplits', []);

        let reserveTokenSplits = [];
        let payoutSplits = [];
        let reserveTokenSplitShare = 0;
        let payoutSplitShare = 0;

        tokenBeneficiaries.map((beneficiary) => {
            reserveTokenSplits.push({
                preferClaimed: false,
                preferAddToBalance: false,
                percent: beneficiary.share,
                projectId: 0,
                beneficiary: beneficiary.address,
                lockedUntil: 0,
                allocator: hre.ethers.constants.AddressZero
            });
            reserveTokenSplitShare += beneficiary.share;
        });

        payoutBeneficiaries.map((beneficiary) => {
            payoutSplits.push({
                preferClaimed: false,
                preferAddToBalance: false,
                percent: beneficiary.share,
                projectId: 0,
                beneficiary: beneficiary.address,
                lockedUntil: 0,
                allocator: hre.ethers.constants.AddressZero
            });
            payoutSplitShare += beneficiary.share;
        });

        if (reserveTokenSplitShare > 1_000_000_000) {
            throw new Error(`Invalid beneficiary token split total: ${reserveTokenSplitShare}.`);
        }

        if (payoutSplitShare > 1_000_000_000) {
            throw new Error(`Invalid beneficiary payout split total: ${payoutSplitShare}.`);
        }

        const primaryBeneficiary = getPlatformConstant('primaryBeneficiary', deployer.address);
        if (reserveTokenSplitShare < 1_000_000_000) {
            reserveTokenSplits.push({
                preferClaimed: false,
                preferAddToBalance: false,
                percent: 1_000_000_000 - reserveTokenSplitShare,
                projectId: 0,
                beneficiary: primaryBeneficiary,
                lockedUntil: 0,
                allocator: hre.ethers.constants.AddressZero
            });
        }

        if (payoutSplitShare < 1_000_000_000) {
            payoutSplits.push({
                preferClaimed: false,
                preferAddToBalance: false,
                percent: 1_000_000_000 - payoutSplitShare,
                projectId: 0,
                beneficiary: primaryBeneficiary,
                lockedUntil: 0,
                allocator: hre.ethers.constants.AddressZero
            });
        }

        const groupedSplits = [
            { group: 1, splits: reserveTokenSplits },
            { group: 2, splits: payoutSplits }
        ];

        const jb3DayReconfigurationBufferBallotRecord = getContractRecord('JB3DayReconfigurationBufferBallot');
        const jbETHPaymentTerminalRecord = getContractRecord('JBETHPaymentTerminal');
        const jbDAIPaymentTerminalRecord = getContractRecord('JBDAIPaymentTerminal');
        const jbControllerRecord = getContractRecord('JBController');
        const jbControllerContract = await hre.ethers.getContractAt(jbControllerRecord['abi'], jbControllerRecord['address'], deployer);
        const platformOwnerAddress = getPlatformConstant('platformOwner', deployer.address);

        const domain = 0;
        const projectMetadataCID = getPlatformConstant('projectMetadataCID', getPlatformConstant('platformMetadataCID'));
        const projectMetadata = [projectMetadataCID, domain];

        const protocolLaunchDate = getPlatformConstant('protocolLaunchDate', Math.floor(Date.now() / 1000) - 10);

        const duration = 3600 * 24 * 30; // 30 days
        const weight = hre.ethers.utils.parseUnits('1000000', 18); // 1M tokens/eth
        const discountRate = 0; // 0%
        const ballot = jb3DayReconfigurationBufferBallotRecord['address'];
        const fundingCycleData = [duration, weight, discountRate, ballot];

        const allowSetTerminals = Number(false);
        const allowSetController = Number(true);
        const pauseTransfer = Number(true);
        const global = [allowSetTerminals, allowSetController, pauseTransfer];

        const reservedRate = 5000; // 50%
        const redemptionRate = 10_000; // 100%
        const ballotRedemptionRate = 10_000;
        const pausePay = Number(false);
        const pauseDistributions = Number(false);
        const pauseRedeem = Number(false);
        const pauseBurn = Number(false);
        const allowMinting = Number(false);
        const allowTerminalMigration = Number(false);
        const allowControllerMigration = Number(false);
        const holdFees = Number(false);
        const preferClaimedTokenOverride = Number(false);
        const useTotalOverflowForRedemptions = Number(false);
        const useDataSourceForPay = Number(false);
        const useDataSourceForRedeem = Number(false);
        const dataSource = hre.ethers.constants.AddressZero;
        const metadata = 0;
        const fundingCycleMetadata = [
            global,
            reservedRate,
            redemptionRate,
            ballotRedemptionRate,
            pausePay,
            pauseDistributions,
            pauseRedeem,
            pauseBurn,
            allowMinting,
            allowTerminalMigration,
            allowControllerMigration,
            holdFees,
            preferClaimedTokenOverride,
            useTotalOverflowForRedemptions,
            useDataSourceForPay,
            useDataSourceForRedeem,
            dataSource,
            metadata
        ];

        const fundAccessConstraints = [
            {
                terminal: jbETHPaymentTerminalRecord['address'],
                token: getPlatformConstant('ethToken'),
                distributionLimit: hre.ethers.utils.parseEther('10'), // TODO: config param
                distributionLimitCurrency: getPlatformConstant('JBCurrencies_ETH'),
                overflowAllowance: 0,
                overflowAllowanceCurrency: getPlatformConstant('JBCurrencies_ETH')
            },
            {
                terminal: jbETHPaymentTerminalRecord['address'],
                token: getPlatformConstant('usdToken'),
                distributionLimit: hre.ethers.utils.parseUnits('70000', 18), // TODO: config param
                distributionLimitCurrency: getPlatformConstant('JBCurrencies_USD'),
                overflowAllowance: 0,
                overflowAllowanceCurrency: getPlatformConstant('JBCurrencies_USD')
            }
        ];

        const terminals = [jbETHPaymentTerminalRecord['address'], jbDAIPaymentTerminalRecord['address']];

        const projectData = [
            projectMetadata,
            fundingCycleData,
            fundingCycleMetadata,
            protocolLaunchDate,
            groupedSplits,
            fundAccessConstraints,
            terminals,
            ''
        ];

        const jbTiered721DelegateProjectDeployerRecord = getContractRecord(
            'JBTiered721DelegateProjectDeployer',
            `./deployments/${hre.network.name}/nft-rewards.json`
        );
        const jbTiered721DelegateProjectDeployerContract = await hre.ethers.getContractAt(
            jbTiered721DelegateProjectDeployerRecord['abi'],
            jbTiered721DelegateProjectDeployerRecord['address'],
            deployer
        );
        const jbDirectoryAddress = getContractRecord('JBDirectory').address;
        const jbFundingCycleStoreAddress = getContractRecord('JBFundingCycleStore').address;
        const jbPricesAddress = getContractRecord('JBPrices').address;
        const jbTiered721DelegateStoreAddress = getContractRecord(
            'JBTiered721DelegateStore',
            `./deployments/${hre.network.name}/nft-rewards.json`
        ).address;

        const collectionInfo = getPlatformConstant('collectionInfo');
        const defaultTier = getPlatformConstant('defaultTier');

        const tiered721DelegateData = await getTiered721DelegateData(
            platformOwnerAddress,
            {
                ...collectionInfo,
                rewardTiers: [defaultTier]
            },
            {
                JBDirectoryAddress: jbDirectoryAddress,
                JBFundingCycleStoreAddress: jbFundingCycleStoreAddress,
                JBPricesAddress: jbPricesAddress,
                JBTiered721DelegateStoreAddress: jbTiered721DelegateStoreAddress
            }
        );

        logger.info(`tiered721DelegateData = ${JSON.stringify(tiered721DelegateData)}`);

        let tx = await jbTiered721DelegateProjectDeployerContract
            .connect(deployer)
            ['launchProjectFor'](platformOwnerAddress, tiered721DelegateData, projectData);

        let receipt: ContractReceipt = await tx.wait();
        logger.info('launched parent project');

        const launchProjectEvent = receipt.events.find((e) =>
            e.topics.includes(hre.ethers.utils.id(`LaunchProject(uint256,uint256,string,address)`))
        );
        const [configuration, projectId, memo, caller] = hre.ethers.utils.defaultAbiCoder.decode(
            ['uint256', 'uint256', 'string', 'address'],
            launchProjectEvent.data
        );
        const jbTokenStoreRecord = getContractRecord('JBTokenStore');
        const jbTokenStoreContract = await hre.ethers.getContractAt(jbTokenStoreRecord['abi'], jbTokenStoreRecord['address'], deployer);
        tx = await jbTokenStoreContract
            .connect(deployer)
            ['issueFor'](projectId, getPlatformConstant('platformTokenName'), getPlatformConstant('platformTokenSymbol'));
        receipt = await tx.wait();

        logger.info('deployed parent project token');
    } else {
        logger.info('parent project appears to exist');
    }
}

async function transferOwnership(deployer: SignerWithAddress) {
    let platformOwnerAddress: any;
    try {
        platformOwnerAddress = getPlatformConstant('platformOwner');
    } catch {
        logger.info(`Platform owner not specified`);
        return;
    }

    const jbPriceRecord = getContractRecord('JBPrices');
    const jbPricesContract = await hre.ethers.getContractAt(jbPriceRecord['abi'], jbPriceRecord['address'], deployer);
    if ((await jbPricesContract['owner()']) != platformOwnerAddress) {
        const tx = await jbPricesContract.connect(deployer)['transferOwnership(address)'](platformOwnerAddress);
        await tx.wait();
        logger.info(`transferred ownership of JBPrices at ${jbPriceRecord['address']} to ${platformOwnerAddress}`);
    }

    const jbDirectoryRecord = getContractRecord('JBDirectory');
    const jbDirectoryContract = await hre.ethers.getContractAt(jbDirectoryRecord['abi'], jbDirectoryRecord['address'], deployer);
    if ((await jbDirectoryContract.connect(deployer)['owner()']) != platformOwnerAddress) {
        let tx = await jbDirectoryContract.connect(deployer)['transferOwnership(address)'](platformOwnerAddress);
        await tx.wait();
        logger.info(`transferred ownership of JBDirectory at ${jbDirectoryRecord['address']} to ${platformOwnerAddress}`);
    }

    const jbProjectsRecord = getContractRecord('JBProjects');
    const jbProjectsContract = await hre.ethers.getContractAt(jbProjectsRecord['abi'], jbProjectsRecord['address'], deployer);
    if ((await jbProjectsContract['ownerOf'](1)) != platformOwnerAddress) {
        let tx = await jbProjectsContract.connect(deployer)['transferFrom(address,address,uint256)'](deployer.address, platformOwnerAddress, 1);
        await tx.wait();
        logger.info(`transferred ownership of project 1 to ${platformOwnerAddress}`);
    }
}

async function main() {
    logger.info(`configuring DAOLABS Juicebox v3 fork on ${hre.network.name}`);

    const [deployer] = await hre.ethers.getSigners();
    logger.info(`connected as ${deployer.address}`);

    await miscConfiguration(deployer);
    await configureEtherPriceFeed(deployer);
    await deployParentProject(deployer);
    await transferOwnership(deployer);

    logger.info('configuration complete');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// npx hardhat run scripts/platform/configure.ts --network goerli
