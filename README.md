# Grindery Smart Contracts

## Installation

```shell
yarn install
```

## Compile

```shell
yarn build
```

## Test

```shell
yarn test
```

You can set the size of batches for testing via the `BATCH_SIZE` env var e.g
```shell
BATCH_SIZE=10 yarn test
```

## Deploy

Create a `.env` file and set the following variables

- `PRIVATE_KEY`
- `INFURA_PROJECT_ID`

Run

```shell
yarn deploy <network>
```
e.g for local hardhat network
```shell
yarn deploy hardhat
```

This will perform the following steps

```shell
yarn build
yarn hardhat deploy --network <network>
```

## Usage

You can find the dApp usage documentation at [https://github.com/grindery-io/grindery-contracts/blob/master/USAGE.md](https://github.com/grindery-io/grindery-contracts/blob/master/USAGE.md)
