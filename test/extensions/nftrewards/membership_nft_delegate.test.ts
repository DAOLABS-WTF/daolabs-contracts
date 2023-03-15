import { expect } from 'chai';
import { ethers } from 'hardhat';
import { smock } from '@defi-wonderland/smock';

import baseMembership from '../../../artifacts/contracts/extensions/NFT/components/BaseMembership.sol/BaseMembership.json';

describe('MembershipNFTDataSourceDelegate Tests', () => {
    let deployer;
    let accounts;

    const projectId = 2;
    const JBTokens_ETH = '0x000000000000000000000000000000000000EEEe';

    let mockMembershipNFT: any

    before('Initialize accounts', async () => {
        [deployer, ...accounts] = await ethers.getSigners();
    });

    before('Setup mocks', async () => {
        mockMembershipNFT = await smock.fake(baseMembership.abi);
    });

    it('MembershipNFTDataSourceDelegate constructor()', async () => {
        const minContribution = ethers.utils.parseEther('0.1');

        const factory = await ethers.getContractFactory('MembershipNFTDataSourceDelegate');
        const datasource = await factory.connect(deployer).deploy(mockMembershipNFT.address, JBTokens_ETH, minContribution);
        await datasource.deployed();

        expect(await datasource.minContribution()).to.equal(minContribution);
    });
});

// npx hardhat test test/extensions/nftrewards/membership_nft_delegate.test.ts
