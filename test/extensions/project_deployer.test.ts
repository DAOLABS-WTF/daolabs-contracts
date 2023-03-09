import { expect } from 'chai';
import { ethers } from 'hardhat';
import { smock } from '@defi-wonderland/smock';

import jbController from '../../artifacts/contracts/JBController.sol/JBController.json';
import jbTokenStore from '../../artifacts/contracts/JBTokenStore.sol/JBTokenStore.json';
import jbDirectory from '../../artifacts/contracts/JBDirectory.sol/JBDirectory.json';
import jbProjects from '../../artifacts/contracts/JBProjects.sol/JBProjects.json';
import jbOperatorStore from '../../artifacts/contracts/JBOperatorStore.sol/JBOperatorStore.json';
import deployer_v007 from '../../artifacts/contracts/extensions/deployer/Deployer_v007.sol/Deployer_v007.json';

import { getContractRecord, getPlatformConstant } from '../../scripts/lib/lib';

const testNetwork = 'goerli';

describe('ProjectDeployer Tests', () => {
    let deployer;
    let accounts;
    let projectDeployer;

    before(async () => {
        [deployer, ...accounts] = await ethers.getSigners();

        const mockJbController = await smock.fake(jbController.abi);
        const mockJbTokenStore = await smock.fake(jbTokenStore.abi);
        const mockJbDirectory = await smock.fake(jbDirectory.abi);
        const mockJbProjects = await smock.fake(jbProjects.abi);
        const mockJbOperatorStore = await smock.fake(jbOperatorStore.abi);
        const mockDeployer = await smock.fake(deployer_v007.abi);

        const projectDeployerFactory = await ethers.getContractFactory('ProjectDeployer');
        projectDeployer = await projectDeployerFactory.connect(deployer).deploy(
            mockJbController.address,
            mockJbTokenStore.address,
            mockJbDirectory.address,
            mockJbProjects.address,
            mockJbOperatorStore.address,
            mockDeployer.address
        );
        await projectDeployer.deployed();

        mockJbTokenStore.issueFor.returns(accounts[1].address);
        mockDeployer.deployProjectPayer.returns(accounts[1].address);
    });

    it('createProject()', async () => {
        const platformDeploymentLogPath = `./deployments/${testNetwork}/platform.json`;

        const JBCurrencies_ETH = getPlatformConstant('JBCurrencies_ETH', 1, platformDeploymentLogPath);
        const ethToken = getPlatformConstant('ethToken', '0x000000000000000000000000000000000000EEEe', platformDeploymentLogPath);

        const jbETHPaymentTerminalInfo = getContractRecord('JBETHPaymentTerminal', platformDeploymentLogPath, testNetwork);

        const owner = accounts[0].address;
        const domain = 0;
        const projectMetadataCID = '';
        const projectMetadata = [projectMetadataCID, domain];

        const duration = 60; // seconds
        const weight = ethers.utils.parseUnits('1', 18);
        const discountRate = 0; // 0%
        const ballot = ethers.constants.AddressZero;
        const fundingCycleData = [duration, weight, discountRate, ballot];

        const mustStartAtOrAfter = 0;
        const groupedSplits = [];
        const allowSetTerminals = true;
        const allowSetController = true;
        const pauseTransfer = true;
        const global = [allowSetTerminals, allowSetController, pauseTransfer];

        const reservedRate = 0;
        const redemptionRate = 10_000; // 100%
        const ballotRedemptionRate = 10_000;
        const pausePay = false;
        const pauseDistributions = false;
        const pauseRedeem = false;
        const pauseBurn = false;
        const allowMinting = false;
        const allowTerminalMigration = false;
        const allowControllerMigration = false;
        const holdFees = false;
        const preferClaimedTokenOverride = false;
        const useTotalOverflowForRedemptions = true;
        const useDataSourceForPay = false;
        const useDataSourceForRedeem = false;
        const dataSource = ethers.constants.AddressZero;
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

        const fundAccessConstraints = [{
            terminal: jbETHPaymentTerminalInfo.address,
            token: ethToken,
            distributionLimit: ethers.utils.parseEther('1'),
            distributionLimitCurrency: JBCurrencies_ETH,
            overflowAllowance: 0,
            overflowAllowanceCurrency: JBCurrencies_ETH
        }];

        const terminals = [jbETHPaymentTerminalInfo.address];

        const memo = '';

        const tx = await projectDeployer.createProject(owner, projectMetadata, fundingCycleData, fundingCycleMetadata, mustStartAtOrAfter, groupedSplits, fundAccessConstraints, terminals, memo);
        await expect(tx).not.to.be.reverted;
    });

    it('deployProjectToken()', async () => {
        const projectId = 99;
        const tokenName = '';
        const tokenSymbol = '';

        await expect(projectDeployer.deployProjectToken(projectId, tokenName, tokenSymbol)).not.to.be.reverted;
    });
});

// npx hardhat test test/extensions/project_deployer.test.ts
