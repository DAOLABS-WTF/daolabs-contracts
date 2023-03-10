import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { smock } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import jbDirectory from '../../../artifacts/contracts/JBDirectory.sol/JBDirectory.json';
import jbTerminal from '../../../artifacts/contracts/abstract/JBPayoutRedemptionPaymentTerminal.sol/JBPayoutRedemptionPaymentTerminal.json';
import iQuoter from '../../../artifacts/contracts/extensions/NFT/components/BaseNFT.sol/IQuoter.json';
import iNFTPriceResolver from '../../../artifacts/contracts/extensions/NFT/interfaces/INFTPriceResolver.sol/INFTPriceResolver.json';

describe('NFUEdition tests', () => {
    const jbxJbTokensEth = '0x000000000000000000000000000000000000EEEe';

    let deployer: SignerWithAddress;
    let accounts: SignerWithAddress[];

    let directory: any;
    let terminal: any;
    let uniswapQuoter: any;

    let nfTokenFactory: any;
    let editionToken: any;
    let randomizedEditionToken: any;
    const basicBaseUri = 'ipfs://hidden';
    const basicContractUri = 'ipfs://metadata';
    const basicProjectId = 99;
    const basicUnitPrice = ethers.utils.parseEther('0.001');
    const basicMaxSupply = 20;
    const basicMintAllowance = 8;

    before('Initialize accounts', async () => {
        [deployer, ...accounts] = await ethers.getSigners();
    });

    before('Mock related contracts', async () => {
        directory = await smock.fake(jbDirectory.abi);
        terminal = await smock.fake(jbTerminal.abi);
        uniswapQuoter = await smock.fake(iQuoter.abi, { address: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6' });

        await terminal.pay.returns(0);
        await directory.isTerminalOf.whenCalledWith(basicProjectId, terminal.address).returns(true);
        await directory.primaryTerminalOf.whenCalledWith(basicProjectId, jbxJbTokensEth).returns(terminal.address);
        uniswapQuoter.quoteExactInputSingle.returns(BigNumber.from('1000000000000000000000'));
    });

    before('Initialize contracts', async () => {
        nfTokenFactory = await ethers.getContractFactory('NFUEdition');
        editionToken = await nfTokenFactory.connect(deployer).deploy();
        await editionToken.connect(deployer).initialize(
            deployer.address,
            'Test NFT',
            'NFT',
            basicBaseUri,
            basicContractUri,
            basicMaxSupply,
            basicUnitPrice,
            basicMintAllowance,
            0,
            0,
        );

        randomizedEditionToken = await nfTokenFactory.connect(deployer).deploy();
        await randomizedEditionToken.connect(deployer).initialize(
            deployer.address,
            'Test NFT',
            'NFT',
            basicBaseUri,
            basicContractUri,
            basicMaxSupply,
            basicUnitPrice,
            basicMintAllowance,
            0,
            0,
        );

        await randomizedEditionToken.connect(deployer).setRandomizedMint(true);
    });

    it('Mint failures', async () => {
        await expect(editionToken.connect(accounts[0])['mint()']({ value: basicUnitPrice }))
            .to.be.revertedWithCustomError(editionToken, 'INVALID_OPERATION');

        await expect(editionToken.connect(accounts[0])['mint()']({ value: basicUnitPrice }))
            .to.be.revertedWithCustomError(editionToken, 'INVALID_OPERATION');

        await expect(editionToken.connect(accounts[0])['mint(uint256)'](0, { value: basicUnitPrice }))
            .to.be.revertedWithCustomError(editionToken, 'INVALID_OPERATION');

        await expect(editionToken.connect(accounts[0])['mint(uint256)'](1, { value: basicUnitPrice }))
            .to.be.revertedWithCustomError(editionToken, 'INVALID_OPERATION');

        await expect(editionToken.connect(deployer).mintFor(accounts[1].address))
            .to.be.revertedWithCustomError(editionToken, 'INVALID_OPERATION');
    });

    it('Register editions', async () => {
        await editionToken.connect(deployer).registerEdition(10, ethers.utils.parseEther('0.0001'));
        await editionToken.connect(deployer).registerEdition(8, ethers.utils.parseEther('0.001'));
        await editionToken.connect(deployer).registerEdition(2, ethers.utils.parseEther('0.01'));

        expect(await editionToken.editions(0)).to.equal(10);
        expect(await editionToken.editions(1)).to.equal(8);
        expect(await editionToken.editions(2)).to.equal(2);
    });

    it('Mint', async () => {
        await expect(editionToken.connect(accounts[0]).mintEditionFor(2, accounts[2].address)).to.be.reverted;
        expect(await editionToken.balanceOf(accounts[2].address)).to.equal(0);

        await editionToken.connect(deployer).mintEditionFor(2, accounts[2].address);
        expect(await editionToken.balanceOf(accounts[2].address)).to.equal(1);

        await editionToken.connect(accounts[0])['mint(uint256)'](1, { value: ethers.utils.parseEther('0.001') });
        expect(await editionToken.totalSupply()).to.equal(2);

        await expect(editionToken.connect(accounts[0])['mint(uint256)'](2, { value: ethers.utils.parseEther('0.001') })).to.be.reverted;
        await expect(editionToken.connect(accounts[0])['mint(uint256)'](3, { value: ethers.utils.parseEther('1') })).to.be.reverted;

        await editionToken.connect(accounts[0])['mint(uint256)'](1, { value: ethers.utils.parseEther('0.001') });
        expect(await editionToken.totalSupply()).to.equal(3);
        expect(await editionToken.balanceOf(accounts[0].address)).to.equal(2);
        expect(await editionToken.mintedEditions(1)).to.equal(2);

        expect(await editionToken.mintedEditions(0)).to.equal(0);

        // fail due to payment failure
        await editionToken.connect(deployer).setPayoutReceiver(ethers.constants.AddressZero);
        await expect(editionToken.connect(accounts[0])['mint(uint256)'](1, { value: ethers.utils.parseEther('0.001') })).to.be.revertedWithCustomError(editionToken, 'PAYMENT_FAILURE');
        await editionToken.connect(deployer).setPayoutReceiver(deployer.address);

        await editionToken.connect(deployer).setPause(true);
        await expect(editionToken.connect(accounts[0])['mint(uint256)'](0, { value: ethers.utils.parseEther('0.0001') })).to.be.revertedWithCustomError(editionToken, 'MINTING_PAUSED');
        await editionToken.connect(deployer).setPause(false);
    });

    it('Mint with PriceResolver', async () => {
        const priceResolver = await smock.fake(iNFTPriceResolver.abi,);
        priceResolver.getPrice.returns(basicUnitPrice);

        await expect(editionToken.connect(accounts[0]).updatePriceResolver(priceResolver.address)).to.be.reverted;
        await expect(editionToken.connect(deployer).updatePriceResolver(priceResolver.address)).not.to.be.reverted;

        await expect(editionToken.connect(accounts[3])['mint(uint256)'](0, { value: ethers.utils.parseEther('0.001') })).not.to.be.reverted;
        expect(await editionToken.balanceOf(accounts[3].address)).to.equal(1);

        await expect(editionToken.connect(accounts[3])['mint(uint256)'](0, { value: ethers.utils.parseEther('0.0015') })).not.to.be.reverted;
        expect(await editionToken.balanceOf(accounts[3].address)).to.equal(2);

        await expect(editionToken.connect(deployer).updatePriceResolver(ethers.constants.AddressZero)).not.to.be.reverted;
    });

    it('Supply exhaustion', async () => {
        await editionToken.connect(deployer).mintEditionFor(2, accounts[2].address);
        expect(await editionToken.balanceOf(accounts[2].address)).to.equal(2);

        await expect(editionToken.connect(deployer).mintEditionFor(2, accounts[2].address)).to.be.revertedWithCustomError(editionToken, 'SUPPLY_EXHAUSTED');
        await expect(editionToken.connect(accounts[0])['mint(uint256)'](2, { value: ethers.utils.parseEther('0.01') }))
            .to.be.revertedWithCustomError(editionToken, 'SUPPLY_EXHAUSTED');

        await editionToken.connect(accounts[0])['mint(uint256)'](0, { value: ethers.utils.parseEther('0.0001') });
        await editionToken.connect(accounts[0])['mint(uint256)'](0, { value: ethers.utils.parseEther('0.0001') });
        await editionToken.connect(accounts[0])['mint(uint256)'](0, { value: ethers.utils.parseEther('0.0001') });
        await editionToken.connect(accounts[0])['mint(uint256)'](0, { value: ethers.utils.parseEther('0.0001') });
        await editionToken.connect(accounts[0])['mint(uint256)'](0, { value: ethers.utils.parseEther('0.0001') });
        await editionToken.connect(accounts[0])['mint(uint256)'](0, { value: ethers.utils.parseEther('0.0001') });

        await expect(editionToken.connect(accounts[0])['mint(uint256)'](0, { value: ethers.utils.parseEther('0.0001') }))
            .to.be.revertedWithCustomError(editionToken, 'ALLOWANCE_EXHAUSTED');

        await editionToken.connect(accounts[2])['mint(uint256)'](0, { value: ethers.utils.parseEther('0.0001') });
        await editionToken.connect(accounts[2])['mint(uint256)'](0, { value: ethers.utils.parseEther('0.0001') });
        await expect(editionToken.connect(accounts[2])['mint(uint256)'](0, { value: ethers.utils.parseEther('0.0001') }))
            .to.be.revertedWithCustomError(editionToken, 'SUPPLY_EXHAUSTED');

        await editionToken.connect(accounts[2])['mint(uint256)'](1, { value: ethers.utils.parseEther('0.001') });
        await editionToken.connect(accounts[2])['mint(uint256)'](1, { value: ethers.utils.parseEther('0.001') });
        await editionToken.connect(accounts[2])['mint(uint256)'](1, { value: ethers.utils.parseEther('0.001') });
        await editionToken.connect(accounts[2])['mint(uint256)'](1, { value: ethers.utils.parseEther('0.001') });

        expect(await editionToken.mintedEditions(0)).to.equal(10);
        expect(await editionToken.mintedEditions(1)).to.equal(6);
        expect(await editionToken.mintedEditions(2)).to.equal(2);

        await expect(editionToken.connect(accounts[2])['mint(uint256)'](0, { value: ethers.utils.parseEther('0.0001') }))
            .to.be.revertedWithCustomError(editionToken, 'SUPPLY_EXHAUSTED');
    });

    it('Randomized mint', async () => {
        const tokenPrice = ethers.utils.parseEther('0.0001');

        await expect(randomizedEditionToken.connect(deployer).registerEdition(10, tokenPrice)).to.emit(randomizedEditionToken, 'RegisterEdition').withArgs(0, 10, tokenPrice);

        await expect(randomizedEditionToken.connect(accounts[0])['mint(uint256)'](1, { value: tokenPrice }))
            .to.be.revertedWithCustomError(randomizedEditionToken, 'INVALID_OPERATION');

        await randomizedEditionToken.connect(accounts[0])['mint(uint256)'](0, { value: tokenPrice });
        await randomizedEditionToken.connect(accounts[0])['mint(uint256)'](0, { value: tokenPrice });
        expect(await randomizedEditionToken.totalSupply()).to.equal(2);
    });


});

// npx hardhat test test/extensions/nft/nfuedition.test.ts
