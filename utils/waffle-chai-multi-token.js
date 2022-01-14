const {BigNumber, Contract, Wallet} = require("ethers");

function isAccount(account) {
  return account instanceof Contract || account instanceof Wallet;
}

function getAddressOf(account) {
  if (isAccount(account)) {
    return account.address;
  } else {
    return account.getAddress();
  }
}

function getAddresses(accounts) {
  return Promise.all(accounts.map((account) => getAddressOf(account)));
}

async function getEthBalances(accounts, blockNumber) {
  return Promise.all(
    accounts.map((account) => {
      //ensure(account.provider !== undefined, TypeError, 'Provider not found');
      if (blockNumber !== undefined) {
        return account.provider.getBalance(getAddressOf(account), blockNumber);
      } else {
        return account.provider.getBalance(getAddressOf(account));
      }
    })
  );
}

async function getTokenBalances(token, accounts) {
  return Promise.all(
    accounts.map(async (account) => {
      return token['balanceOf(address)'](getAddressOf(account));
    })
  );
}

async function getTxFees(
  accounts,
  txResponse,
) {
  return Promise.all(
    accounts.map(async (account) => {
      if (await getAddressOf(account) === txResponse.from) {
        const txReceipt = await txResponse.wait();
        const gasPrice = (
          txResponse.gasPrice !== null && txResponse.gasPrice !== undefined
        )?txResponse.gasPrice:txReceipt.effectiveGasPrice;
        return gasPrice.mul(txReceipt.gasUsed);
      }
      return 0;
    })
  );
}

async function getBalanceChanges(
  transactionCall,
  tokenAccountDetails,
) {
  let balancesBeforeGroups = await Promise.all(
    tokenAccountDetails.map(({token, accounts}) => {
      if(!token) {
        return getEthBalances(accounts);
      }
      return getTokenBalances(token, accounts);
    })
  );

  const txResponse = await transactionCall();
  const txReceipt = await txResponse.wait();
  const txBlockNumber = txReceipt.blockNumber;

  let txFeesGroups = await Promise.all(
    tokenAccountDetails.map(({token, accounts}) => {
      if(!token) {
        return getTxFees(accounts, txResponse);
      }
      return accounts.map(() => 0);
    })
  );

  const balancesAfterGroups = await Promise.all(
    tokenAccountDetails.map(({token, accounts}) => {
      if(!token) {
        return getEthBalances(accounts, txBlockNumber);
      }
      return getTokenBalances(token, accounts);
    })
  );

  return balancesAfterGroups.map(
    (balancesAfter, idx) =>
      balancesAfter.map((balance, subIdx) => balance.add(txFeesGroups[idx][subIdx]).sub(balancesBeforeGroups[idx][subIdx]))
  );
}

module.exports = (chai, utils) => {
  const Assertion = chai.Assertion;
  Assertion.addMethod('changeMultipleTokenBalances', function (tokenChangeGroups) {
    const cleanedTokenChangeGroups = tokenChangeGroups || [];
    const subject = this._obj;
    const derivedPromise = Promise.all([
      getBalanceChanges(subject, cleanedTokenChangeGroups.map(({token, accounts}) => ({token, accounts}))),
      Promise.all(cleanedTokenChangeGroups.map(({accounts}) => getAddresses(accounts)))
    ]).then(
      ([actualChangesGroups, accountAddressesGroups]) => {
        for (const [groupIdx, actualChanges] of actualChangesGroups.entries()) {
          const accountAddresses = accountAddressesGroups[groupIdx];
          const balanceChanges = tokenChangeGroups[groupIdx].changes;
          this.assert(
            actualChanges.every((change, idx) =>
              change.eq(BigNumber.from(balanceChanges[idx]))
            ),
            `Expected ${accountAddresses} to change balance by ${balanceChanges} wei, ` +
            `but it has changed by ${actualChanges} wei`,
            `Expected ${accountAddresses} to not change balance by ${balanceChanges} wei,`,
            balanceChanges.map((balanceChange) => balanceChange.toString()),
            actualChanges.map((actualChange) => actualChange.toString())
          );
        }
      }
    );
    this.then = derivedPromise.then.bind(derivedPromise);
    this.catch = derivedPromise.catch.bind(derivedPromise);
    this.promise = derivedPromise;
    return this;
  });
};