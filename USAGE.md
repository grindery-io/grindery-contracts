# Grindery Smart Contracts Usage

Documentation about how the smart contracts in this repo are used in dApps

## [GrinderyBatchTransfer.sol](https://github.com/grindery-io/grindery-contracts/blob/master/contracts/GrinderyBatchTransfer.sol)

This contract is used when making batch transfers directly from the user's wallet.

**Batch Transfer** 

- An instance of this contract is deployed and it's address included in the dApp.

- Batch transfers are executed by calling the `batchTransfer` function.

- Ether is sent as the value of the `batchTransfer` transaction 
while for ERC20 tokens, allowances for each token are pre-approved for the batch transfer contract 
which then completes the transfer by via `transferFrom` function of the ERC20 contract.

**Recovery**

This contract implements a few mechanisms to prevent ether and ERC20 tokens from being stuck and lost in the contract due to accidental transfers.

- Direct ether transfers are automatically rejected because this contract neither implements a receive nor a callback function.

- A `recover` function is implemented as a rescue mechanism. 
It can only be called by the contract's owner, accepts a `recipient` address and a `token` address (0x0 for ether) as arguments 
and sends the contract's token balance to the specified recipient.
See the [OwnerRecoverable contract](https://github.com/grindery-io/grindery-contracts/blob/master/contracts/base/OwnerRecoverable.sol) that this contract inherits for implementation details.


## [GrinderyDelegatedBatchTransfer.sol](https://github.com/grindery-io/grindery-contracts/blob/master/contracts/GrinderyDelegatedBatchTransfer.sol)

This contract is used when making delegated/indirect batch transfers e.g withdrawal requests to Aragon DAOs.

**Batch Transfer** 

- This contract's bytecode is included in the dApp and an instance is deployed for each delegated batch transfer. 
The deployed contract's address returned to the user and used as the recipient in other dApps.

- Ether and/or ERC20 tokens are sent to the deployed contract's address 
before the `completeTransfer` function is called by any relayer to complete the transfer to the individual recipients. 


**Recovery**

This contract implements a rescue mechanism to prevent ether and ERC20 tokens from being stuck and lost in the contract. 

Ether and tokens can be stuck when:

- the ether and/or tokens sent to the contract are insufficient to complete a batch transfer.

- the contract received more ether and/or tokens than necessary to complete a batch transfer 
leading to ether and/or token balances after the batch transfer is completed.

When the contract is in a "recoverable" state due to the conditions explained above 
(i.e it's ether and/or token balances are insufficient to complete a batch transfer),
the `batchRecover` function - which accepts a `recipient` address as it's only argument - 
can be called by the contract's owner to send the contract's ether and/or token balances to the specified recipient.
