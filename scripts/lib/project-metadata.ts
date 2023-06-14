export const NFT_METADATA_CONTRIBUTION_FLOOR_ATTRIBUTES_INDEX = 0;
export type TokenRef = {
    value: string;
    type: 'project' | 'erc20';
};

export type NftPostPayModalConfig = {
    ctaText: string | undefined;
    ctaLink: string | undefined;
    content: string | undefined;
};

export const LATEST_METADATA_VERSION = 6;

type ProjectMetadataV1 = Partial<{
    name: string;
    description: string;
    logoUri: string;
    infoUri: string;
    payText: string;
    version: 1;
}>;

// add `tokens`
type ProjectMetadataV2 = Partial<
    Omit<ProjectMetadataV1, 'version'> & {
        version: 2;
        tokens: TokenRef[];
    }
>;

// `payText` -> `payButton`
type ProjectMetadataV3 = Partial<
    Omit<ProjectMetadataV2, 'version' | 'payText'> & {
        version: 3;
        twitter: string;
        twitterSignature: string;
        discord: string;
        payButton: string;
        payDisclosure: string;
    }
>;

// add `archived`
type ProjectMetadataV4 = Partial<
    Omit<ProjectMetadataV3, 'version'> & {
        version: 4;
        archived: boolean;
    }
>;

// add `nftPaymentSuccessModal`
type ProjectMetadataV5 = Partial<
    Omit<ProjectMetadataV4, 'version'> & {
        version: 5;
        nftPaymentSuccessModal: NftPostPayModalConfig;
    }
>;

// add `telegram`
export type ProjectMetadataV6 = Partial<
    Omit<ProjectMetadataV5, 'version'> & {
        version: typeof LATEST_METADATA_VERSION;
        telegram: string;
    }
>;

export type AnyProjectMetadata =
    | ProjectMetadataV1
    | ProjectMetadataV2
    | ProjectMetadataV3
    | ProjectMetadataV4
    | ProjectMetadataV5
    | ProjectMetadataV6;

// Converts metadata of any version to latest version
export const consolidateMetadata = (metadata: AnyProjectMetadata): ProjectMetadataV6 => {
    if (typeof metadata === 'string' && (metadata as Array<string>).includes('<html>')) {
        return {};
    }
    let logoUri: string;
    metadata.logoUri = metadata.logoUri ?? '';
    const testUriRegex = /\/ipfs\/[^:]+/gim;
    if (metadata.logoUri.startsWith('ipfs://')) {
        const cid = metadata.logoUri.replace('ipfs://', '');
        logoUri = `https://nftstorage.link/ipfs/${cid}`;
    } else if (metadata.logoUri.match(testUriRegex)) {
        const [pathname] = metadata.logoUri.match(testUriRegex);
        logoUri = `https://nftstorage.link${pathname}`;
    }
    return {
        ...metadata,
        logoUri: logoUri ?? metadata.logoUri,
        payButton: (metadata as ProjectMetadataV3).payButton ?? (metadata as ProjectMetadataV2).payText,
        version: LATEST_METADATA_VERSION
    };
};
