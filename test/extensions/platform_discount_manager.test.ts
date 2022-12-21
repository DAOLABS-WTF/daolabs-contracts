import { expect } from 'chai';
import { ethers } from 'hardhat';
import { smock } from '@defi-wonderland/smock';

enum TokenType {
    ERC20,
    ERC721,
    ERC1155
}

describe('PlatformDiscountManager Tests', () => {
    let deployer;
    let accounts;
    let mock20Token;
    let mock721Token;
    let mock1155Token;
    let discountManager;

    before(async () => {
        [deployer, ...accounts] = await ethers.getSigners();

        const platformDiscountManagerFactory = await ethers.getContractFactory('PlatformDiscountManager');
        discountManager = await platformDiscountManagerFactory.connect(deployer).deploy();
        await discountManager.deployed();

        // const mock20TokenFactory = await ethers.getContractFactory('MockERC20', deployer);
        // mock20Token = await mock20TokenFactory.connect(deployer).deploy();
        // await mock20Token.connect(deployer).mint(deployer.address, 2_000_000_000);

        mock20Token = await smock.fake('MockERC20');

    });

    before('Mock state', async () => {
        mock20Token.balanceOf.whenCalledWith(accounts[0].address).returns('1000000000000000000000');
        mock20Token.balanceOf.whenCalledWith(accounts[1].address).returns('500000000000000000000');
        mock20Token.balanceOf.whenCalledWith(accounts[2].address).returns(0);
    });

    it('registerDiscount: invalid discount', async () => {
        await expect(discountManager.connect(accounts[0]).registerDiscount(mock20Token.address, TokenType.ERC20, 0, 1_000, 10_001))
            .to.be.revertedWithCustomError(discountManager, 'INVALID_DISCOUNT');
    });

    it('removeDiscount: invalid discount', async () => {
        await expect(discountManager.connect(accounts[0]).removeDiscount(mock20Token.address, TokenType.ERC20, 0, 5_000))
            .to.be.revertedWithCustomError(discountManager, 'INVALID_DISCOUNT');
    });

    it('registerDiscount: discount', async () => {
        await expect(discountManager.connect(accounts[0]).registerDiscount(mock20Token.address, TokenType.ERC20, 0, 1_000, 1_000))
            .not.to.be.reverted;
    });

    // getDiscountInfo

    it('removeDiscount: invalid discount', async () => {
        await expect(discountManager.connect(accounts[0]).removeDiscount(mock20Token.address, TokenType.ERC20, 0, 500))
            .to.be.revertedWithCustomError(discountManager, 'INVALID_DISCOUNT');
    });

    it('getPrice: full price', async () => {
        expect(await discountManager.getPrice(accounts[1].address, ethers.utils.parseEther('1')))
            .to.equal(ethers.utils.parseEther('1'));
    });

    it('getPrice: discounted price', async () => {
        expect(await discountManager.getPrice(accounts[0].address, ethers.utils.parseEther('1')))
            .to.equal(ethers.utils.parseEther('0.9'));
    });
});
