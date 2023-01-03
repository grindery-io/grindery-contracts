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

You can find the dApp usage documentation at [USAGE.md](./USAGE.md)

## Audits

Grindery Pay has been audited by [0xGuard](https://github.com/0xGuard-com).

An initial audit was performed on commit [e4b0f72591b3a961a9017d2ae1726ed7814cc0e5](https://github.com/grindery-io/grindery-contracts/tree/e4b0f72591b3a961a9017d2ae1726ed7814cc0e5).

The final audit was performed on commit [90522f245ac6fdc8d80dbfa78f462180ebe9f3f8](https://github.com/grindery-io/grindery-contracts/tree/90522f245ac6fdc8d80dbfa78f462180ebe9f3f8) which addressed all the issues raised in the initial audit.

The final audit report is available as a pdf at [/audits/GrinderyPay2021Nov.pdf](./audits/GrinderyPay2021Nov.pdf).

## Security and Liability

All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

##  License

All smart contracts are released under LGPL-3.0