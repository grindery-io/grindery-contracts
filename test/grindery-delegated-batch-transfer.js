const {expect, use} = require("chai"),
  {waffle} = require("hardhat"),
  {deployContract} = require("../utils/deploy"),
  {ZERO_ADDRESS, CONTRACTS, EVENTS, ERROR_MESSAGES, GAS_OVERPAY} = require("../utils/constants"),
  waffleChaiMultiTokenPlugin = require("../utils/waffle-chai-multi-token"),
  {getAccountAddresses, getAmountSum, filterMatchingItemsByTokenIndex, setUpTokens,
    generateRecipients, generateAmounts, cleanAmounts
  } = require("../utils/tests");

use(waffleChaiMultiTokenPlugin);

describe("GrinderyDelegatedBatchTransfer", () => {
  let initiator, recipient, treasury, relayer, amount, recipients, amounts,
    delegatedBatchTransfer, tokens, token;

  before(async () => {
    // Test wallets
    const [wallet1, wallet2, wallet3, ...otherWallets] = waffle.provider.getWallets();

    initiator = wallet1; // Initiator of transfers
    treasury = wallet2; // Source of funds for transfers
    relayer = wallet3; // Relayer a.k.a non-trusted caller of the completeTransfer method

    recipients = generateRecipients(otherWallets); // generate recipient accounts
    amounts = generateAmounts(); // generate a list of amounts that match the recipients list

    // First recipient and amount for convenience
    recipient = recipients[0];
    amount = amounts[0];
  });

  // Utility method for setting up a delegated batch transfer
  const setUpDelegatedBatchTransfer = async (
    recipients, // list of recipients
    amounts, // list of corresponding amounts
    // list of corresponding token addresses (0x0 or empty list for ether)
    tokenAddresses = [],
    overrides = {},
  ) => {
    return deployContract(CONTRACTS.GRINDERY_DELEGATED_BATCH_TRANSFER, [
      recipients,
      amounts,
      tokenAddresses || [],
      overrides || {},
    ], initiator);
  };

  // Utility method for setting up and testing delegated batch transfer
  const setUpAndTestDelegatedBatchTransfer = async (
    recipients, // list of recipients
    amounts, // list of corresponding amounts
    // list of corresponding token addresses (0x0 or empty list for ether)
    tokenAddresses = [],
  ) => {
    return setUpDelegatedBatchTransfer(
      recipients,
      amounts,
      tokenAddresses || []
    ).then(async delegatedBatchTransfer => {
      const isERC20TokenTransfer = !tokenAddresses || !Array.isArray(tokenAddresses) || tokenAddresses.length > 0;

      // Test recipients getter
      for (const [idx,] of recipients.entries()) {
        await expect(
          await delegatedBatchTransfer.connect(relayer).recipients(idx)
        ).to.equal(recipients[idx]);
      }

      // Test amounts getter
      for (const [idx,] of amounts.entries()) {
        await expect(
          await delegatedBatchTransfer.connect(relayer).amounts(idx)
        ).to.equal(amounts[idx]);
      }

      if(isERC20TokenTransfer) {
        // Test tokenAddresses getter
        for (const [idx,] of tokenAddresses.entries()) {
          await expect(
            await delegatedBatchTransfer.connect(relayer).tokenAddresses(idx)
          ).to.equal(tokenAddresses[idx]);
        }
      }

      // Test recipients length
      await expect(
        await delegatedBatchTransfer.connect(relayer).getRecipientsLength()
      ).to.equal(recipients.length);

      // Test amounts length
      await expect(
        await delegatedBatchTransfer.connect(relayer).getAmountsLength()
      ).to.equal(amounts.length);

      if(isERC20TokenTransfer) {
        // Test tokenAddresses length
        await expect(
          await delegatedBatchTransfer.connect(relayer).getTokenAddressesLength()
        ).to.equal(tokenAddresses.length);
      }

      // Test recipients
      await expect(
        await delegatedBatchTransfer.connect(relayer).getRecipients()
      ).to.deep.equal(recipients);

      // Test amounts
      await expect(
        cleanAmounts(await delegatedBatchTransfer.connect(relayer).getAmounts())
      ).to.deep.equal(cleanAmounts(amounts));

      if(isERC20TokenTransfer) {
        // Test tokenAddresses
        await expect(
          await delegatedBatchTransfer.connect(relayer).getTokenAddresses()
        ).to.deep.equal(tokenAddresses);
      }
    });
  };

  // Utility method for setting up and funding a delegated batch transfer
  const setUpAndFundDelegatedBatchTransfer = async (
    recipients, // list of recipients
    amounts, // list of corresponding amounts
    // list of corresponding token addresses (0x0 or empty list for ether)
    tokenAddresses = [],
    // custom function to modify funding amount, receives expect transfer amount and index as arguments
    fundingAmountModifier = null
  ) => {
    return setUpDelegatedBatchTransfer(
      recipients,
      amounts,
      tokenAddresses || []
    ).then(async delegatedBatchTransfer => {
      // Transfer ether and tokens to delegatedBatchTransfer contract
      for (const [idx,] of recipients.entries()) {
        const tokenAddress = tokenAddresses && tokenAddresses[idx],
          token = tokenAddress && tokens && tokens.find(token => token.address === tokenAddress);
        let fundingAmount = amounts[idx];
        if (fundingAmountModifier && typeof fundingAmountModifier === 'function') {
          fundingAmount = fundingAmountModifier(fundingAmount, idx);
        }

        if (token) {
          await expect(
            () => token.connect(treasury).transfer(delegatedBatchTransfer.address, fundingAmount)
          ).to.changeTokenBalances(
            token,
            [treasury, delegatedBatchTransfer],
            [-fundingAmount, fundingAmount]
          );
        } else {
          await expect(
            await treasury.sendTransaction({
              to: delegatedBatchTransfer.address,
              value: fundingAmount,
            })
          ).to.changeEtherBalances(
            [treasury, delegatedBatchTransfer],
            [-fundingAmount, fundingAmount]
          );
        }
      }
      return delegatedBatchTransfer;
    });
  };

  describe("Ether transfers", () => {
    describe("Success", () => {
      it("Setup delegated ether transfer", async () => {
        await setUpAndTestDelegatedBatchTransfer(
          getAccountAddresses(recipients),
          amounts
        );
      });

      it("Transfer ether to 1 recipient", async () => {
        delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
          [recipient.address],
          [amount]
        );

        await expect(
          () => delegatedBatchTransfer.connect(relayer).completeTransfer()
        ).to.changeEtherBalances(
          [delegatedBatchTransfer, recipient],
          [-amount, amount]
        );
      });

      it("Transfer ether to multiple recipients", async () => {
        delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
          getAccountAddresses(recipients),
          amounts
        );

        await expect(
          () => delegatedBatchTransfer.connect(relayer).completeTransfer()
        ).to.changeEtherBalances(
          [delegatedBatchTransfer, ...recipients],
          [-getAmountSum(amounts), ...amounts]
        );
      });

      it("Emit BatchTransferRequested event", async () => {
        delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
          getAccountAddresses(recipients),
          amounts
        );

        await expect(
          delegatedBatchTransfer.deployTransaction
        ).to.emit(delegatedBatchTransfer, EVENTS.BATCH_TRANSFER_REQUESTED)
          .withArgs(initiator.address, getAccountAddresses(recipients), amounts, []);
      });

      it("Emit BatchTransfer event", async () => {
        delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
          getAccountAddresses(recipients),
          amounts
        );

        await expect(
          delegatedBatchTransfer.connect(relayer).completeTransfer()
        ).to.emit(delegatedBatchTransfer, EVENTS.BATCH_TRANSFER)
          .withArgs(delegatedBatchTransfer.address, getAccountAddresses(recipients), amounts, []);
      });
    });

    describe("Revert", () => {
      it("Revert on insufficient ether sent", async () => {
        delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
          getAccountAddresses(recipients),
          amounts,
          null,
          (amount, idx) => amount * (idx === 0 ? 0.5 : 1),
        );

        await expect(
          delegatedBatchTransfer.connect(relayer).completeTransfer()
        ).to.be.revertedWith(ERROR_MESSAGES.INSUFFICIENT_BALANCE);
      });
    });
  });

  describe("Token transfers", () => {
    before(async () => {
      // Deploy test ERC20 tokens and set balance for treasury wallet
      tokens = await setUpTokens(recipients, amounts, treasury);
      token = tokens[0];
    });

    describe("Success", () => {
      it("Setup delegated ERC20 token transfer", async () => {
        await setUpAndTestDelegatedBatchTransfer(
          getAccountAddresses(recipients),
          amounts,
          getAccountAddresses(tokens)
        );
      });

      it("Transfer ERC20 token to 1 recipient", async () => {
        delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
          [recipient.address],
          [amount],
          [token.address]
        );

        await expect(
          () => delegatedBatchTransfer.connect(relayer).completeTransfer()
        ).to.changeTokenBalances(
          token,
          [delegatedBatchTransfer, recipient],
          [-amount, amount]
        );
      });

      it("Transfer ERC20 tokens to multiple recipients", async () => {
        delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
          getAccountAddresses(recipients),
          amounts,
          getAccountAddresses(tokens)
        );

        await expect(
          () => delegatedBatchTransfer.connect(relayer).completeTransfer()
        ).to.changeMultipleTokenBalances(
          tokens.map((token) => ({
            token: token,
            accounts: [delegatedBatchTransfer, ...filterMatchingItemsByTokenIndex(token, recipients, tokens)],
            changes: [
              -getAmountSum(filterMatchingItemsByTokenIndex(token, amounts, tokens)),
              ...filterMatchingItemsByTokenIndex(token, amounts, tokens)
            ]
          }))
        );
      });

      it("Transfer ether and ERC20 tokens to multiple recipients", async () => {
        delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
          getAccountAddresses(recipients),
          amounts,
          [ZERO_ADDRESS, ...getAccountAddresses(tokens).slice(1)]
        );

        await expect(
          () => delegatedBatchTransfer.connect(relayer).completeTransfer()
        ).to.changeMultipleTokenBalances(
          tokens.map((token, idx) => {
            if (idx === 0) {
              return {
                token: null,
                accounts: [delegatedBatchTransfer, recipients[0]],
                changes: [-amounts[0], amounts[0]]
              }
            }
            return {
              token,
              accounts: [
                delegatedBatchTransfer,
                ...filterMatchingItemsByTokenIndex(token, recipients, tokens)
              ],
              changes: [
                -getAmountSum(filterMatchingItemsByTokenIndex(token, amounts, tokens)),
                ...filterMatchingItemsByTokenIndex(token, amounts, tokens)
              ]
            };
          })
        );
      });

      it("Emit BatchTransferRequested event", async () => {
        delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
          getAccountAddresses(recipients),
          amounts,
          getAccountAddresses(tokens)
        );

        await expect(
          delegatedBatchTransfer.deployTransaction
        ).to.emit(delegatedBatchTransfer, EVENTS.BATCH_TRANSFER_REQUESTED)
          .withArgs(
            initiator.address,
            getAccountAddresses(recipients),
            amounts,
            getAccountAddresses(tokens)
          );
      });

      it("Emit BatchTransfer event", async () => {
        delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
          getAccountAddresses(recipients),
          amounts,
          getAccountAddresses(tokens)
        );

        await expect(
          delegatedBatchTransfer.connect(relayer).completeTransfer()
        ).to.emit(delegatedBatchTransfer, EVENTS.BATCH_TRANSFER)
          .withArgs(
            delegatedBatchTransfer.address,
            getAccountAddresses(recipients),
            amounts,
            getAccountAddresses(tokens)
          );
      });
    });

    describe("Revert", () => {
      it("Revert on insufficient tokens sent", async () => {
        delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
          getAccountAddresses(recipients),
          amounts,
          getAccountAddresses(tokens),
          (amount, idx) => amount * (idx === 0 ? 0.5 : 1),
        );

        await expect(
          delegatedBatchTransfer.connect(relayer).completeTransfer()
        ).to.be.revertedWith(ERROR_MESSAGES.INSUFFICIENT_TOKEN_BALANCE);
      });
    });
  });

  describe("Revert on bad arguments", () => {
    it("Revert on no arguments", async () => {
      await expect(
        setUpDelegatedBatchTransfer(
          [],
          [],
          [],
          {
            gasLimit: GAS_OVERPAY,
          }
        )
      ).to.be.revertedWith(ERROR_MESSAGES.NO_RECIPIENTS);
    });

    it("Revert on less recipients than amounts", async () => {
      await expect(
        setUpDelegatedBatchTransfer(
          getAccountAddresses(recipients).slice(1),
          amounts,
          [],
          {
            gasLimit: GAS_OVERPAY,
          }
        )
      ).to.be.revertedWith(ERROR_MESSAGES.MISMATCH_RECIPIENTS_AND_AMOUNTS);
    });

    it("Revert on more recipients than amounts", async () => {
      await expect(
        setUpDelegatedBatchTransfer(
          getAccountAddresses(recipients),
          amounts.slice(1),
          [],
          {
            gasLimit: GAS_OVERPAY,
          }
        )
      ).to.be.revertedWith(ERROR_MESSAGES.MISMATCH_RECIPIENTS_AND_AMOUNTS);
    });

    it("Revert on zero amounts", async () => {
      await expect(
        setUpDelegatedBatchTransfer(
          getAccountAddresses(recipients),
          [0, ...amounts.slice(1)],
          [],
          {
            gasLimit: GAS_OVERPAY,
          }
        )
      ).to.be.revertedWith(ERROR_MESSAGES.ZERO_AMOUNT_TRANSFER);
    });

    it("Revert on zero address set as recipient", async () => {
      await expect(
        setUpDelegatedBatchTransfer(
          [ZERO_ADDRESS, ...getAccountAddresses(recipients).slice(1)],
          amounts,
          [],
          {
            gasLimit: GAS_OVERPAY,
          }
        )
      ).to.be.revertedWith(ERROR_MESSAGES.ZERO_ADDRESS_RECIPIENT);
    });

    it("Revert on too many token addresses", async () => {
      await expect(
        setUpDelegatedBatchTransfer(
          getAccountAddresses(recipients),
          amounts,
          Array.from(Array(recipients.length + 1)).map(() => ZERO_ADDRESS),
          {
            gasLimit: GAS_OVERPAY,
          }
        ),
      ).to.be.revertedWith(ERROR_MESSAGES.MISMATCH_TOKEN_ADDRESSES_LENGTH);
    });

    it("Revert on too few token addresses", async () => {
      await expect(
        setUpDelegatedBatchTransfer(
          getAccountAddresses(recipients),
          amounts,
          Array.from(Array(recipients.length - 1)).map(() => ZERO_ADDRESS),
          {
            gasLimit: GAS_OVERPAY,
          }
        )
      ).to.be.revertedWith(ERROR_MESSAGES.MISMATCH_TOKEN_ADDRESSES_LENGTH);
    });
  });

  describe("Recover", () => {
    describe("Recover ether", () => {
      describe("Success", () => {
        it("Recover ether balance", async () => {
          const sentAmount = amount * 0.5;

          delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
            [recipient.address],
            [amount],
            null,
            () => sentAmount,
          );

          await expect(
            () => delegatedBatchTransfer.batchRecover(treasury.address)
          ).to.changeEtherBalances(
            [delegatedBatchTransfer, treasury],
            [-sentAmount, sentAmount]
          );
        });

        it("Emit BatchRecovered event", async () => {
          const sentAmount = amount * 0.5;

          delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
            [recipient.address],
            [amount],
            null,
            () => sentAmount,
          );

          await expect(
            delegatedBatchTransfer.batchRecover(treasury.address)
          ).to.emit(delegatedBatchTransfer, EVENTS.BATCH_RECOVERED)
            .withArgs(treasury.address, [sentAmount], []);
        });
      });

      describe("Revert", () => {
        it("Revert on sufficient ether balance", async () => {
          delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
            [recipient.address],
            [amount],
            null,
          );

          await expect(
            delegatedBatchTransfer.batchRecover(treasury.address)
          ).to.be.reverted;
        });
      });
    });

    describe("Recover tokens", () => {
      before(async () => {
        // Deploy batch test ERC20 tokens and set the corresponding amount for initiator
        tokens = await setUpTokens(recipients, amounts, treasury);
        token = tokens[0];
      });

      describe("Success", () => {
        const fundingAmountReducer = amount => 0.5 * amount;
        const fundingAmountModifier = (amount, idx) => idx === 0 ? fundingAmountReducer(amount) : amount;

        it("Recover ERC20 token balance", async () => {
          const sentAmount = amount * 0.5;

          delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
            [recipient.address],
            [amount],
            [token.address],
            () => sentAmount,
          );

          await expect(
            () => delegatedBatchTransfer.batchRecover(treasury.address)
          ).to.changeTokenBalances(
            token,
            [delegatedBatchTransfer, treasury],
            [-sentAmount, sentAmount]
          );
        });

        it("Recover multiple token balances because of insufficient ether", async () => {
          delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
            getAccountAddresses(recipients),
            amounts,
            getAccountAddresses(tokens).map((address, idx) => idx === 0 ? ZERO_ADDRESS : address),
            fundingAmountModifier,
          );

          await expect(
            () => delegatedBatchTransfer.batchRecover(treasury.address)
          ).to.changeMultipleTokenBalances(
            tokens.map((token, idx) => {
              if (idx === 0) {
                const reducedAmount = fundingAmountReducer(amounts[idx]);
                return {
                  token: null,
                  accounts: [delegatedBatchTransfer, treasury],
                  changes: [-reducedAmount, reducedAmount]
                }
              }
              return {
                token,
                accounts: [
                  delegatedBatchTransfer,
                  ...filterMatchingItemsByTokenIndex(token, recipients, tokens).map(() => treasury)
                ],
                changes: [
                  -getAmountSum(filterMatchingItemsByTokenIndex(token, amounts.map(fundingAmountModifier), tokens)),
                  ...filterMatchingItemsByTokenIndex(token, amounts.map(fundingAmountModifier), tokens)
                ]
              };
            })
          );
        });

        it("Recover multiple token balances because of insufficient ERC20 token balance", async () => {
          delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
            getAccountAddresses(recipients),
            amounts,
            getAccountAddresses(tokens).map((address, idx) => idx === 1 ? ZERO_ADDRESS : address),
            fundingAmountModifier,
          );

          await expect(
            () => delegatedBatchTransfer.batchRecover(treasury.address)
          ).to.changeMultipleTokenBalances(
            tokens.map((token, idx) => {
              if (idx === 0) {
                const reducedAmount = fundingAmountReducer(amounts[idx]);
                return {
                  token,
                  accounts: [delegatedBatchTransfer, treasury],
                  changes: [-reducedAmount, reducedAmount]
                }
              }
              if (idx === 1) {
                return {
                  token: null,
                  accounts: [delegatedBatchTransfer, treasury],
                  changes: [-amounts[idx], amounts[idx]]
                }
              }
              return {
                token,
                accounts: [
                  delegatedBatchTransfer,
                  ...filterMatchingItemsByTokenIndex(token, recipients, tokens).map(() => treasury)
                ],
                changes: [
                  -getAmountSum(filterMatchingItemsByTokenIndex(token, amounts.map(fundingAmountModifier), tokens)),
                  ...filterMatchingItemsByTokenIndex(token, amounts.map(fundingAmountModifier), tokens)
                ]
              };
            })
          );
        });

        it("Recover multiple token balances with multiple recipients of same token", async () => {
          // Create multiple recipient token
          const multiRecipientTokenAmount = getAmountSum(amounts.slice(0, 2).map(fundingAmountModifier));
          // adjust tokens array to include multiple recipients of same token
          const localTokens = tokens.map((item, idx) => idx < 2 ? token : item);

          delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
            getAccountAddresses(recipients),
            amounts,
            getAccountAddresses(localTokens),
            fundingAmountModifier,
          );

          await expect(
            () => delegatedBatchTransfer.batchRecover(treasury.address)
          ).to.changeMultipleTokenBalances(
            localTokens.map((token, idx) => {
              if (idx === 0) {
                return {
                  token,
                  accounts: [delegatedBatchTransfer, treasury],
                  changes: [-multiRecipientTokenAmount, multiRecipientTokenAmount]
                }
              }
              if (idx < 2) {
                // Remove duplicate token checks
                return null;
              }
              return {
                token,
                accounts: [
                  delegatedBatchTransfer,
                  ...filterMatchingItemsByTokenIndex(token, recipients, tokens).map(() => treasury)
                ],
                changes: [
                  -getAmountSum(filterMatchingItemsByTokenIndex(token, amounts.map(fundingAmountModifier), tokens)),
                  ...filterMatchingItemsByTokenIndex(token, amounts.map(fundingAmountModifier), tokens)
                ]
              };
            }).filter(Boolean)
          );
        });

        it("Emit BatchRecovered event", async () => {
          const sentAmount = amount * 0.5;

          delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
            [recipient.address],
            [amount],
            [token.address],
            () => sentAmount,
          );

          await expect(
            delegatedBatchTransfer.batchRecover(treasury.address)
          ).to.emit(delegatedBatchTransfer, EVENTS.BATCH_RECOVERED)
            .withArgs(treasury.address, [sentAmount], [token.address]);
        });
      });

      describe("Revert", () => {
        it("Revert on sufficient ERC20 token balance", async () => {
          delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
            [recipient.address],
            [amount],
            [token.address],
          );

          await expect(
            delegatedBatchTransfer.batchRecover(treasury.address)
          ).to.be.reverted;
        });

        it("Revert on sufficient balances for all tokens", async () => {
          delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
            getAccountAddresses(recipients),
            amounts,
            getAccountAddresses(tokens).map((address, idx) => idx === 0 ? ZERO_ADDRESS : address),
          );

          await expect(
            delegatedBatchTransfer.batchRecover(treasury.address)
          ).to.be.reverted;
        });

        it("Revert recover call if caller is not the owner", async () => {
          const sentAmount = amount * 0.5;

          delegatedBatchTransfer = await setUpAndFundDelegatedBatchTransfer(
            [recipient.address],
            [amount],
            [token.address],
            () => sentAmount,
          );

          await expect(
            delegatedBatchTransfer.connect(relayer).batchRecover(treasury.address)
          ).to.be.reverted;
        });
      });
    });
  });
});
