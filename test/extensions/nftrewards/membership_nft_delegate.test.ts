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
        mockMembershipNFT.balanceOf.whenCalledWith(accounts[0].address).returns(0);
        mockMembershipNFT.mintFor.whenCalledWith(accounts[1].address).returns(1);
    });

    it('MembershipNFTDataSourceDelegate constructor()', async () => {
        const minContribution = ethers.utils.parseEther('0.1');

        const factory = await ethers.getContractFactory('MembershipNFTDataSourceDelegate');
        const datasource = await factory.connect(deployer).deploy(mockMembershipNFT.address, JBTokens_ETH, minContribution);
        await datasource.deployed();

        expect(await datasource.minContribution()).to.equal(minContribution);
    });

    it('MembershipNFTDataSourceDelegate payParams(), meet payment requirement', async () => {
        const minContribution = ethers.utils.parseEther('0.1');
        const factory = await ethers.getContractFactory('MembershipNFTDataSourceDelegate');
        const datasource = await factory.connect(deployer).deploy(mockMembershipNFT.address, JBTokens_ETH, minContribution);
        await datasource.deployed();

        const payParamsData = {
            terminal: accounts[0].address,
            payer: accounts[0].address,
            amount: { token: JBTokens_ETH, value: ethers.utils.parseEther('0.1'), decimals: 18, currency: 1 },
            projectId,
            currentFundingCycleConfiguration: 0,
            beneficiary: accounts[0].address,
            weight: ethers.utils.parseUnits('1000000', 18),
            reservedRate: 0,
            memo: '',
            metadata: '0x'
        }
        const result = await datasource.payParams(payParamsData);
        expect(result['delegateAllocations'][0]['amount']).to.equal(minContribution);

    });

    it('MembershipNFTDataSourceDelegate payParams(), do not meet payment requirement', async () => {
        const minContribution = ethers.utils.parseEther('0.1');
        const factory = await ethers.getContractFactory('MembershipNFTDataSourceDelegate');
        const datasource = await factory.connect(deployer).deploy(mockMembershipNFT.address, JBTokens_ETH, minContribution);
        await datasource.deployed();

        const payParamsData = {
            terminal: accounts[0].address,
            payer: accounts[0].address,
            amount: { token: JBTokens_ETH, value: ethers.utils.parseEther('0.01'), decimals: 18, currency: 1 },
            projectId,
            currentFundingCycleConfiguration: 0,
            beneficiary: accounts[0].address,
            weight: ethers.utils.parseUnits('1000000', 18),
            reservedRate: 0,
            memo: '',
            metadata: '0x'
        }

        const result = await datasource.payParams(payParamsData);
        expect(result['delegateAllocations'][0]['amount']).to.equal(0);
    });

    it('MembershipNFTDataSourceDelegate payParams(), meet payment requirement, but already has membership', async () => {
        const minContribution = ethers.utils.parseEther('0.1');
        const factory = await ethers.getContractFactory('MembershipNFTDataSourceDelegate');
        const datasource = await factory.connect(deployer).deploy(mockMembershipNFT.address, JBTokens_ETH, minContribution);
        await datasource.deployed();

        mockMembershipNFT.balanceOf.whenCalledWith(accounts[0].address).returns(1);

        const payParamsData = {
            terminal: accounts[0].address,
            payer: accounts[0].address,
            amount: { token: JBTokens_ETH, value: ethers.utils.parseEther('0.1'), decimals: 18, currency: 1 },
            projectId,
            currentFundingCycleConfiguration: 0,
            beneficiary: accounts[0].address,
            weight: ethers.utils.parseUnits('1000000', 18),
            reservedRate: 0,
            memo: '',
            metadata: '0x'
        }

        const result = await datasource.payParams(payParamsData);
        expect(result['delegateAllocations'][0]['amount']).to.equal(0);
    });

    it('MembershipNFTDataSourceDelegate redeemParams()', async () => {
        const minContribution = ethers.utils.parseEther('0.1');
        const factory = await ethers.getContractFactory('MembershipNFTDataSourceDelegate');
        const datasource = await factory.connect(deployer).deploy(mockMembershipNFT.address, JBTokens_ETH, minContribution);
        await datasource.deployed();

        const redeemParamsData = {
            terminal: accounts[0].address,
            holder: accounts[0].address,
            projectId,
            currentFundingCycleConfiguration: 0,
            tokenCount: 0,
            totalSupply: 0,
            overflow: 0,
            reclaimAmount: { token: JBTokens_ETH, value: ethers.utils.parseEther('0.1'), decimals: 18, currency: 1 },
            useTotalOverflow: false,
            redemptionRate: 0,
            memo: '',
            metadata: '0x'
        }

        const result = await datasource.redeemParams(redeemParamsData);
        expect(result['delegateAllocations'].length).to.equal(0);
    });

    it('MembershipNFTDataSourceDelegate didPay(), meet payment requirement', async () => {
        const minContribution = ethers.utils.parseEther('0.1');
        const factory = await ethers.getContractFactory('MembershipNFTDataSourceDelegate');
        const datasource = await factory.connect(deployer).deploy(mockMembershipNFT.address, JBTokens_ETH, minContribution);
        await datasource.deployed();

        const didPayData = {
            payer: accounts[0].address,
            projectId,
            currentFundingCycleConfiguration: 0,
            amount: { token: JBTokens_ETH, value: ethers.utils.parseEther('0.2'), decimals: 18, currency: 1 },
            forwardedAmount: { token: JBTokens_ETH, value: ethers.utils.parseEther('0.1'), decimals: 18, currency: 1 },
            projectTokenCount: 0,
            beneficiary: accounts[1].address,
            preferClaimedTokens: false,
            memo: '',
            metadata: '0x'
        };

        await expect(datasource.didPay(didPayData)).not.to.be.reverted;
    });
});

// npx hardhat test test/extensions/nftrewards/membership_nft_delegate.test.ts
