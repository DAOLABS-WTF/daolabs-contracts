import axios from 'axios';
import FormData from 'form-data';
import { base58 } from 'ethers/lib/utils';

export const ipfsCidToWorkerUrl = (cid: string) => `https://move.xyz/ipfs/${cid}`;
export const cidFromUrl = (url: string | undefined) => url?.split('/').pop();

export async function pinFileToIpfs(
    files: File | Blob | ArrayBuffer | File[],
    metadata?: Record<string, string | number | Record<string, string | number>>,
    onUploadProgress?: (progressEvent: ProgressEvent) => void,
    cidV0 = false
) {
    const formdata = new FormData();

    if (Array.isArray(files)) {
        for (let i = 0; i < files.length; i++) {
            formdata.append(files[i].name, files[i]);
        }
    } else {
        formdata.append('file', files);
    }

    if (metadata) {
        formdata.append(
            'pinataMetadata',
            JSON.stringify({
                keyvalues: metadata
            })
        );
    }

    return axios
        .post(`${process.env.FIREBASE_FUNCTIONS_URL as string}/${cidV0 ? 'ipfsPinFilesV0Cid/pin' : `app/ipfs`}`, formdata, {
            maxContentLength: Infinity, // this is needed to prevent axios from erroring out with large files
            headers: {
                'Content-Type': 'multipart/form-data;',
                apikey: process.env.API_KEY,
                ...formdata.getHeaders()
            },
            onUploadProgress
        })
        .then(({ data }) => data);
}

/**
 * Return an IPFS URI using the IPFS URI scheme.
 */
export function ipfsUrl(cid: string, path?: string) {
    return `ipfs://${cid}${path ?? ''}`;
}

/**
 * Return a hex-encoded CID to store on-chain.
 *
 * Hex-encoded CIDs are used to store some CIDs on-chain because they are more gas-efficient.
 */
export function encodeIPFSUri(cid: string) {
    return '0x' + Buffer.from(base58.decode(cid).slice(2)).toString('hex');
}

/**
 * Return the IPFS CID from a given hex-endoded string.
 *
 * Hex-encoded CIDs are used to store some CIDs on-chain because they are more gas-efficient.
 */
export function decodeEncodedIPFSUri(hex: string) {
    // Add default ipfs values for first 2 bytes:
    // - function:0x12=sha2, size:0x20=256 bits
    // - also cut off leading "0x"
    const hashHex = '1220' + hex.slice(2);
    const hashBytes = Buffer.from(hashHex, 'hex');
    const hashStr = base58.encode(hashBytes);
    return hashStr;
}
