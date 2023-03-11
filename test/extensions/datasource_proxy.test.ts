import { expect } from 'chai';
import { ethers } from 'hardhat';
import { smock } from '@defi-wonderland/smock';

import jbDirectory from '../../artifacts/contracts/JBDirectory.sol/JBDirectory.json';
import jbOperatorStore from '../../artifacts/contracts/JBOperatorStore.sol/JBOperatorStore.json';
import jbProjects from '../../artifacts/contracts/JBProjects.sol/JBProjects.json';

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

        expect((await datasourceProxy.delegates).length).to.equal(0);
    });
});

// npx hardhat test test/extensions/datasource_proxy.test.ts