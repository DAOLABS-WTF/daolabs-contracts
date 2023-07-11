import * as dotenv from 'dotenv';
import { ethers } from 'hardhat';
import * as hre from 'hardhat';
import * as winston from 'winston';

import { verifyRecordContract } from '../lib/lib';

async function main() {
    dotenv.config();

    const logger = winston.createLogger({
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf((info) => {
                return `${info.timestamp}|${info.level}|${info.message}`;
            })
        ),
        transports: [
            new winston.transports.Console({
                level: 'info'
            }),
            new winston.transports.File({
                level: 'debug',
                filename: 'log/deploy/NFToken.log',
                handleExceptions: true,
                maxsize: 5 * 1024 * 1024, // 5 mb
                maxFiles: 5
            })
        ]
    });

    ///
    logger.info(`deploying sample NFToken to ${hre.network.name}`);

    const deploymentLogPath = `./deployments/${hre.network.name}/extensions.json`;

    const [deployer] = await ethers.getSigners();
    logger.info(`connected as ${deployer.address}`);

    const contract = new hre.ethers.Contract(
        '0x0F5f857cdD344da87f4B423E77cA5F014b8dd0A3',
        [
            {
                type: 'constructor',
                payable: false,
                inputs: [
                    {
                        type: 'tuple',
                        name: '_commonNFTAttributes',
                        components: [
                            {
                                type: 'string',
                                name: 'name'
                            },
                            {
                                type: 'string',
                                name: 'symbol'
                            },
                            {
                                type: 'string',
                                name: 'baseUri'
                            },
                            {
                                type: 'bool',
                                name: 'revealed'
                            },
                            {
                                type: 'string',
                                name: 'contractUri'
                            },
                            {
                                type: 'uint256',
                                name: 'maxSupply'
                            },
                            {
                                type: 'uint256',
                                name: 'unitPrice'
                            },
                            {
                                type: 'uint256',
                                name: 'mintAllowance'
                            }
                        ]
                    },
                    {
                        type: 'tuple',
                        name: '_permissionValidationComponents',
                        components: [
                            {
                                type: 'address',
                                name: 'jbxDirectory'
                            },
                            {
                                type: 'address',
                                name: 'jbxProjects'
                            },
                            {
                                type: 'address',
                                name: 'jbxOperatorStore'
                            }
                        ]
                    },
                    {
                        type: 'address',
                        name: '_feeOracle'
                    }
                ]
            },
            {
                type: 'error',
                name: 'ALLOWANCE_EXHAUSTED',
                inputs: []
            },
            {
                type: 'error',
                name: 'ALREADY_REVEALED',
                inputs: []
            },
            {
                type: 'error',
                name: 'CALLER_BLOCKED',
                inputs: []
            },
            {
                type: 'error',
                name: 'INCORRECT_PAYMENT',
                inputs: [
                    {
                        type: 'uint256'
                    }
                ]
            },
            {
                type: 'error',
                name: 'INVALID_RATE',
                inputs: []
            },
            {
                type: 'error',
                name: 'INVALID_TOKEN',
                inputs: []
            },
            {
                type: 'error',
                name: 'MINTING_PAUSED',
                inputs: []
            },
            {
                type: 'error',
                name: 'MINT_CONCLUDED',
                inputs: []
            },
            {
                type: 'error',
                name: 'MINT_NOT_STARTED',
                inputs: []
            },
            {
                type: 'error',
                name: 'PAYMENT_FAILURE',
                inputs: []
            },
            {
                type: 'error',
                name: 'PROVENANCE_REASSIGNMENT',
                inputs: []
            },
            {
                type: 'error',
                name: 'SUPPLY_EXHAUSTED',
                inputs: []
            },
            {
                type: 'error',
                name: 'UNAUTHORIZED',
                inputs: []
            },
            {
                type: 'event',
                anonymous: false,
                name: 'Approval',
                inputs: [
                    {
                        type: 'address',
                        name: 'owner',
                        indexed: true
                    },
                    {
                        type: 'address',
                        name: 'spender',
                        indexed: true
                    },
                    {
                        type: 'uint256',
                        name: 'id',
                        indexed: true
                    }
                ]
            },
            {
                type: 'event',
                anonymous: false,
                name: 'ApprovalForAll',
                inputs: [
                    {
                        type: 'address',
                        name: 'owner',
                        indexed: true
                    },
                    {
                        type: 'address',
                        name: 'operator',
                        indexed: true
                    },
                    {
                        type: 'bool',
                        name: 'approved',
                        indexed: false
                    }
                ]
            },
            {
                type: 'event',
                anonymous: false,
                name: 'RoleAdminChanged',
                inputs: [
                    {
                        type: 'bytes32',
                        name: 'role',
                        indexed: true
                    },
                    {
                        type: 'bytes32',
                        name: 'previousAdminRole',
                        indexed: true
                    },
                    {
                        type: 'bytes32',
                        name: 'newAdminRole',
                        indexed: true
                    }
                ]
            },
            {
                type: 'event',
                anonymous: false,
                name: 'RoleGranted',
                inputs: [
                    {
                        type: 'bytes32',
                        name: 'role',
                        indexed: true
                    },
                    {
                        type: 'address',
                        name: 'account',
                        indexed: true
                    },
                    {
                        type: 'address',
                        name: 'sender',
                        indexed: true
                    }
                ]
            },
            {
                type: 'event',
                anonymous: false,
                name: 'RoleRevoked',
                inputs: [
                    {
                        type: 'bytes32',
                        name: 'role',
                        indexed: true
                    },
                    {
                        type: 'address',
                        name: 'account',
                        indexed: true
                    },
                    {
                        type: 'address',
                        name: 'sender',
                        indexed: true
                    }
                ]
            },
            {
                type: 'event',
                anonymous: false,
                name: 'Transfer',
                inputs: [
                    {
                        type: 'address',
                        name: 'from',
                        indexed: true
                    },
                    {
                        type: 'address',
                        name: 'to',
                        indexed: true
                    },
                    {
                        type: 'uint256',
                        name: 'id',
                        indexed: true
                    }
                ]
            },
            {
                type: 'function',
                name: 'DAI',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'address'
                    }
                ]
            },
            {
                type: 'function',
                name: 'DEFAULT_ADMIN_ROLE',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'bytes32'
                    }
                ]
            },
            {
                type: 'function',
                name: 'MINTER_ROLE',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'bytes32'
                    }
                ]
            },
            {
                type: 'function',
                name: 'REVEALER_ROLE',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'bytes32'
                    }
                ]
            },
            {
                type: 'function',
                name: 'WETH9',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'address'
                    }
                ]
            },
            {
                type: 'function',
                name: 'addMinter',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'address',
                        name: '_account'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'addRevealer',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'address',
                        name: '_account'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'approve',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'address',
                        name: 'spender'
                    },
                    {
                        type: 'uint256',
                        name: 'id'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'balanceOf',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [
                    {
                        type: 'address',
                        name: 'owner'
                    }
                ],
                outputs: [
                    {
                        type: 'uint256'
                    }
                ]
            },
            {
                type: 'function',
                name: 'baseUri',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'string'
                    }
                ]
            },
            {
                type: 'function',
                name: 'contractURI',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'string'
                    }
                ]
            },
            {
                type: 'function',
                name: 'contractUri',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'string'
                    }
                ]
            },
            {
                type: 'function',
                name: 'feeOracle',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'address'
                    }
                ]
            },
            {
                type: 'function',
                name: 'getApproved',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [
                    {
                        type: 'uint256'
                    }
                ],
                outputs: [
                    {
                        type: 'address'
                    }
                ]
            },
            {
                type: 'function',
                name: 'getMintPrice',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [
                    {
                        type: 'address',
                        name: '_minter'
                    }
                ],
                outputs: [
                    {
                        type: 'uint256',
                        name: 'expectedPrice'
                    }
                ]
            },
            {
                type: 'function',
                name: 'getRoleAdmin',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [
                    {
                        type: 'bytes32',
                        name: 'role'
                    }
                ],
                outputs: [
                    {
                        type: 'bytes32'
                    }
                ]
            },
            {
                type: 'function',
                name: 'getRoleMember',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [
                    {
                        type: 'bytes32',
                        name: 'role'
                    },
                    {
                        type: 'uint256',
                        name: 'index'
                    }
                ],
                outputs: [
                    {
                        type: 'address'
                    }
                ]
            },
            {
                type: 'function',
                name: 'getRoleMemberCount',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [
                    {
                        type: 'bytes32',
                        name: 'role'
                    }
                ],
                outputs: [
                    {
                        type: 'uint256'
                    }
                ]
            },
            {
                type: 'function',
                name: 'grantRole',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'bytes32',
                        name: 'role'
                    },
                    {
                        type: 'address',
                        name: 'account'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'hasRole',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [
                    {
                        type: 'bytes32',
                        name: 'role'
                    },
                    {
                        type: 'address',
                        name: 'account'
                    }
                ],
                outputs: [
                    {
                        type: 'bool'
                    }
                ]
            },
            {
                type: 'function',
                name: 'isApprovedForAll',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [
                    {
                        type: 'address'
                    },
                    {
                        type: 'address'
                    }
                ],
                outputs: [
                    {
                        type: 'bool'
                    }
                ]
            },
            {
                type: 'function',
                name: 'isPaused',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'bool'
                    }
                ]
            },
            {
                type: 'function',
                name: 'isRevealed',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'bool'
                    }
                ]
            },
            {
                type: 'function',
                name: 'jbxDirectory',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'address'
                    }
                ]
            },
            {
                type: 'function',
                name: 'jbxProjects',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'address'
                    }
                ]
            },
            {
                type: 'function',
                name: 'maxSupply',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'uint256'
                    }
                ]
            },
            {
                type: 'function',
                name: 'mint',
                constant: false,
                stateMutability: 'payable',
                payable: true,
                inputs: [],
                outputs: [
                    {
                        type: 'uint256',
                        name: 'tokenId'
                    }
                ]
            },
            {
                type: 'function',
                name: 'mint',
                constant: false,
                stateMutability: 'payable',
                payable: true,
                inputs: [
                    {
                        type: 'address',
                        name: '_account'
                    }
                ],
                outputs: [
                    {
                        type: 'uint256',
                        name: 'tokenId'
                    }
                ]
            },
            {
                type: 'function',
                name: 'mintAllowance',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'uint256'
                    }
                ]
            },
            {
                type: 'function',
                name: 'mintFor',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'address',
                        name: '_account'
                    }
                ],
                outputs: [
                    {
                        type: 'uint256',
                        name: 'tokenId'
                    }
                ]
            },
            {
                type: 'function',
                name: 'mintPeriod',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'uint256'
                    }
                ]
            },
            {
                type: 'function',
                name: 'mintPeriodEnd',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'uint256',
                        name: 'end'
                    }
                ]
            },
            {
                type: 'function',
                name: 'mintPeriodStart',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'uint256',
                        name: 'start'
                    }
                ]
            },
            {
                type: 'function',
                name: 'name',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'string'
                    }
                ]
            },
            {
                type: 'function',
                name: 'operatorFilter',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'address'
                    }
                ]
            },
            {
                type: 'function',
                name: 'operatorStore',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'address'
                    }
                ]
            },
            {
                type: 'function',
                name: 'ownerOf',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [
                    {
                        type: 'uint256',
                        name: '_tokenId'
                    }
                ],
                outputs: [
                    {
                        type: 'address',
                        name: 'owner'
                    }
                ]
            },
            {
                type: 'function',
                name: 'payoutReceiver',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'address'
                    }
                ]
            },
            {
                type: 'function',
                name: 'priceResolver',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'address'
                    }
                ]
            },
            {
                type: 'function',
                name: 'projectId',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'uint256'
                    }
                ]
            },
            {
                type: 'function',
                name: 'provenanceHash',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'string'
                    }
                ]
            },
            {
                type: 'function',
                name: 'randomizedMint',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'bool'
                    }
                ]
            },
            {
                type: 'function',
                name: 'removeMinter',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'address',
                        name: '_account'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'removeRevealer',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'address',
                        name: '_account'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'renounceRole',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'bytes32',
                        name: 'role'
                    },
                    {
                        type: 'address',
                        name: 'account'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'revokeRole',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'bytes32',
                        name: 'role'
                    },
                    {
                        type: 'address',
                        name: 'account'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'royaltyInfo',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [
                    {
                        type: 'uint256',
                        name: '_tokenId'
                    },
                    {
                        type: 'uint256',
                        name: '_salePrice'
                    }
                ],
                outputs: [
                    {
                        type: 'address',
                        name: 'receiver'
                    },
                    {
                        type: 'uint256',
                        name: 'royaltyAmount'
                    }
                ]
            },
            {
                type: 'function',
                name: 'royaltyRate',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'uint256'
                    }
                ]
            },
            {
                type: 'function',
                name: 'royaltyReceiver',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'address'
                    }
                ]
            },
            {
                type: 'function',
                name: 'safeTransferFrom',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'address',
                        name: '_from'
                    },
                    {
                        type: 'address',
                        name: '_to'
                    },
                    {
                        type: 'uint256',
                        name: '_id'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'safeTransferFrom',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'address',
                        name: '_from'
                    },
                    {
                        type: 'address',
                        name: '_to'
                    },
                    {
                        type: 'uint256',
                        name: '_id'
                    },
                    {
                        type: 'bytes',
                        name: '_data'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'setApprovalForAll',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'address',
                        name: 'operator'
                    },
                    {
                        type: 'bool',
                        name: 'approved'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'setBaseURI',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'string',
                        name: '_baseUri'
                    },
                    {
                        type: 'bool',
                        name: '_reveal'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'setContractURI',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'string',
                        name: '_contractUri'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'setPause',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'bool',
                        name: 'pause'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'setPayoutReceiver',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'address',
                        name: '_payoutReceiver'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'setProjectId',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'uint256',
                        name: '_projectId'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'setProvenanceHash',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'string',
                        name: '_provenanceHash'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'setRandomizedMint',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'bool',
                        name: '_randomizedMint'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'setRoyalties',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'address',
                        name: '_royaltyReceiver'
                    },
                    {
                        type: 'uint16',
                        name: '_royaltyRate'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'supportsInterface',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [
                    {
                        type: 'bytes4',
                        name: 'interfaceId'
                    }
                ],
                outputs: [
                    {
                        type: 'bool'
                    }
                ]
            },
            {
                type: 'function',
                name: 'symbol',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'string'
                    }
                ]
            },
            {
                type: 'function',
                name: 'tokenURI',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [
                    {
                        type: 'uint256',
                        name: '_tokenId'
                    }
                ],
                outputs: [
                    {
                        type: 'string',
                        name: 'uri'
                    }
                ]
            },
            {
                type: 'function',
                name: 'totalSupply',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'uint256'
                    }
                ]
            },
            {
                type: 'function',
                name: 'transferFrom',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'address',
                        name: '_from'
                    },
                    {
                        type: 'address',
                        name: '_to'
                    },
                    {
                        type: 'uint256',
                        name: '_id'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'transferTokenBalance',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'address',
                        name: 'token'
                    },
                    {
                        type: 'address',
                        name: 'to'
                    },
                    {
                        type: 'uint256',
                        name: 'amount'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'uniswapQuoter',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'address'
                    }
                ]
            },
            {
                type: 'function',
                name: 'unitPrice',
                constant: true,
                stateMutability: 'view',
                payable: false,
                inputs: [],
                outputs: [
                    {
                        type: 'uint256'
                    }
                ]
            },
            {
                type: 'function',
                name: 'updateMintPeriod',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'uint256',
                        name: '_mintPeriodStart'
                    },
                    {
                        type: 'uint256',
                        name: '_mintPeriodEnd'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'updateOperatorFilter',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'address',
                        name: '_operatorFilter'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'updatePriceResolver',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'address',
                        name: '_priceResolver'
                    }
                ],
                outputs: []
            },
            {
                type: 'function',
                name: 'updateUnitPrice',
                constant: false,
                payable: false,
                inputs: [
                    {
                        type: 'uint256',
                        name: '_unitPrice'
                    }
                ],
                outputs: []
            }
        ],
        deployer
    );

    const feeOracle = await contract.feeOracle();
    const operatorStore = await contract.operatorStore();
    const jbxDirectory = await contract.jbxDirectory();
    const jbxProjects = await contract.jbxProjects();

    console.log({
        feeOracle,
        operatorStore,
        jbxDirectory,
        jbxProjects
    });
    // const nfTokenRecord = getContractRecord('NFToken', deploymentLogPath);
    // console.log(nfTokenRecord);
    // return;
    await verifyRecordContract(
        'NFToken',
        '0x0F5f857cdD344da87f4B423E77cA5F014b8dd0A3',
        [
            {
                name: 'Space Rick Riding a Panda',
                symbol: 'SPACERICK',
                baseUri: 'ipfs://bafybeigxudd6mdwlbr3mh3o377b5pziiifc7zmsm4yq27rlghcx6qm7opa/',
                revealed: true,
                contractUri: 'ipfs://bafkreiajzuavrsvxiewfn3l7nvocz4gj7xas6t7d5l4amlgknpbeoafp2i',
                maxSupply: '250',
                unitPrice: '10000000000000000',
                mintAllowance: '10'
            },
            {
                jbxOperatorStore: operatorStore,
                jbxDirectory: jbxDirectory,
                jbxProjects: jbxProjects
            },
            feeOracle
        ],
        deploymentLogPath
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// npx hardhat run scripts/deploy/NFToken.ts --network goerli
