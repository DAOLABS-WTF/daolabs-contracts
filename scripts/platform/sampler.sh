#!/usr/bin/env bash

source .env

PROCESS_ID=$(ps -A | grep -m1 sampler | awk '{print $1}')

sampler=(
    "npx hardhat node --fork https://goerli.infura.io/v3/$INFURA_API_KEY --fork-block-number 8472216"
    "npx hardhat run scripts/platform/configure.ts --network localhost"
    "npx hardhat run scripts/platform/deploy.ts --network localhost"
    "npx hardhat run scripts/deploy/Deployer_v001.ts --network localhost"
    "npx hardhat run scripts/deploy/Deployer_v002.ts --network localhost"
    "npx hardhat run scripts/deploy/Deployer_v003.ts --network localhost"
    "npx hardhat run scripts/deploy/Deployer_v004.ts --network localhost"
    "npx hardhat run scripts/deploy/Deployer_v005.ts --network localhost"
    "npx hardhat run scripts/deploy/Deployer_v006.ts --network localhost"
    "npx hardhat run scripts/deploy/Deployer_v007.ts --network localhost"
    "npx hardhat run scripts/platform/samples.ts --network localhost"
)

echo "processId: $PROCESS_ID"

set -x
for c in "${sampler[@]}"; do
    # echo "$c"
    ps -p $PROCESS_ID -o %cpu,%mem
    "$($c)"
done
set +x
