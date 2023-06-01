# Deployment Scripts

This directory has scripts for fully automated deployment of both the core Juicebox v3 platform and DAOLABS extensions.

## Core Platform deployment

Platform deployment consists of three steps: deployment, verification and configuration. The scripts are written for hardhat and rely on hardhat configuration for deployer account, network definition, etc. The deploy script will instantiate contracts with reasonable defaults and make the "first" hardhat account the owner of the contracts where it's relevant. This account will then be able to administer those contracts and transfer them to a multisig if desired.

The `deploy` script will write a log, to `/deployments/NETWORK_NAME/platform.json` in json format which will include contract information, including address and ABI. This file can then be used with the interface code to call the contracts. After deployment is completed the `verify` and `configure` scripts can be run in parallel. The former publishes the source code to etherscan while the latter creates records on the just-deployed contracts to bootstrap the platform. Once again, where relevant, the initial hardhat account will be the admin/owner. The latest Ethereum Goerli deployment log is [available](../deployments/goerli/platform.json).

```bash
npx hardhat run scripts/platform/deploy.ts --network goerli
npx hardhat run scripts/platform/verify.ts --network goerli
npx hardhat run scripts/platform/configure.ts --network goerli
```

The scripts use `dotenv` to load secrets from `.env` in the root directory. The following variables are required:

```bash
INFURA_API_KEY=
ALCHEMY_MAINNET_URL=
ALCHEMY_MAINNET_API_KEY=
REPORT_GAS=true
COINMARKETCAP_API_KEY=
ETHERSCAN_API_KEY=
PRIVATE_KEY=
```

The most-recent version of hardhat config uses Infura rather than Alchemy, examples of both are provided in the comments.

### Constants

The scripts require some information to run that cannot be provided by hardhat. They are contained in the `constants` section of the `platform.json` document. `JBCurrencies_ETH` and `JBCurrencies_USD` with values of `1` and `2` respectively are constants from the [JBCurrencies](../contracts/libraries/JBCurrencies.sol) contract and are used for payment terminal configuration. Additionally there is `chainlinkV2UsdEthPriceFeed` which on Goerli is deployed at `0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e` provides pricing information. `projectMetadataCID` is meant to be an IPFS hash containing parent project metadata.

The above values are required. There are also several optional ones. `primaryBeneficiary` must be an Ethereum address which will receive token emissions, if configure, from the parent project. This can be a DAO contract for example. `platformOwner` if set is will be the parent project admin. This can be a multisig. By default this is the first hardhat account. `protocolLaunchDate` sets the parent project birthday which may impact token emissions. By default this value is 10 seconds in the past relative to the time when the `configure` script is run.

For production deployments it's essential to review the configuration script to ensure that the splits, the funding cycle and token issuance settings are in line with expectation.

Note that `platform.json`, `extensions.json`, etc serve as a running log of contracts that were deployed. This is helpful if deployment, especially on mainnet, is interrupted for some reason. Running the script again attempts idempotent execution by skipping contracts that have already been deployed. To redeploy some or all contracts, delete the relevant entries from the these files before running the scripts.

## Extension deployment

Platform extensions developed by DAOLABS expand core functionality and provide convenience features. Like the core scripts this would be run via hardhat as follows. `DaiHedgeDelegate` is deployed as part of the platform.

```bash
npx hardhat run scripts/deploy/RoleManager.ts --network goerli
npx hardhat run scripts/deploy/VestingPlanManager.ts --network goerli
```

Platform operators looking to add these features only need to deploy one instance of the contracts above. Individual project owners may opt to deploy their own version `DaiTreasuryDelegate` to change the fee structure for example.

### Deployer

The Deployer contract is likely to change relatively frequently. It is a gateway for platform users to deploy certain contracts, like NFTs, auction contracts, if they desire and so on. The contract has multiple parts and is upgradeable. To demonstrate this functionality out of the gate it was developed in parts even before the DAOLABS project went "gold". At the time of writing there are six versions of the contract progressively adding functionality. While other extensions are part of the platform deployment script, this one is not. It is expected that DAOLABS project admins will be deploying this contract as a platform service. There should be no reason why a platform user would want to deploy their own.

```bash
npx hardhat run scripts/deploy/Deployer_v001.ts --network goerli
...
npx hardhat run scripts/deploy/Deployer_vnnn.ts --network goerli
```

### UI Hooks

When deploying this platform with the intent of using the [Svelte UI](https://github.com/tankbottoms/daolabs-ux), also run

```bash
npx hardhat run scripts/platform/export.ts --network goerli
```

And follow those instructions on how to use the files written to `/exports/daolabs`.

## Sampling Results

It may be worth while to test the scripts in a fully contained environment prior to deploying on chain. To do so, run a node via hardhat to fork the Goerli network and then run the scripts against that node. 

```bash
npx hardhat node --fork https://goerli.infura.io/v3/$INFURA_API_KEY --fork-block-number 8472216
```

Then the the scripts like so:

```bash
npx hardhat run scripts/platform/deploy.ts --network localhost
npx hardhat run scripts/platform/configure.ts --network localhost
npx hardhat run scripts/deploy/Deployer_v001.ts --network localhost
npx hardhat run scripts/deploy/Deployer_v002.ts --network localhost
npx hardhat run scripts/deploy/Deployer_v003.ts --network localhost
npx hardhat run scripts/deploy/Deployer_v004.ts --network localhost
npx hardhat run scripts/deploy/Deployer_v005.ts --network localhost
npx hardhat run scripts/deploy/Deployer_v006.ts --network localhost
npx hardhat run scripts/deploy/Deployer_v007.ts --network localhost
npx hardhat run scripts/platform/samples.ts --network localhost
```

The `samples` script at the end will test some common workflows. Running it will give the deployer additional confidence, in addition to unit tests, that the contracts are working as expected. It's worth while looking over that script to uncomment commands of interest. The `samples` expects to find the `extensions.json` deployment log which is created by `Deployer_vnnn` scripts. At a minimum the sample script will deploy a ProjectPayer contract from the extensions connection, to do that it will need the `Deployer` v7 which is deployed by running the `Deployer_v001` through `Deployer_v007` scripts in sequence. It is expected that the `/deploy/*` scripts will fail verification to Etherscan. You will need to create seed json logs for platform and extensions with the "localhost" key and the constants key (in `platform.json`) before running the scripts.
