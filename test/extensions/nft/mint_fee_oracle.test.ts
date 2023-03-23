import { expect } from 'chai';
import { ethers } from 'hardhat';
import { smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import jbDirectory from '../../../artifacts/contracts/JBDirectory.sol/JBDirectory.json';
import jbProjects from '../../../artifacts/contracts/JBProjects.sol/JBProjects.json';
import jbOperatorStore from '../../../artifacts/contracts/JBOperatorStore.sol/JBOperatorStore.json';
import { BigNumber } from 'ethers';

describe('MintFeeOracle tests', () => {
    const JBOperations_MANAGE_PAYMENTS = 254;

    const platformProjectId = 1;
    const userProjectId = 2;

    const minimumOracleFee = ethers.utils.parseEther('0.001');
    const defaultOracleFeeRate = BigNumber.from(500); // bps
    const tokenPrice = ethers.utils.parseEther('0.01');
    const bps = 10000;
    const updatedFeeRate = BigNumber.from(600); // bps

    let deployer: SignerWithAddress;
    let accounts: SignerWithAddress[];

    let mockDirectory: any;
    let mockProjects: any;
    let mockOperatorStore: any;

    let mintFeeOracle: any;
    let token: any;
    let freeToken: any;

    before('Initialize accounts', async () => {
        [deployer, ...accounts] = await ethers.getSigners();
    });

    before('Mock related contracts', async () => {
        mockDirectory = await smock.fake(jbDirectory.abi);
        mockProjects = await smock.fake(jbProjects.abi);
        mockOperatorStore = await smock.fake(jbOperatorStore.abi);

        mockDirectory.controllerOf.whenCalledWith(platformProjectId).returns(deployer.address);
        mockProjects.ownerOf.whenCalledWith(platformProjectId).returns(deployer.address);
        mockOperatorStore.hasPermission.whenCalledWith(deployer.address, deployer.address, platformProjectId, JBOperations_MANAGE_PAYMENTS).returns(true);

        mockDirectory.controllerOf.whenCalledWith(userProjectId).returns(accounts[0].address);
        mockProjects.ownerOf.whenCalledWith(userProjectId).returns(accounts[0].address);
        mockOperatorStore.hasPermission.whenCalledWith(accounts[0].address, accounts[0].address, userProjectId, JBOperations_MANAGE_PAYMENTS).returns(true);
    });

    before('Initialize contracts', async () => {
        const feeOracleFactory = await ethers.getContractFactory('MintFeeOracle');
        mintFeeOracle = await feeOracleFactory.connect(deployer)
            .deploy(mockOperatorStore.address, mockDirectory.address, mockProjects.address, defaultOracleFeeRate, minimumOracleFee);

        const nfTokenFactory = await ethers.getContractFactory('NFToken');
        token = await nfTokenFactory
            .connect(deployer)
            .deploy(
                {
                    name: 'Test NFT',
                    symbol: 'NFT',
                    baseUri: 'ipfs://',
                    contractUri: 'ipfs://',
                    maxSupply: 100,
                    unitPrice: tokenPrice,
                    mintAllowance: 10
                },
                {
                    jbxDirectory: mockDirectory.address,
                    jbxProjects: mockProjects.address,
                    jbxOperatorStore: mockOperatorStore.address
                },
                mintFeeOracle.address
            );

        const freeNfTokenFactory = await ethers.getContractFactory('NFToken');
        freeToken = await freeNfTokenFactory
            .connect(deployer)
            .deploy(
                {
                    name: 'Free NFT',
                    symbol: 'FNFT',
                    baseUri: 'ipfs://',
                    contractUri: 'ipfs://',
                    maxSupply: 100,
                    unitPrice: 0,
                    mintAllowance: 10
                },
                {
                    jbxDirectory: mockDirectory.address,
                    jbxProjects: mockProjects.address,
                    jbxOperatorStore: mockOperatorStore.address
                },
                mintFeeOracle.address
            );
    });

    it('MintFeeOracle deployment failure', async () => {
        const feeOracleFactory = await ethers.getContractFactory('MintFeeOracle');
        await expect(feeOracleFactory.connect(deployer).deploy(mockOperatorStore.address, mockDirectory.address, mockProjects.address, bps + 1, minimumOracleFee)).to.be.reverted;
    });

    it('NFToken.getMintPrice() before setting project id, free token', async () => {
        expect(await freeToken.getMintPrice(accounts[1].address)).to.equal(minimumOracleFee);
    });

    it('NFToken.getMintPrice() before setting project id, paid token', async () => {
        const expectedPrice = tokenPrice.add(tokenPrice.mul(defaultOracleFeeRate).div(bps));
        expect(await token.getMintPrice(accounts[1].address)).to.equal(expectedPrice);
    });

    it('setFeeRate()', async () => {
        await expect(mintFeeOracle.connect(accounts[0]).setFeeRate(updatedFeeRate, 0)).to.be.reverted;
        await expect(mintFeeOracle.connect(deployer).setFeeRate(bps + 1, userProjectId)).to.be.reverted;
        await expect(mintFeeOracle.connect(deployer).setFeeRate(updatedFeeRate, userProjectId)).not.to.be.reverted;
        await expect(mintFeeOracle.connect(deployer).setFeeRate(updatedFeeRate.add(100), 0)).not.to.be.reverted;
    });

    it('NFToken.getMintPrice() after setProjectId(), paid token', async () => {
        await expect(token.connect(deployer).setProjectId(userProjectId)).to.be.reverted;
        await expect(token.connect(accounts[0]).setProjectId(userProjectId)).not.to.be.reverted;

        const expectedPrice = tokenPrice.add(tokenPrice.mul(updatedFeeRate).div(bps));
        expect(await token.getMintPrice(accounts[1].address)).to.equal(expectedPrice);

        await expect(token.connect(accounts[1])['mint()']({ value: expectedPrice })).not.to.be.reverted;
        await expect(token.connect(accounts[1])['mint()']({ value: tokenPrice })).to.be.reverted;
        expect(await token.balanceOf(accounts[1].address)).to.equal(1);
    });

    it('transferBalance()', async () => {
        await expect(mintFeeOracle.connect(accounts[0]).transferBalance(accounts[0].address)).to.be.reverted;
        await expect(mintFeeOracle.connect(deployer).transferBalance(deployer.address)).not.to.be.reverted;
        expect(await ethers.provider.getBalance(mintFeeOracle.address)).to.equal(0);
    });
});

// npx hardhat test test/extensions/nft/mint_fee_oracle.test.ts
