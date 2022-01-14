const {expect, use} = require("chai"),
  {waffle} = require("hardhat"),
  {deployContract} = require("../utils/deploy"),
  {ZERO_ADDRESS, CONTRACTS, EVENTS} = require("../utils/constants"),
  waffleChaiMultiTokenPlugin = require("../utils/waffle-chai-multi-token"),
  {getAccountAddresses, getAmountSum, filterMatchingItemsByTokenIndex, setUpTokens, approveTokens,
    generateRecipients, generateAmounts} = require("../utils/tests");

use(waffleChaiMultiTokenPlugin);

describe("GrinderyBatchTransfer", () => {
  let payer, recipient, amount, recipients, amounts,
    batchTransfer, tokens, token;

  before(async () => {
    // Test wallets
    const [wallet1, ...otherWallets] = waffle.provider.getWallets();

    payer = wallet1; // payer for transfers

    recipients = generateRecipients(otherWallets); // generate recipient accounts
    amounts = generateAmounts(); // generate a list of amounts that match the recipients list

    // First recipient and amount for convenience
    recipient = recipients[0];
    amount = amounts[0];

    // Deploy batch transfer contract
    batchTransfer = await deployContract(CONTRACTS.GRINDERY_BATCH_TRANSFER);
  });

  describe("batchTransfer", () => {
    describe("Ether transfers", () => {
      describe("Success", () => {
        it("Transfer ether to 1 recipient", async () => {
          await expect(
            () => batchTransfer.batchTransfer(
              [recipient.address],
              [amount],
              [], {
                value: amount,
              })
          ).to.changeEtherBalances(
            [payer, recipient],
            [-amount, amount]
          );
        });

        it("Transfer ether to multiple recipients", async () => {
          await expect(
            () => batchTransfer.batchTransfer(
              getAccountAddresses(recipients),
              amounts,
              [], {
                value: getAmountSum(amounts),
              })
          ).to.changeEtherBalances(
            [payer, ...recipients],
            [-getAmountSum(amounts), ...amounts]
          );
        });

        it("Emit BatchTransfer event", async () => {
          await expect(
            batchTransfer.batchTransfer(
              getAccountAddresses(recipients),
              amounts,
              [], {
                value: getAmountSum(amounts),
              })
          ).to.emit(batchTransfer, 'BatchTransfer')
            .withArgs(payer.address, getAccountAddresses(recipients), amounts, []);
        });
      });

      describe("Revert", () => {
        it("Revert on insufficient ether sent", async () => {
          await expect(
            batchTransfer.batchTransfer(
              getAccountAddresses(recipients),
              amounts,
              [], {
                value: getAmountSum(amounts) - 1,
              })
          ).to.be.reverted;
        });

        it("Revert on too much ether sent", async () => {
          await expect(
            batchTransfer.batchTransfer(
              getAccountAddresses(recipients),
              amounts,
              [], {
                value: getAmountSum(amounts) + 1,
              })
          ).to.be.reverted;
        });

        it("Revert on direct ether transfer", async () => {
          await expect(
            payer.sendTransaction({
              to: batchTransfer.address,
              value: amount,
            })
          ).to.be.reverted;
        });
      });
    });

    describe("Token transfers", () => {
      before(async () => {
        // Deploy test ERC20 tokens and set balance for payer
        tokens = await setUpTokens(recipients, amounts, payer);
        token = tokens[0];
      });

      beforeEach(async () => {
        // Set allowances for batchTransfer contract for each task
        await approveTokens(batchTransfer.address, tokens, amounts);
      });

      describe("Success", () => {
        it("Transfer ERC20 token to 1 recipient", async () => {
          await expect(
            () => batchTransfer.batchTransfer(
              [recipient.address],
              [amount],
              [token.address])
          ).to.changeTokenBalances(
            token,
            [payer, recipient],
            [-amount, amount]
          );
        });

        it("Transfer ERC20 tokens to multiple recipients", async () => {
          await expect(
            () => batchTransfer.batchTransfer(
              getAccountAddresses(recipients),
              amounts,
              getAccountAddresses(tokens)
            )
          ).to.changeMultipleTokenBalances(
            tokens.map((token) => ({
              token: token,
              accounts: [payer, ...filterMatchingItemsByTokenIndex(token, recipients, tokens)],
              changes: [
                -getAmountSum(filterMatchingItemsByTokenIndex(token, amounts, tokens)),
                ...filterMatchingItemsByTokenIndex(token, amounts, tokens)
              ]
            }))
          );
        });

        it("Transfer ether and ERC20 tokens to multiple recipients", async () => {
          await expect(
            () => batchTransfer.batchTransfer(
              getAccountAddresses(recipients),
              amounts,
              [ZERO_ADDRESS, ...getAccountAddresses(tokens).slice(1)], {
                value: amounts[0],
              })
          ).to.changeMultipleTokenBalances(
            tokens.map((token, idx) => {
              if (idx === 0) {
                return {
                  token: null,
                  accounts: [payer, recipients[0]],
                  changes: [-amounts[0], amounts[0]]
                }
              }
              return {
                token,
                accounts: [payer, ...filterMatchingItemsByTokenIndex(token, recipients, tokens)],
                changes: [
                  -getAmountSum(filterMatchingItemsByTokenIndex(token, amounts, tokens)),
                  ...filterMatchingItemsByTokenIndex(token, amounts, tokens)
                ]
              };
            })
          );
        });

        it("Emit BatchTransfer event", async () => {
          await expect(
            batchTransfer.batchTransfer(
              getAccountAddresses(recipients),
              amounts,
              getAccountAddresses(tokens)
            )
          ).to.emit(batchTransfer, EVENTS.BATCH_TRANSFER)
            .withArgs(
              payer.address,
              getAccountAddresses(recipients),
              amounts,
              getAccountAddresses(tokens)
            );
        });
      });

      describe("Revert", () => {
        it("Revert on insufficient pre-approved tokens", async () => {
          await expect(
            batchTransfer.batchTransfer(
              getAccountAddresses(recipients),
              amounts.map((amount, idx) => amount * (idx === 0?1:100)),
              getAccountAddresses(tokens)
            )
          ).to.be.reverted;
        });

        it("Revert on unnecessary ether sent", async () => {
          await expect(
            batchTransfer.batchTransfer(
              getAccountAddresses(recipients),
              amounts,
              getAccountAddresses(tokens), {
                value: amount,
              })
          ).to.be.reverted;
        });
      });
    });

    describe("Revert on bad arguments", () => {
      it("Revert on no arguments", async () => {
        await expect(
          batchTransfer.batchTransfer(
            [],
            [],
            [], {
              value: amount,
            })
        ).to.be.reverted;
      });

      it("Revert on less recipients than amounts", async () => {
        await expect(
          batchTransfer.batchTransfer(
            getAccountAddresses(recipients).slice(1),
            amounts,
            [], {
              value: getAmountSum(amounts)
            })
        ).to.be.reverted;
      });

      it("Revert on more recipients than amounts", async () => {
        await expect(
          batchTransfer.batchTransfer(
            getAccountAddresses(recipients),
            amounts.slice(1),
            [], {
              value: getAmountSum(amounts.slice(1))
            })
        ).to.be.reverted;
      });

      it("Revert on more recipients than amounts", async () => {
        await expect(
          batchTransfer.batchTransfer(
            getAccountAddresses(recipients),
            amounts.slice(1),
            [], {
              value: getAmountSum(amounts.slice(1))
            })
        ).to.be.reverted;
      });

      it("Revert on zero amounts", async () => {
        await expect(
          batchTransfer.batchTransfer(
            getAccountAddresses(recipients),
            [0, ...amounts.slice(1)],
            [], {
              value: getAmountSum(amounts)
            })
        ).to.be.reverted;
      });

      it("Revert on zero address set as recipient", async () => {
        await expect(
          batchTransfer.batchTransfer(
            [ZERO_ADDRESS, getAccountAddresses(recipients).slice(1)],
            amounts,
            [], {
              value: getAmountSum(amounts)
            })
        ).to.be.reverted;
      });

      it("Revert on too many token addresses", async () => {
        await expect(
          batchTransfer.batchTransfer(
            getAccountAddresses(recipients),
            amounts,
            [...Array(amounts.length + 1).keys()].map(() => ZERO_ADDRESS), {
              value: getAmountSum(amounts)
            })
        ).to.be.reverted;
      });

      it("Revert on too few token addresses", async () => {
        await expect(
          batchTransfer.batchTransfer(
            getAccountAddresses(recipients),
            amounts,
            [...Array(amounts.length - 1).keys()].map(() => ZERO_ADDRESS), {
              value: getAmountSum(amounts)
            })
        ).to.be.reverted;
      });
    });

    describe("Recover", () => {
      before(async () => {
        // Deploy test ERC20 tokens and set balance for payer
        tokens = await setUpTokens([recipient], [amount], payer);
        token = tokens[0];
      });

      describe("Success", () => {
        it("Recover ERC20 token balance", async () => {
          await expect(
            () => token.transfer(batchTransfer.address, amount)
          ).to.changeTokenBalances(
            token,
            [payer, batchTransfer],
            [-amount, amount]
          );

          await expect(
            () => batchTransfer.recover(payer.address, token.address)
          ).to.changeTokenBalances(
            token,
            [batchTransfer, payer],
            [-amount, amount]
          );
        });
      });

      describe("Revert", () => {
        it("Revert recover call if caller is not the owner", async () => {
          await expect(
            () => token.transfer(batchTransfer.address, amount)
          ).to.changeTokenBalances(
            token,
            [payer, batchTransfer],
            [-amount, amount]
          );

          await expect(
            batchTransfer.connect(recipient).recover(payer.address, token.address)
          ).to.be.reverted;
        });
      });
    });
  });
});
