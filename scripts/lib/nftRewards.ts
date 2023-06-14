import { BigNumber, constants } from 'ethers';
import { parseEther } from 'ethers/lib/utils';
import { encodeIPFSUri, ipfsUrl, pinFileToIpfs } from './ipfs';

export const DEFAULT_NFT_MAX_SUPPLY = 1_000_000_000 - 1;
const WAD_DECIMALS = 18;
const V2_CURRENCY_ETH = 1;
enum JB721GovernanceType {
    NONE,
    TIERED,
    GLOBAL
}

// How we store reward tiers for use around the app
type NftRewardTier = {
    contributionFloor: number; // ETH amount
    maxSupply: number | undefined;
    remainingSupply: number | undefined;
    imageUrl: string; // link to ipfs
    name: string;
    id?: number;
    /* @deprecated - now derived from comparing contributionFloor between each */
    tierRank?: number; // cheapest tier is 1
    externalLink: string | undefined;
    description: string | undefined;

    default?: boolean | undefined;
};

async function uploadNftRewardToIPFS(rewardTier): Promise<string> {
    const ipfsNftRewardTier = {
        description: rewardTier.description,
        name: rewardTier.name,
        externalLink: rewardTier.externalLink,
        symbol: undefined,
        image: rewardTier.imageUrl,
        imageDataUrl: undefined,
        artifactUri: undefined,
        animationUri: undefined,
        displayUri: undefined,
        youtubeUri: undefined,
        backgroundColor: undefined,
        attributes: [
            {
                trait_type: 'Min. Contribution',
                value: rewardTier.contributionFloor
            },
            {
                trait_type: 'Max. Supply',
                value: rewardTier.maxSupply
            }
        ]
    };
    const data = await pinFileToIpfs(Buffer.from(JSON.stringify(ipfsNftRewardTier, null, ' ')), undefined, undefined, true);
    return data.IpfsHash;
}

// Uploads each nft reward tier to an individual location on IPFS
// returns an array of CIDs which point to each rewardTier on IPFS
async function uploadNftRewardsToIPFS(nftRewards): Promise<string[]> {
    return Promise.all(nftRewards.map((rewardTier) => uploadNftRewardToIPFS(rewardTier)));
}

export async function uploadNftCollectionMetadataToIPFS({
    collectionName,
    collectionDescription,
    collectionLogoUri,
    collectionInfoUri
}: {
    collectionName: string;
    collectionDescription: string;
    collectionLogoUri: string | undefined;
    collectionInfoUri: string | undefined;
}) {
    // TODO: add inputs for the rest of these fields
    const ipfsNftCollectionMetadata = {
        name: collectionName,
        description: collectionDescription,
        image: collectionLogoUri,
        seller_fee_basis_points: undefined,
        external_link: collectionInfoUri,
        fee_recipient: undefined
    };
    const data = await pinFileToIpfs(Buffer.from(JSON.stringify(ipfsNftCollectionMetadata, null, ' ')));
    return data.IpfsHash;
}

function buildJBDeployTiered721DelegateData({
    collectionUri,
    collectionName,
    collectionSymbol,
    tiers,
    ownerAddress,
    contractAddresses: { JBDirectoryAddress, JBFundingCycleStoreAddress, JBPricesAddress, JBTiered721DelegateStoreAddress }
}: {
    collectionUri: string;
    collectionName: string;
    collectionSymbol: string;
    tiers;
    ownerAddress: string;
    contractAddresses: {
        JBDirectoryAddress: string;
        JBFundingCycleStoreAddress: string;
        JBPricesAddress: string;
        JBTiered721DelegateStoreAddress: string;
    };
}) {
    const pricing = {
        tiers,
        currency: V2_CURRENCY_ETH,
        decimals: WAD_DECIMALS,
        prices: JBPricesAddress
    };

    return {
        directory: JBDirectoryAddress,
        name: collectionName,
        symbol: collectionSymbol,
        fundingCycleStore: JBFundingCycleStoreAddress,
        baseUri: ipfsUrl(''),
        tokenUriResolver: constants.AddressZero,
        contractUri: ipfsUrl(collectionUri),
        owner: ownerAddress,
        pricing,
        reservedTokenBeneficiary: constants.AddressZero,
        store: JBTiered721DelegateStoreAddress,
        flags: {
            lockReservedTokenChanges: false,
            lockVotingUnitChanges: false,
            lockManualMintingChanges: false
        },
        governanceType: JB721GovernanceType.TIERED
    };
}

// Builds JB721TierParams[] (see juice-721-delegate:structs/JB721TierParams.sol)
export function buildJB721TierParams({ cids, rewardTiers }: { cids: string[]; rewardTiers }) {
    // `cids` are ordered the same as `rewardTiers` so can get corresponding values from same index
    return cids
        .map((cid, index) => {
            const contributionFloorWei = parseEther(rewardTiers[index].contributionFloor.toString());
            const maxSupply = rewardTiers[index].maxSupply;
            const initialQuantity = BigNumber.from(maxSupply ?? DEFAULT_NFT_MAX_SUPPLY);
            const encodedIPFSUri = encodeIPFSUri(cid);

            return {
                contributionFloor: contributionFloorWei,
                lockedUntil: BigNumber.from(0),
                initialQuantity,
                votingUnits: 0,
                reservedRate: 0,
                reservedTokenBeneficiary: constants.AddressZero,
                encodedIPFSUri,
                allowManualMint: false,
                shouldUseBeneficiaryAsDefault: false,
                transfersPausable: false
            };
        })
        .sort((a, b) => {
            // Tiers MUST BE in ascending order when sent to contract.
            if (BigNumber.from(a.contributionFloor).gt(b.contributionFloor)) return 1;
            if (BigNumber.from(a.contributionFloor).lt(b.contributionFloor)) return -1;
            return 0;
        });
}

export async function getTiered721DelegateData(
    projectOwner: string,
    nftRewards: {
        collectionLogoUri: string;
        collectionInfoUri: string;
        collectionName: string;
        collectionSymbol: string;
        collectionDescription?: string;
        rewardTiers: NftRewardTier[];
    },
    { JBDirectoryAddress, JBFundingCycleStoreAddress, JBPricesAddress, JBTiered721DelegateStoreAddress }: Record<string, string>
) {
    const { collectionLogoUri, collectionInfoUri, collectionName, collectionSymbol, collectionDescription, rewardTiers } = nftRewards;

    const [rewardTiersCids, nftCollectionMetadataCid] = await Promise.all([
        uploadNftRewardsToIPFS(nftRewards.rewardTiers),
        uploadNftCollectionMetadataToIPFS({
            collectionName: collectionName,
            collectionDescription: collectionDescription,
            collectionLogoUri: collectionLogoUri,
            collectionInfoUri: collectionInfoUri
        })
    ]);

    const tiers = buildJB721TierParams({
        cids: rewardTiersCids,
        rewardTiers
    });

    const deployTiered721DelegateData = buildJBDeployTiered721DelegateData({
        collectionName,
        collectionSymbol,
        collectionUri: nftCollectionMetadataCid,
        contractAddresses: {
            JBDirectoryAddress,
            JBFundingCycleStoreAddress,
            JBPricesAddress,
            JBTiered721DelegateStoreAddress
        },
        ownerAddress: projectOwner,
        tiers
    });
    return deployTiered721DelegateData;
}
