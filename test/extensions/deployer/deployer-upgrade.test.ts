import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { BigNumber } from 'ethers';
import { smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import * as helpers from '@nomicfoundation/hardhat-network-helpers';

import jbDirectory from '../../../artifacts/contracts/JBDirectory.sol/JBDirectory.json';
import jbOperatorStore from '../../../artifacts/contracts/JBOperatorStore.sol/JBOperatorStore.json';
import jbProjects from '../../../artifacts/contracts/JBProjects.sol/JBProjects.json';
import jbTerminal from '../../../artifacts/contracts/abstract/JBPayoutRedemptionPaymentTerminal.sol/JBPayoutRedemptionPaymentTerminal.json';
interface OpenRewardTier {
    contributionFloor: number | BigNumber
}

interface RewardTier {
    contributionFloor: number | BigNumber;
    idCeiling: number | BigNumber;
    remainingAllowance: number | BigNumber;
}

interface JBTokenAmount {
    token: string;
    value: BigNumber | number;
    decimals: BigNumber | number;
    currency: BigNumber | number;
}

describe('Deployer upgrade tests', () => {
    const jbxJbTokensEth = '0x000000000000000000000000000000000000EEEe';
    const provider = ethers.provider;

    let deployer: SignerWithAddress;
    let accounts: SignerWithAddress[];

    let mockJbDirectory;
    let mockJbOperatorStore;
    let mockJbProjects;
    let mockJbEthTerminal;

    let deployerProxy: any;
    let nfTokenFactoryLibrary: any;
    let mixedPaymentSplitterFactoryLibrary: any;
    let auctionsFactoryFactoryLibrary: any;
    let nfuTokenFactoryLibrary: any;
    let nfuMembershipFactoryLibrary: any;
    let paymentProcessorFactoryLibrary: any;
    let nftRewardDataSourceFactoryLibrary: any;
    let auctionMachineFactoryLibrary: any;
    let traitTokenFactoryLibrary: any;
    let nfuEditionFactoryLibrary: any;
    let thinProjectPayerFactoryLibrary: any;

    let sourceDutchAuctionHouse: any;
    let sourceEnglishAuctionHouse: any;
    let sourceFixedPriceSale: any;
    let nfuToken: any;
    let nfuMembership: any;
    let tokenLiquidator: any;
    let dutchAuctionMachineSource: any;
    let englishAuctionMachineSource: any;
    let traitTokenSource: any;
    let nfuEditionSource: any;
    let projectPayerSource: any;

    let nfToken: any;
    let mixedPaymentSplitter: any;
    let dutchAuctionHouse: any;
    let englishAuctionHouse: any;
    let fixedPriceSale: any;
    let thinPayer: any;

    before('Initialize accounts', async () => {
        [deployer, ...accounts] = await ethers.getSigners();
    });

    before('Setup JBX components', async () => {
        mockJbDirectory = await smock.fake(jbDirectory.abi);
        mockJbOperatorStore = await smock.fake(jbOperatorStore.abi);
        mockJbProjects = await smock.fake(jbProjects.abi);
        mockJbEthTerminal = await smock.fake(jbTerminal.abi);

        mockJbProjects.ownerOf.whenCalledWith(1).returns(deployer.address);
        mockJbDirectory.controllerOf.whenCalledWith(1).returns(deployer.address);
    });

    it('Deploy Deployer_v001', async () => {
        const nfTokenFactoryFactory = await ethers.getContractFactory('NFTokenFactory', deployer);
        nfTokenFactoryLibrary = await nfTokenFactoryFactory.connect(deployer).deploy();

        const deployerFactory = await ethers.getContractFactory('Deployer_v001', {
            libraries: { NFTokenFactory: nfTokenFactoryLibrary.address },
            signer: deployer
        });
        deployerProxy = await upgrades.deployProxy(
            deployerFactory,
            [mockJbDirectory.address, mockJbProjects.address, mockJbOperatorStore.address],
            { kind: 'uups', initializer: 'initialize(address,address,address)' });
    });

    it('Deploy NFToken via Deployer (v1)', async () => {
        const tx = await deployerProxy.connect(deployer).deployNFToken(
            accounts[0].address,
            'Picture Token',
            'NFT',
            'ipfs://token/metadata',
            'ipfs://contract/metadata',
            1000,
            ethers.utils.parseEther('0.0001'),
            10,
            true
        );
        const receipt = await tx.wait();

        const [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;

        const nfTokenFactory = await ethers.getContractFactory('NFToken', deployer);
        nfToken = await nfTokenFactory.attach(contractAddress);
    });

    it('Fail to upgrade Deployer_v001', async () => {
        const mixedPaymentSplitterFactoryFactory = await ethers.getContractFactory('MixedPaymentSplitterFactory', deployer);
        mixedPaymentSplitterFactoryLibrary = await mixedPaymentSplitterFactoryFactory.connect(deployer).deploy();

        const deployerFactory = await ethers.getContractFactory('Deployer_v002', {
            libraries: {
                NFTokenFactory: nfTokenFactoryLibrary.address,
                MixedPaymentSplitterFactory: mixedPaymentSplitterFactoryLibrary.address
            },
            signer: accounts[0]
        });

        await expect(upgrades.upgradeProxy(deployerProxy, deployerFactory, { kind: 'uups' })).to.be.reverted;
    });

    it('Deploy Deployer_v002 as upgrade to v001', async () => {
        const deployerFactory = await ethers.getContractFactory('Deployer_v002', {
            libraries: {
                NFTokenFactory: nfTokenFactoryLibrary.address,
                MixedPaymentSplitterFactory: mixedPaymentSplitterFactoryLibrary.address
            },
            signer: deployer
        });

        deployerProxy = await upgrades.upgradeProxy(deployerProxy, deployerFactory, { kind: 'uups', call: { fn: 'initialize()' } });
    });


    it('Deploy MixedPaymentSplitter via Deployer', async () => {
        const tx = await deployerProxy.connect(deployer).deployMixedPaymentSplitter(
            'Test MixedPaymentSplitter',
            [deployer.address, accounts[0].address],
            [],
            [100_000, 100_000],
            mockJbDirectory.address,
            deployer.address
        );
        const receipt = await tx.wait();

        const [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;

        const mixedPaymentSplitterFactory = await ethers.getContractFactory('MixedPaymentSplitter', deployer);
        mixedPaymentSplitter = await mixedPaymentSplitterFactory.attach(contractAddress);
    });

    it('Pay into MixedPaymentSplitter', async () => {
        await expect(accounts[0].sendTransaction({ to: mixedPaymentSplitter.address, value: ethers.utils.parseEther('1.0') }))
            .to.emit(mixedPaymentSplitter, 'PaymentReceived');
    });

    it('Distribute Ether payment from MixedPaymentSplitter', async () => {
        const share = ethers.utils.parseEther('1.0').mul(100_000).div(1_000_000);
        const initialBalance = (await provider.getBalance(accounts[0].address)) as BigNumber;

        expect(await mixedPaymentSplitter['pending(address)'](accounts[0].address)).to.equal(share.toString());
        await expect(mixedPaymentSplitter['distribute(address)'](accounts[0].address))
            .to.emit(mixedPaymentSplitter, 'PaymentReleased').withArgs(accounts[0].address, share);

        expect(await provider.getBalance(accounts[0].address)).to.equal(initialBalance.add(share));
    });

    it('Deploy Deployer_v003 as upgrade to v002', async () => {
        const auctionsFactoryFactory = await ethers.getContractFactory('AuctionsFactory', deployer);
        auctionsFactoryFactoryLibrary = await auctionsFactoryFactory.connect(deployer).deploy();

        const deployerFactory = await ethers.getContractFactory('Deployer_v003', {
            libraries: {
                NFTokenFactory: nfTokenFactoryLibrary.address,
                MixedPaymentSplitterFactory: mixedPaymentSplitterFactoryLibrary.address,
                AuctionsFactory: auctionsFactoryFactoryLibrary.address
            },
            signer: deployer
        });

        const dutchAuctionHouseFactory = await ethers.getContractFactory('DutchAuctionHouse', { signer: deployer });
        sourceDutchAuctionHouse = await dutchAuctionHouseFactory.connect(deployer).deploy();
        await sourceDutchAuctionHouse.deployed();

        const englishAuctionHouseFactory = await ethers.getContractFactory('EnglishAuctionHouse', { signer: deployer });
        sourceEnglishAuctionHouse = await englishAuctionHouseFactory.connect(deployer).deploy();
        await sourceEnglishAuctionHouse.deployed();

        const fixedPriceSaleFactory = await ethers.getContractFactory('FixedPriceSale', { signer: deployer });
        sourceFixedPriceSale = await fixedPriceSaleFactory.connect(deployer).deploy();
        await sourceFixedPriceSale.deployed();

        deployerProxy = await upgrades.upgradeProxy(deployerProxy, deployerFactory, { kind: 'uups', call: { fn: 'initialize(address,address,address)', args: [sourceDutchAuctionHouse.address, sourceEnglishAuctionHouse.address, sourceFixedPriceSale.address] } });
    });

    it('Deploy DutchAuctionHouse via Deployer', async () => {
        const projectId = 1;
        const feeRate = 5_000_000; // 0.5%
        const periodDuration = 5 * 60; // seconds
        const allowPublicAuctions = true;

        const tx = await deployerProxy.connect(deployer).deployDutchAuction(
            projectId,
            ethers.constants.AddressZero, // IJBPaymentTerminal
            feeRate,
            allowPublicAuctions,
            periodDuration,
            deployer.address,
            mockJbDirectory.address
        );
        const receipt = await tx.wait();

        const [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;
        const dutchAuctionHouseFactory = await ethers.getContractFactory('DutchAuctionHouse', { signer: deployer });
        dutchAuctionHouse = await dutchAuctionHouseFactory.attach(contractAddress);
    });

    it('Deploy EnglishAuctionHouse via Deployer', async () => {
        const projectId = 1;
        const feeRate = 5_000_000; // 0.5%
        const allowPublicAuctions = true;
        const tx = await deployerProxy.connect(deployer).deployEnglishAuction(
            projectId,
            ethers.constants.AddressZero, // IJBPaymentTerminal
            feeRate,
            allowPublicAuctions,
            deployer.address,
            mockJbDirectory.address
        );
        const receipt = await tx.wait();

        const [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;
        const englishAuctionHouseFactory = await ethers.getContractFactory('EnglishAuctionHouse', { signer: deployer });
        englishAuctionHouse = await englishAuctionHouseFactory.attach(contractAddress);
    });

    it('Deploy EnglishAuctionHouse via Deployer', async () => {
        const projectId = 1;
        const feeRate = 5_000_000; // 0.5%
        const allowPublicSales = true;

        const tx = await deployerProxy.connect(deployer).deployFixedPriceSale(
            projectId,
            ethers.constants.AddressZero, // IJBPaymentTerminal
            feeRate,
            allowPublicSales,
            deployer.address,
            mockJbDirectory.address
        );
        const receipt = await tx.wait();

        const [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;
        expect(contractType).to.equal('FixedPriceSale');
        const fixedPriceSaleFactory = await ethers.getContractFactory('FixedPriceSale', { signer: deployer });
        fixedPriceSale = await fixedPriceSaleFactory.attach(contractAddress);
    });

    it('Deploy Deployer_v004 as upgrade to v003', async () => {
        const nfuTokenFactoryFactory = await ethers.getContractFactory('NFUTokenFactory', deployer);
        nfuTokenFactoryLibrary = await nfuTokenFactoryFactory.connect(deployer).deploy();

        const nfuMembershipFactoryFactory = await ethers.getContractFactory('NFUMembershipFactory', deployer);
        nfuMembershipFactoryLibrary = await nfuMembershipFactoryFactory.connect(deployer).deploy();

        const deployerFactory = await ethers.getContractFactory('Deployer_v004', {
            libraries: {
                NFTokenFactory: nfTokenFactoryLibrary.address,
                MixedPaymentSplitterFactory: mixedPaymentSplitterFactoryLibrary.address,
                AuctionsFactory: auctionsFactoryFactoryLibrary.address,
                NFUTokenFactory: nfuTokenFactoryLibrary.address,
                NFUMembershipFactory: nfuMembershipFactoryLibrary.address
            },
            signer: deployer
        });

        const nfuTokenFactory = await ethers.getContractFactory('NFUToken', { signer: deployer });
        nfuToken = await nfuTokenFactory.connect(deployer).deploy();
        await nfuToken.deployed();

        const nfuMembershipFactory = await ethers.getContractFactory('NFUMembership', { signer: deployer });
        nfuMembership = await nfuMembershipFactory.connect(deployer).deploy();
        await nfuMembership.deployed();

        deployerProxy = await upgrades.upgradeProxy(deployerProxy, deployerFactory, { kind: 'uups', call: { fn: 'initialize(address,address,address,address,address)', args: [sourceDutchAuctionHouse.address, sourceEnglishAuctionHouse.address, sourceFixedPriceSale.address, nfuToken.address, nfuMembership.address] } });
    });

    it('Create cloned NFTs (v004)', async () => {
        const now = await helpers.time.latest();
        const nfuTokenFactory = await ethers.getContractFactory('NFUToken', { signer: deployer });

        const name = 'Test NFT'
        const symbol = 'NFT';
        const baseUri = 'ipfs://hidden';
        const contractUri = 'ipfs://metadata';
        const unitPrice = ethers.utils.parseEther('0.001');
        const maxSupply = 20;
        const mintAllowance = 2;
        const mintPeriodStart = Math.floor(now + 60 * 60);
        const mintPeriodEnd = Math.floor(now + 24 * 60 * 60);

        let tx = await deployerProxy.connect(deployer)
            .deployNFUToken(accounts[0].address, name + ' A', symbol + 'A', baseUri, contractUri, maxSupply, unitPrice, mintAllowance);
        let receipt = await tx.wait();

        let [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;
        const tokenA = await nfuTokenFactory.attach(contractAddress);
        await tokenA.connect(accounts[0]).updateMintPeriod(mintPeriodStart, mintPeriodEnd);
        await expect(tokenA.connect(deployer).updateMintPeriod(mintPeriodStart, mintPeriodEnd)).to.be.reverted;

        tx = await deployerProxy.connect(deployer)
            .deployNFUToken(accounts[1].address, name + ' B', symbol + 'B', baseUri, contractUri, maxSupply, unitPrice, mintAllowance);
        receipt = await tx.wait();
        [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;
        const tokenB = await nfuTokenFactory.attach(contractAddress);
        await tokenB.connect(accounts[1]).updateMintPeriod(mintPeriodStart, mintPeriodEnd);

        expect(await tokenA.symbol()).to.equal(symbol + 'A');
        expect(await tokenB.symbol()).to.equal(symbol + 'B');

        await expect(tokenA.connect(accounts[0])
            .initialize(accounts[0].address, name, symbol, baseUri, contractUri, maxSupply, unitPrice, mintAllowance, mintPeriodStart, mintPeriodEnd))
            .to.be.revertedWithCustomError(tokenA, 'INVALID_OPERATION');

        tx = await deployerProxy.connect(deployer)
            .deployNFUToken(accounts[1].address, '', 'BLNK', baseUri, contractUri, maxSupply, unitPrice, mintAllowance);
        receipt = await tx.wait();
        [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;
        const unnamedToken = await nfuTokenFactory.attach(contractAddress);

        await expect(unnamedToken.connect(accounts[0]).initialize(accounts[1].address, 'Non-fungible Token', 'NFT', baseUri, contractUri, maxSupply, unitPrice, mintAllowance, mintPeriodStart, mintPeriodEnd)).to.be.revertedWithCustomError(unnamedToken, 'INVALID_OPERATION');

        await expect(unnamedToken.connect(accounts[1]).initialize(accounts[1].address, 'Non-fungible Token', 'NFT', baseUri, contractUri, maxSupply, unitPrice, mintAllowance, mintPeriodStart, mintPeriodEnd)).not.to.be.reverted;
    });

    it('Create Membership NFT (v004)', async () => {
        const now = await helpers.time.latest();
        const nfuMembershipFactory = await ethers.getContractFactory('NFUMembership', { signer: deployer });

        const baseUri = 'ipfs://hidden';
        const contractUri = 'ipfs://metadata';
        const unitPrice = ethers.utils.parseEther('0.001');
        const maxSupply = 20;
        const mintAllowance = 2;
        const mintPeriodStart = 0;
        const mintPeriodEnd = Math.floor(now + 24 * 60 * 60);
        const transferType = 0; // SOUL_BOUND

        let tx = await deployerProxy.connect(deployer)
            .deployNFUMembership(accounts[0].address, 'Test Membership Token', 'TMT', baseUri, contractUri, maxSupply, unitPrice, mintAllowance, mintPeriodEnd, transferType);
        let receipt = await tx.wait();

        let [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;
        const membershipTokenContract = await nfuMembershipFactory.attach(contractAddress);

        tx = await membershipTokenContract.connect(accounts[1])['mint()']({ value: unitPrice });
        receipt = await tx.wait();
        const [AddressZero, owner, tokenId] = receipt.events.filter(e => e.event === 'Transfer')[0].args;
        await expect(membershipTokenContract.connect(accounts[1]).transferFrom(accounts[1].address, accounts[1].address, tokenId)).to.be.revertedWithCustomError(membershipTokenContract, 'TRANSFER_DISABLED');

        await expect(membershipTokenContract.connect(accounts[1]).setPause(true)).to.be.reverted;
        await membershipTokenContract.connect(accounts[0]).setPause(true);
        await expect(membershipTokenContract.connect(accounts[2])['mint()']({ value: unitPrice.add(10) })).to.be.revertedWithCustomError(membershipTokenContract, 'MINTING_PAUSED');

        expect(await membershipTokenContract.balanceOf(accounts[1].address)).to.equal(1);
        await expect(membershipTokenContract.connect(accounts[1]).revoke(tokenId)).to.be.reverted;
        await membershipTokenContract.connect(accounts[0]).revoke(tokenId);
        expect(await membershipTokenContract.balanceOf(accounts[0].address)).to.equal(0);

        tx = await deployerProxy.connect(deployer)
            .deployNFUMembership(accounts[1].address, '', 'BLNK', baseUri, contractUri, maxSupply, unitPrice, mintAllowance, mintPeriodEnd, transferType);
        receipt = await tx.wait();
        [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;
        const unnamedToken = await nfuMembershipFactory.attach(contractAddress);

        await expect(unnamedToken.connect(accounts[0]).initialize(accounts[1].address, 'Membership Token', 'mNFT', baseUri, contractUri, maxSupply, unitPrice, mintAllowance, mintPeriodStart, mintPeriodEnd, transferType)).to.be.revertedWithCustomError(unnamedToken, 'INVALID_OPERATION');

        await expect(unnamedToken.connect(accounts[1]).initialize(accounts[1].address, 'Membership Token', 'mNFT', baseUri, contractUri, maxSupply, unitPrice, mintAllowance, mintPeriodStart, mintPeriodEnd, transferType)).not.to.be.reverted;
    });

    it('Deploy Deployer_v005 as upgrade to v004', async () => {
        const paymentProcessorFactory = await ethers.getContractFactory('PaymentProcessorFactory', deployer);
        paymentProcessorFactoryLibrary = await paymentProcessorFactory.connect(deployer).deploy();

        const deployerFactory = await ethers.getContractFactory('Deployer_v005', {
            libraries: {
                NFTokenFactory: nfTokenFactoryLibrary.address,
                MixedPaymentSplitterFactory: mixedPaymentSplitterFactoryLibrary.address,
                AuctionsFactory: auctionsFactoryFactoryLibrary.address,
                NFUTokenFactory: nfuTokenFactoryLibrary.address,
                NFUMembershipFactory: nfuMembershipFactoryLibrary.address,
                PaymentProcessorFactory: paymentProcessorFactoryLibrary.address
            },
            signer: deployer
        });

        const feeBps = 250;
        const uniswapPoolFee = 3000;
        const tokenLiquidatorFactory = await ethers.getContractFactory('TokenLiquidator', { signer: deployer });
        tokenLiquidator = await tokenLiquidatorFactory.connect(deployer)
            .deploy(ethers.constants.AddressZero, ethers.constants.AddressZero, ethers.constants.AddressZero, feeBps, uniswapPoolFee);
        await tokenLiquidator.deployed();

        deployerProxy = await upgrades.upgradeProxy(deployerProxy, deployerFactory, { kind: 'uups', call: { fn: 'initialize(address,address,address,address,address,address)', args: [sourceDutchAuctionHouse.address, sourceEnglishAuctionHouse.address, sourceFixedPriceSale.address, nfuToken.address, nfuMembership.address, tokenLiquidator.address] } });
    });

    it('Deploy PaymentProcessor via Deployer (v005)', async () => {
        const tx = await deployerProxy.connect(deployer).deployPaymentProcessor(
            mockJbDirectory.address,
            mockJbOperatorStore.address,
            mockJbProjects.address,
            2,
            false,
            true
        );
        const receipt = await tx.wait();

        const [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;
        const dutchAuctionHouseFactory = await ethers.getContractFactory('DutchAuctionHouse', { signer: deployer });
        dutchAuctionHouse = await dutchAuctionHouseFactory.attach(contractAddress);
    });

    it('Deploy Deployer_v006 as upgrade to v005', async () => {
        const nftRewardDataSourceFactory = await ethers.getContractFactory('NFTRewardDataSourceFactory', deployer);
        nftRewardDataSourceFactoryLibrary = await nftRewardDataSourceFactory.connect(deployer).deploy();

        const deployerFactory = await ethers.getContractFactory('Deployer_v006', {
            libraries: {
                NFTokenFactory: nfTokenFactoryLibrary.address,
                MixedPaymentSplitterFactory: mixedPaymentSplitterFactoryLibrary.address,
                AuctionsFactory: auctionsFactoryFactoryLibrary.address,
                NFUTokenFactory: nfuTokenFactoryLibrary.address,
                NFUMembershipFactory: nfuMembershipFactoryLibrary.address,
                PaymentProcessorFactory: paymentProcessorFactoryLibrary.address,
                NFTRewardDataSourceFactory: nftRewardDataSourceFactoryLibrary.address
            },
            signer: deployer
        });

        deployerProxy = await upgrades.upgradeProxy(deployerProxy, deployerFactory, { kind: 'uups', call: { fn: 'initialize(address,address,address,address,address,address)', args: [sourceDutchAuctionHouse.address, sourceEnglishAuctionHouse.address, sourceFixedPriceSale.address, nfuToken.address, nfuMembership.address, tokenLiquidator.address] } });
    });

    it('Deploy Deployer_v007 as upgrade to v006', async () => {
        const auctionMachineFactory = await ethers.getContractFactory('AuctionMachineFactory', deployer);
        auctionMachineFactoryLibrary = await auctionMachineFactory.connect(deployer).deploy();

        const traitTokenFactoryFactory = await ethers.getContractFactory('TraitTokenFactory', deployer);
        traitTokenFactoryLibrary = await traitTokenFactoryFactory.connect(deployer).deploy();

        const nfuEditionFactoryFactory = await ethers.getContractFactory('NFUEditionFactory', deployer);
        nfuEditionFactoryLibrary = await nfuEditionFactoryFactory.connect(deployer).deploy();

        const thinProjectPayerFactory = await ethers.getContractFactory('ThinProjectPayerFactory', deployer);
        thinProjectPayerFactoryLibrary = await thinProjectPayerFactory.connect(deployer).deploy();

        const deployerFactory = await ethers.getContractFactory('Deployer_v007', {
            libraries: {
                NFTokenFactory: nfTokenFactoryLibrary.address,
                MixedPaymentSplitterFactory: mixedPaymentSplitterFactoryLibrary.address,
                AuctionsFactory: auctionsFactoryFactoryLibrary.address,
                NFUTokenFactory: nfuTokenFactoryLibrary.address,
                NFUMembershipFactory: nfuMembershipFactoryLibrary.address,
                PaymentProcessorFactory: paymentProcessorFactoryLibrary.address,
                NFTRewardDataSourceFactory: nftRewardDataSourceFactoryLibrary.address,
                AuctionMachineFactory: auctionMachineFactoryLibrary.address,
                TraitTokenFactory: traitTokenFactoryLibrary.address,
                NFUEditionFactory: nfuEditionFactoryLibrary.address,
                ThinProjectPayerFactory: thinProjectPayerFactoryLibrary.address,
            },
            signer: deployer
        });

        const dutchAuctionMachineFactory = await ethers.getContractFactory('DutchAuctionMachine', { signer: deployer });
        dutchAuctionMachineSource = await dutchAuctionMachineFactory.connect(deployer).deploy();
        await dutchAuctionMachineSource.deployed();

        const englishAuctionMachineFactory = await ethers.getContractFactory('EnglishAuctionMachine', { signer: deployer });
        englishAuctionMachineSource = await englishAuctionMachineFactory.connect(deployer).deploy();
        await englishAuctionMachineSource.deployed();

        const traitTokenFactory = await ethers.getContractFactory('TraitToken', { signer: deployer });
        traitTokenSource = await traitTokenFactory.connect(deployer).deploy();
        await traitTokenSource.deployed();

        const nfuEditionFactory = await ethers.getContractFactory('NFUEdition', { signer: deployer });
        nfuEditionSource = await nfuEditionFactory.connect(deployer).deploy();
        await nfuEditionSource.deployed();

        const projectPayerFactory = await ethers.getContractFactory('ThinProjectPayer', { signer: deployer });
        projectPayerSource = await projectPayerFactory.connect(deployer).deploy(1);
        await projectPayerSource.deployed();

        deployerProxy = await upgrades.upgradeProxy(
            deployerProxy,
            deployerFactory,
            {
                kind: 'uups',
                call: {
                    fn: 'initialize(address,address,address,address,address,address,address,address,address,address,address)',
                    args: [
                        sourceDutchAuctionHouse.address,
                        sourceEnglishAuctionHouse.address,
                        sourceFixedPriceSale.address,
                        nfuToken.address,
                        nfuMembership.address,
                        tokenLiquidator.address,
                        dutchAuctionMachineSource.address,
                        englishAuctionMachineSource.address,
                        traitTokenSource.address,
                        nfuEditionSource.address,
                        projectPayerSource.address]
                }
            });

        await expect(englishAuctionMachineSource.transferOwnership(deployerProxy.address)).not.to.be.reverted;
        await expect(dutchAuctionMachineSource.transferOwnership(deployerProxy.address)).not.to.be.reverted;
    });

    it('Deploy OpenTieredTokenUriResolver (v006)', async () => {
        const baseuri = 'ipfs://';

        await expect(deployerProxy.connect(deployer).deployOpenTieredTokenUriResolver(baseuri))
            .not.to.be.reverted;
    });

    it('Deploy OpenTieredPriceResolver (v006)', async () => {
        const tiers: OpenRewardTier[] = [
            { contributionFloor: ethers.utils.parseEther('0.0001') },
            { contributionFloor: ethers.utils.parseEther('0.001') },
            { contributionFloor: ethers.utils.parseEther('0.01') }];

        await expect(deployerProxy.connect(deployer).deployOpenTieredPriceResolver(
            accounts[1].address, tiers
        )).not.to.be.reverted;
    });

    it('Deploy TieredTokenUriResolver (v006)', async () => {
        const baseuri = 'ipfs://';
        const range: number[] | BigNumber[] = [1000, 2000];

        await expect(deployerProxy.connect(deployer).deployTieredTokenUriResolver(
            baseuri, range
        )).not.to.be.reverted;
    });

    it('Deploy TieredPriceResolver (v006)', async () => {
        const tiers: RewardTier[] = [
            { contributionFloor: ethers.utils.parseEther('0.001'), idCeiling: 1000, remainingAllowance: 1000 },
            { contributionFloor: ethers.utils.parseEther('0.01'), idCeiling: 2000, remainingAllowance: 1000 },
            { contributionFloor: ethers.utils.parseEther('0.1'), idCeiling: 3000, remainingAllowance: 1000 },
        ];

        await expect(deployerProxy.connect(deployer).deployTieredPriceResolver(
            accounts[1].address, 2000, 10, tiers
        )).not.to.be.reverted;
    });

    it('Deploy NFTRewardDataSource (v006)', async () => {
        const projectId = 1;
        const maxSupply = 10000;
        const minContribution: JBTokenAmount = { token: accounts[1].address, value: ethers.utils.parseEther('0.001'), decimals: 18, currency: 1 };
        const name = 'NFT Reward';
        const symbol = 'RRR';
        const uri = 'ipfs://';
        const tokenUriResolverAddress = accounts[1].address;
        const contractMetadataUri = 'ipfs://';
        const admin = deployer.address
        const priceResolver = ethers.constants.AddressZero;

        await expect(deployerProxy.connect(deployer).deployNFTRewardDataSource(
            projectId,
            mockJbDirectory.address,
            maxSupply,
            minContribution,
            name,
            symbol,
            uri,
            tokenUriResolverAddress,
            contractMetadataUri,
            admin,
            priceResolver
        )).not.to.be.reverted;
    });

    it('Deploy EnglishAuctionMachine clone (v007)', async () => {
        const nfuTokenFactory = await ethers.getContractFactory('NFUToken', { signer: deployer });
        const englishAuctionMachineFactory = await ethers.getContractFactory('EnglishAuctionMachine', { signer: deployer });

        const name = 'Test NFT'
        const symbol = 'NFT';
        const baseUri = 'ipfs://hidden';
        const contractUri = 'ipfs://metadata';
        const projectId = 99;
        const unitPrice = ethers.utils.parseEther('0.001');
        const maxSupply = 20;
        const mintAllowance = 2;

        let tx = await deployerProxy.connect(deployer)
            .deployNFUToken(deployer.address, name + ' A', symbol + 'A', baseUri, contractUri, maxSupply, unitPrice, mintAllowance);
        let receipt = await tx.wait();

        let [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;
        const token = await nfuTokenFactory.attach(contractAddress);

        const auctionCap = 10;
        const auctionDuration = 60 * 60;

        tx = await deployerProxy.connect(deployer)
            .deployEnglishAuctionMachine(auctionCap, auctionDuration, projectId, mockJbDirectory.address, token.address, deployer.address);
        receipt = await tx.wait();
        [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;
        const machine = await englishAuctionMachineFactory.attach(contractAddress);

        await expect(machine.initialize(auctionCap, auctionDuration, projectId, mockJbDirectory.address, token.address, deployer.address)).to.be.reverted;
        await expect(token.connect(accounts[0]).addMinter(machine.address)).to.be.reverted;
        await token.connect(deployer).addMinter(machine.address);
        await expect(machine.connect(accounts[0]).bid({ value: 0 })).not.to.be.reverted;

        expect(await machine.currentTokenId()).to.equal(1);
        expect(await token.totalSupply()).to.equal(1);
        expect(await token.ownerOf(1)).to.equal(machine.address);
    });

    it('Deploy DutchAuctionMachine clone (v007)', async () => {
        const nfuTokenFactory = await ethers.getContractFactory('NFUToken', { signer: deployer });
        const dutchAuctionMachineFactory = await ethers.getContractFactory('DutchAuctionMachine', { signer: deployer });

        const name = 'Test NFT'
        const symbol = 'NFT';
        const baseUri = 'ipfs://hidden';
        const contractUri = 'ipfs://metadata';
        const projectId = 99;
        const unitPrice = ethers.utils.parseEther('0.001');
        const maxSupply = 20;
        const mintAllowance = 2;

        let tx = await deployerProxy.connect(deployer)
            .deployNFUToken(deployer.address, name + ' A', symbol + 'A', baseUri, contractUri, maxSupply, unitPrice, mintAllowance);
        let receipt = await tx.wait();

        let [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;
        const token = await nfuTokenFactory.attach(contractAddress);

        const auctionCap = 10;
        const auctionDuration = 60 * 60;
        const periodDuration = 600;
        const priceMultiplier = 6;

        tx = await deployerProxy.connect(deployer)
            .deployDutchAuctionMachine(auctionCap, auctionDuration, periodDuration, priceMultiplier, projectId, mockJbDirectory.address, token.address, deployer.address);
        receipt = await tx.wait();
        [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;
        const machine = await dutchAuctionMachineFactory.attach(contractAddress);

        await expect(machine.initialize(auctionCap, auctionDuration, periodDuration, priceMultiplier, projectId, mockJbDirectory.address, token.address, deployer.address)).to.be.reverted;
        await expect(token.connect(accounts[0]).addMinter(machine.address)).to.be.reverted;
        await token.connect(deployer).addMinter(machine.address);
        await expect(machine.connect(accounts[0]).bid({ value: 0 })).not.to.be.reverted;

        expect(await machine.currentTokenId()).to.equal(1);
        expect(await token.totalSupply()).to.equal(1);
        expect(await token.ownerOf(1)).to.equal(machine.address);
    });

    it('Deploy TraitToken clone (v007)', async () => {
        const traitTokenFactory = await ethers.getContractFactory('TraitToken', { signer: deployer });

        const name = 'Trait NFT'
        const symbol = 'NFT';
        const baseUri = 'ipfs://hidden';
        const contractUri = 'ipfs://metadata';
        const unitPrice = ethers.utils.parseEther('0.001');
        const maxSupply = 20;
        const mintAllowance = 2;

        let tx = await deployerProxy.connect(deployer)
            .deployTraitToken(
                accounts[0].address,
                name,
                symbol,
                baseUri,
                contractUri,
                maxSupply,
                unitPrice,
                mintAllowance);
        let receipt = await tx.wait();

        let [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;
        expect(contractType).to.equal('TraitToken');
        const token = await traitTokenFactory.attach(contractAddress);
    });

    it('Deploy NFUEdition clone (v007)', async () => {
        const now = await helpers.time.latest();
        const nfuTokenFactory = await ethers.getContractFactory('NFUEdition', { signer: deployer });

        const name = 'Test NFT'
        const symbol = 'NFT';
        const baseUri = 'ipfs://hidden';
        const contractUri = 'ipfs://metadata';
        const unitPrice = ethers.utils.parseEther('0.001');
        const maxSupply = 20;
        const mintAllowance = 2;
        const mintPeriodStart = Math.floor(now + 60 * 60);
        const mintPeriodEnd = Math.floor(now + 24 * 60 * 60);

        const targetAdmin = accounts[0];

        let tx = await deployerProxy.connect(deployer)
            .deployNFUEdition(targetAdmin.address, name, symbol, baseUri, contractUri, maxSupply, unitPrice, mintAllowance);
        let receipt = await tx.wait();

        let [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;
        expect(contractType).to.equal('NFUEdition');
        const token = await nfuTokenFactory.attach(contractAddress);

        await token.connect(targetAdmin).updateMintPeriod(mintPeriodStart, mintPeriodEnd);
        await expect(token.connect(deployer).updateMintPeriod(mintPeriodStart, mintPeriodEnd)).to.be.reverted;

        await token.connect(targetAdmin).registerEdition(1000, ethers.utils.parseEther('0.0001'));
        await token.connect(targetAdmin).registerEdition(1000, ethers.utils.parseEther('0.001'));
        await token.connect(targetAdmin).registerEdition(1000, ethers.utils.parseEther('0.01'));

        expect(await token.editions(0)).to.equal(1000);
    });

    it('Deploy ThinProjectPayer clone (v007)', async () => {
        const thinProjectPayerFactory = await ethers.getContractFactory('ThinProjectPayer', { signer: deployer });

        let tx = await deployerProxy.connect(deployer)
            .deployProjectPayer(
                mockJbDirectory.address,
                mockJbOperatorStore.address,
                mockJbProjects.address,
                2, // defaultProjectId,
                accounts[1].address, // defaultBeneficiary,
                false, // defaultPreferClaimedTokens,
                false, // defaultPreferAddToBalance,
                '', // defaultMemo,
                '0x00' // defaultMetadata
            );
        let receipt = await tx.wait();

        let [contractType, contractAddress] = receipt.events.filter(e => e.event === 'Deployment')[0].args;
        expect(contractType).to.equal('ThinProjectPayer');
        thinPayer = await thinProjectPayerFactory.attach(contractAddress);
    });

    it('ThinProjectPayer clone (v007): receive', async () => {
        const projectId = 2;

        mockJbDirectory.primaryTerminalOf.whenCalledWith(projectId, jbxJbTokensEth).returns(mockJbEthTerminal.address);
        mockJbEthTerminal.pay.returns(1);
        mockJbEthTerminal.decimalsForToken.whenCalledWith(jbxJbTokensEth).returns(18);

        await expect(deployer.sendTransaction({ to: thinPayer.address, value: ethers.utils.parseEther('1') }))
            .not.to.be.reverted;
    });

    it('ThinProjectPayer clone (v007): setDefaultValues', async () => {
        const projectId = 2;
        const beneficiary = deployer.address;
        const preferClaimedTokens = false;
        const memo = '';
        const metadata = '0x00';
        const defaultPreferAddToBalance = false;

        const JBOperations_MANAGE_PAYMENTS = 254;
        mockJbOperatorStore.hasPermission.whenCalledWith(deployer.address, deployer.address, projectId, JBOperations_MANAGE_PAYMENTS).returns(true);
        mockJbDirectory.controllerOf.whenCalledWith(projectId).returns(deployer.address);
        mockJbProjects.ownerOf.whenCalledWith(projectId).returns(deployer.address);

        await expect(thinPayer.connect(deployer).setDefaultValues(
            projectId,
            beneficiary,
            preferClaimedTokens,
            memo,
            metadata,
            defaultPreferAddToBalance
        )).not.to.be.reverted;

        await expect(thinPayer.connect(accounts[0]).setDefaultValues(
            projectId,
            beneficiary,
            preferClaimedTokens,
            memo,
            metadata,
            defaultPreferAddToBalance
        )).to.be.reverted;
    });

    it('ThinProjectPayer clone (v007): pay', async () => {
        const projectId = 2;
        const token = jbxJbTokensEth;
        const amount = ethers.utils.parseEther('0.1');
        const decimals = 18;
        const beneficiary = deployer.address;
        const minReturnedTokens = 0;
        const preferClaimedTokens = false;
        const memo = '';
        const metadata = '0x00';

        await expect(thinPayer.connect(accounts[0]).pay(
            projectId,
            token,
            amount,
            decimals,
            beneficiary,
            minReturnedTokens,
            preferClaimedTokens,
            memo,
            metadata,
            { value: amount }
        )).not.to.be.reverted;
    });

    it('ThinProjectPayer clone (v007): addToBalanceOf', async () => {
        const projectId = 2;
        const token = jbxJbTokensEth;
        const amount = ethers.utils.parseEther('0.1');
        const decimals = 18;
        const memo = '';
        const metadata = '0x00';

        await expect(thinPayer.connect(accounts[0]).addToBalanceOf(
            projectId,
            token,
            amount,
            decimals,
            memo,
            metadata,
            { value: amount }
        )).not.to.be.reverted;
    });
});

// npx hardhat test test/extensions/deployer/deployer-upgrade.test.ts
