import { expect } from 'chai';
import { ethers } from 'hardhat';
import { smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import jbDirectory from '../../../artifacts/contracts/JBDirectory.sol/JBDirectory.json';
import jbProjects from '../../../artifacts/contracts/JBProjects.sol/JBProjects.json';
import jbOperatorStore from '../../../artifacts/contracts/JBOperatorStore.sol/JBOperatorStore.json';

describe('MintFurnace tests', () => {
    const JBOperations_MANAGE_PAYMENTS = 254;

    const platformProjectId = 1;

    const tokenPrice = ethers.utils.parseEther('0.01');

    let deployer: SignerWithAddress;
    let accounts: SignerWithAddress[];

    let mockDirectory: any;
    let mockProjects: any;
    let mockOperatorStore: any;

    let mintFurnace: any;
    let mintToken: any;
    let burnTokenA: any;
    let burnTokenB: any;

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
    });

    before('Initialize contracts', async () => {
        const nfTokenFactory = await ethers.getContractFactory('NFToken');

        mintToken = await nfTokenFactory.connect(deployer)
            .deploy(
                {
                    name: 'Mint NFT',
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
                ethers.constants.AddressZero
            );

        burnTokenA = await nfTokenFactory.connect(deployer)
            .deploy(
                {
                    name: 'Burn NFT A',
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
                ethers.constants.AddressZero
            );

        burnTokenB = await nfTokenFactory.connect(deployer)
            .deploy(
                {
                    name: 'Burn NFT B',
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
                ethers.constants.AddressZero
            );

        const furnaceFactory = await ethers.getContractFactory('MintFurnace');
        mintFurnace = await furnaceFactory.connect(deployer)
            .deploy(mockOperatorStore.address, mockDirectory.address, mockProjects.address, mintToken.address);

        await mintToken.connect(deployer).addMinter(mintFurnace.address);

        await burnTokenA.connect(deployer).mintFor(accounts[0].address);
        await burnTokenB.connect(deployer).mintFor(accounts[0].address);
        await burnTokenB.connect(deployer).mintFor(accounts[0].address);
    });

    it('setConversionRate()', async () => {
        await mintFurnace.connect(deployer).setConversionRate(burnTokenA.address, 1);
        expect(await mintFurnace.conversionRate(burnTokenA.address)).to.equal(1);

        await mintFurnace.connect(deployer).setConversionRate(burnTokenB.address, 2);
        expect(await mintFurnace.conversionRate(burnTokenB.address)).to.equal(2);

        await expect(mintFurnace.connect(accounts[0]).setConversionRate(burnTokenB.address, 1)).to.be.reverted;
    });

    it('mint()', async () => {
        await burnTokenA.connect(accounts[0]).approve(mintFurnace.address, 1);
        await mintFurnace.connect(accounts[0]).mint(accounts[0].address, burnTokenA.address, [1], accounts[0].address);
        expect(await mintToken.balanceOf(accounts[0].address)).to.equal(1);
    });
});

// npx hardhat test test/extensions/nft/mint_furnace.test.ts
