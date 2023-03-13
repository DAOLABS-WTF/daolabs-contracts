import { expect } from 'chai';
import { ethers } from 'hardhat';
import { smock } from '@defi-wonderland/smock';

import jbDirectory from '../../artifacts/contracts/JBDirectory.sol/JBDirectory.json';
import jbOperatorStore from '../../artifacts/contracts/JBOperatorStore.sol/JBOperatorStore.json';
import jbProjects from '../../artifacts/contracts/JBProjects.sol/JBProjects.json';
import jbFundingCycleDataSource from '../../artifacts/contracts/interfaces/IJBFundingCycleDataSource.sol/IJBFundingCycleDataSource.json';

describe('DatasourceProxy Tests', () => {
    const JBOperations_PROCESS_FEES = 5;

    let deployer;
    let accounts;

    let projectId = 2;

    let mockJbDirectory: any;
    let mockJbOperatorStore: any;
    let mockJbProjects: any

    before('Initialize accounts', async () => {
        [deployer, ...accounts] = await ethers.getSigners();
    });

    before('Setup JBX components', async () => {
        mockJbDirectory = await smock.fake(jbDirectory.abi);
        mockJbOperatorStore = await smock.fake(jbOperatorStore.abi);
        mockJbProjects = await smock.fake(jbProjects.abi);

        mockJbDirectory.controllerOf.whenCalledWith(projectId).returns(accounts[0].address);

        mockJbOperatorStore.hasPermission.whenCalledWith(accounts[0].address, accounts[0].address, projectId, JBOperations_PROCESS_FEES).returns(true);
        mockJbOperatorStore.hasPermission.whenCalledWith(accounts[0].address, accounts[0].address, 0, JBOperations_PROCESS_FEES).returns(false);
        mockJbOperatorStore.hasPermission.whenCalledWith(deployer.address, accounts[0].address, projectId, JBOperations_PROCESS_FEES).returns(false);
        mockJbOperatorStore.hasPermission.whenCalledWith(deployer.address, accounts[0].address, 0, JBOperations_PROCESS_FEES).returns(true);
        mockJbOperatorStore.hasPermission.whenCalledWith(accounts[1].address, accounts[0].address, projectId, JBOperations_PROCESS_FEES).returns(false);
        mockJbOperatorStore.hasPermission.whenCalledWith(accounts[1].address, accounts[0].address, 0, JBOperations_PROCESS_FEES).returns(false);

        mockJbProjects.ownerOf.whenCalledWith(projectId).returns(accounts[0].address);
    });

    it('DatasourceProxy constructor(): fail due to permissions', async () => {
        const datasourceProxyFactory = await ethers.getContractFactory('DatasourceProxy');
        await expect(datasourceProxyFactory.connect(deployer).deploy(mockJbDirectory.address, mockJbProjects.address, mockJbOperatorStore.address, projectId, []))
            .to.be.reverted;
    });

    it('DatasourceProxy constructor(): success, empty delegate list', async () => {
        const datasourceProxyFactory = await ethers.getContractFactory('DatasourceProxy');
        const datasourceProxy = await datasourceProxyFactory.connect(accounts[0]).deploy(mockJbDirectory.address, mockJbProjects.address, mockJbOperatorStore.address, projectId, []);
        await datasourceProxy.deployed();

        await expect(datasourceProxy.delegates(0)).to.be.reverted;
    });

    it('DatasourceProxy constructor(): success, non-empty delegate list', async () => {
        const datasourceProxyFactory = await ethers.getContractFactory('DatasourceProxy');
        const datasourceProxy = await datasourceProxyFactory.connect(accounts[0]).deploy(mockJbDirectory.address, mockJbProjects.address, mockJbOperatorStore.address, projectId, [accounts[1].address, accounts[2].address, accounts[3].address]);
        await datasourceProxy.deployed();

        expect(await datasourceProxy.delegates(0)).to.equal(accounts[1].address);
        expect(await datasourceProxy.delegates(2)).to.equal(accounts[3].address);
    });

    it('DatasourceProxy registerDelegate(): success, empty list', async () => {
        const datasourceProxyFactory = await ethers.getContractFactory('DatasourceProxy');
        const datasourceProxy = await datasourceProxyFactory.connect(accounts[0]).deploy(mockJbDirectory.address, mockJbProjects.address, mockJbOperatorStore.address, projectId, []);
        await datasourceProxy.deployed();

        await datasourceProxy.connect(accounts[0]).registerDelegate(accounts[1].address, 0);
        expect(await datasourceProxy.delegates(0)).to.equal(accounts[1].address);
    });

    it('DatasourceProxy registerDelegate(): success, non-empty list, incorrect order', async () => {
        const datasourceProxyFactory = await ethers.getContractFactory('DatasourceProxy');
        const datasourceProxy = await datasourceProxyFactory.connect(accounts[0]).deploy(mockJbDirectory.address, mockJbProjects.address, mockJbOperatorStore.address, projectId, [accounts[1].address, accounts[2].address, accounts[3].address]);
        await datasourceProxy.deployed();

        await datasourceProxy.connect(accounts[0]).registerDelegate(accounts[4].address, 5);
        expect(await datasourceProxy.delegates(3)).to.equal(accounts[4].address);
    });

    it('DatasourceProxy registerDelegate(): success, non-empty delegate list, start', async () => {
        const datasourceProxyFactory = await ethers.getContractFactory('DatasourceProxy');
        const datasourceProxy = await datasourceProxyFactory.connect(accounts[0]).deploy(mockJbDirectory.address, mockJbProjects.address, mockJbOperatorStore.address, projectId, [accounts[1].address, accounts[2].address, accounts[3].address]);
        await datasourceProxy.deployed();

        await datasourceProxy.connect(accounts[0]).registerDelegate(accounts[4].address, 0);
        expect(await datasourceProxy.delegates(0)).to.equal(accounts[4].address);
        expect(await datasourceProxy.delegates(1)).to.equal(accounts[1].address);
        expect(await datasourceProxy.delegates(2)).to.equal(accounts[2].address);
        expect(await datasourceProxy.delegates(3)).to.equal(accounts[3].address);
    });

    it('DatasourceProxy registerDelegate(): success, non-empty delegate list, middle', async () => {
        const datasourceProxyFactory = await ethers.getContractFactory('DatasourceProxy');
        const datasourceProxy = await datasourceProxyFactory.connect(accounts[0]).deploy(mockJbDirectory.address, mockJbProjects.address, mockJbOperatorStore.address, projectId, [accounts[1].address, accounts[2].address, accounts[3].address]);
        await datasourceProxy.deployed();

        await datasourceProxy.connect(accounts[0]).registerDelegate(accounts[4].address, 1);
        expect(await datasourceProxy.delegates(0)).to.equal(accounts[1].address);
        expect(await datasourceProxy.delegates(1)).to.equal(accounts[4].address);
        expect(await datasourceProxy.delegates(2)).to.equal(accounts[2].address);
        expect(await datasourceProxy.delegates(3)).to.equal(accounts[3].address);
    });

    it('DatasourceProxy registerDelegate(): fail, permissions', async () => {
        const datasourceProxyFactory = await ethers.getContractFactory('DatasourceProxy');
        const datasourceProxy = await datasourceProxyFactory.connect(accounts[0]).deploy(mockJbDirectory.address, mockJbProjects.address, mockJbOperatorStore.address, projectId, []);
        await datasourceProxy.deployed();

        await expect(datasourceProxy.connect(accounts[1]).registerDelegate(accounts[1].address, 0)).to.be.reverted;
    });

    it('DatasourceProxy removeDelegate(): fail, permissions', async () => {
        const datasourceProxyFactory = await ethers.getContractFactory('DatasourceProxy');
        const datasourceProxy = await datasourceProxyFactory.connect(accounts[0]).deploy(mockJbDirectory.address, mockJbProjects.address, mockJbOperatorStore.address, projectId, []);
        await datasourceProxy.deployed();

        await expect(datasourceProxy.connect(accounts[1]).removeDelegate(accounts[1].address)).to.be.reverted;
    });

    it('DatasourceProxy removeDelegate(): success, remove first', async () => {
        const datasourceProxyFactory = await ethers.getContractFactory('DatasourceProxy');
        const datasourceProxy = await datasourceProxyFactory.connect(accounts[0]).deploy(mockJbDirectory.address, mockJbProjects.address, mockJbOperatorStore.address, projectId, [accounts[1].address, accounts[2].address, accounts[3].address]);
        await datasourceProxy.deployed();

        await datasourceProxy.connect(accounts[0]).removeDelegate(accounts[1].address);
        expect(await datasourceProxy.delegates(0)).to.equal(accounts[2].address);
        expect(await datasourceProxy.delegates(1)).to.equal(accounts[3].address);
        await expect(datasourceProxy.delegates(2)).to.be.reverted;
    });

    it('DatasourceProxy removeDelegate(): success, remove last', async () => {
        const datasourceProxyFactory = await ethers.getContractFactory('DatasourceProxy');
        const datasourceProxy = await datasourceProxyFactory.connect(accounts[0]).deploy(mockJbDirectory.address, mockJbProjects.address, mockJbOperatorStore.address, projectId, [accounts[1].address, accounts[2].address, accounts[3].address]);
        await datasourceProxy.deployed();

        await datasourceProxy.connect(accounts[0]).removeDelegate(accounts[3].address);
        expect(await datasourceProxy.delegates(0)).to.equal(accounts[1].address);
        expect(await datasourceProxy.delegates(1)).to.equal(accounts[2].address);
        await expect(datasourceProxy.delegates(2)).to.be.reverted;
    });

    it('DatasourceProxy removeDelegate(): success, remove middle', async () => {
        const datasourceProxyFactory = await ethers.getContractFactory('DatasourceProxy');
        const datasourceProxy = await datasourceProxyFactory.connect(accounts[0]).deploy(mockJbDirectory.address, mockJbProjects.address, mockJbOperatorStore.address, projectId, [accounts[1].address, accounts[2].address, accounts[3].address]);
        await datasourceProxy.deployed();

        await datasourceProxy.connect(accounts[0]).removeDelegate(accounts[2].address);
        expect(await datasourceProxy.delegates(0)).to.equal(accounts[1].address);
        expect(await datasourceProxy.delegates(1)).to.equal(accounts[3].address);
        await expect(datasourceProxy.delegates(2)).to.be.reverted;
    });

    it('DatasourceProxy removeDelegate(): fail, invalid delegate', async () => {
        const datasourceProxyFactory = await ethers.getContractFactory('DatasourceProxy');
        const datasourceProxy = await datasourceProxyFactory.connect(accounts[0]).deploy(mockJbDirectory.address, mockJbProjects.address, mockJbOperatorStore.address, projectId, [accounts[1].address, accounts[2].address, accounts[3].address]);
        await datasourceProxy.deployed();

        await expect(datasourceProxy.connect(accounts[0]).removeDelegate(accounts[4].address)).to.be.revertedWithCustomError(datasourceProxy, 'INVALID_DELEGATE');
        expect(await datasourceProxy.delegates(0)).to.equal(accounts[1].address);
        expect(await datasourceProxy.delegates(1)).to.equal(accounts[2].address);
        expect(await datasourceProxy.delegates(2)).to.equal(accounts[3].address);
    });

    it('DatasourceProxy payParams()', async () => {
        const mockDatasourceA = await smock.fake(jbFundingCycleDataSource.abi);
        mockDatasourceA.payParams.returns([0, '', [{ delegate: mockDatasourceA.address, amount: ethers.utils.parseEther('1') }]]);

        const mockDatasourceB = await smock.fake(jbFundingCycleDataSource.abi);
        mockDatasourceB.payParams.returns([0, '', [{ delegate: mockDatasourceB.address, amount: ethers.utils.parseEther('0.5') }]]);

        const datasourceProxyFactory = await ethers.getContractFactory('DatasourceProxy');
        const datasourceProxy = await datasourceProxyFactory.connect(accounts[0]).deploy(mockJbDirectory.address, mockJbProjects.address, mockJbOperatorStore.address, projectId, [mockDatasourceA.address, mockDatasourceB.address]);
        await datasourceProxy.deployed();

        const payParamsData = {
            terminal: ethers.constants.AddressZero,
            payer: ethers.constants.AddressZero,
            amount: { token: '0x000000000000000000000000000000000000EEEe', value: 0, decimals: 18, currency: 1 },
            projectId: 0,
            currentFundingCycleConfiguration: 0,
            beneficiary: ethers.constants.AddressZero,
            weight: 0,
            reservedRate: 0,
            memo: '',
            metadata: '0x00'
        };

        const payParamsResult = await datasourceProxy.connect(accounts[0]).payParams(payParamsData);
    });

    it('DatasourceProxy redeemParams()', async () => {
        const mockDatasourceA = await smock.fake(jbFundingCycleDataSource.abi);
        mockDatasourceA.redeemParams.returns([0, '', [{ delegate: mockDatasourceA.address, amount: ethers.utils.parseEther('0.5') }]]);

        const mockDatasourceB = await smock.fake(jbFundingCycleDataSource.abi);
        mockDatasourceB.redeemParams.returns([0, '', [{ delegate: mockDatasourceB.address, amount: ethers.utils.parseEther('0.5') }]]);

        const datasourceProxyFactory = await ethers.getContractFactory('DatasourceProxy');
        const datasourceProxy = await datasourceProxyFactory.connect(accounts[0]).deploy(mockJbDirectory.address, mockJbProjects.address, mockJbOperatorStore.address, projectId, [mockDatasourceA.address, mockDatasourceB.address]);
        await datasourceProxy.deployed();

        const redeemParamsData = {
            terminal: ethers.constants.AddressZero,
            holder: ethers.constants.AddressZero,
            projectId: 0,
            currentFundingCycleConfiguration: 0,
            tokenCount: 0,
            totalSupply: 0,
            overflow: 0,
            reclaimAmount: { token: '0x000000000000000000000000000000000000EEEe', value: 0, decimals: 18, currency: 1 },
            useTotalOverflow: true,
            redemptionRate: 0,
            memo: '',
            metadata: '0x00'
        };

        const redeemParamsResult = await datasourceProxy.connect(accounts[0]).redeemParams(redeemParamsData);
    });
});

// npx hardhat test test/extensions/datasource_proxy.test.ts
