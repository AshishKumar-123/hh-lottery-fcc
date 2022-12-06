const { assert, expect } = require('chai');
const { deployments, ethers, getNamedAccounts, network } = require('hardhat');
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name) 
    ? describe.skip
    : describe("Raffle", async function () {
        
        let raffle, vrfCoordinatorV2Mock, entranceFee, deployer, interval;
        const chainId = network.config.chainId;

        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer
            await deployments.fixture(["all"])
            raffle = await ethers.getContract("Raffle", deployer)
            vrfCoordinatorV2Mock = await ethers.getContract(
              "VRFCoordinatorV2Mock",
              deployer
            )
            entranceFee = await raffle.getEntranceFee();
            interval = await raffle.getInterval();
        });

        describe("constructor", async function () {
            it("Intializes the raffle correctly", async function () {
                const raffleState = await raffle.getRaffleState();
                const interval = await raffle.getInterval();
                const entranceFee = await raffle.getEntranceFee();

                assert(raffleState.toString(), "0");
                assert(interval.toString(), networkConfig[chainId]["interval"]);
                assert(entranceFee.toString(), networkConfig[chainId]["entranceFee"]);
            })
        });

        describe("enter raffle", async function () {
            it("revert when you dont pay enough", async function () {
                await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(raffle, "Raffle__NotEnoughETH");
            });

            it("allows enters the raffle when paid enough", async function () {
                await raffle.enterRaffle({ value: entranceFee });

                /* Now we will check if player has been added to the players array or not */
                const _player = await raffle.getPlayers(0);
                assert(_player, deployer)
            });

            it("emit events when player enters", async function () {
                await expect(raffle.enterRaffle({value:entranceFee})).to.emit(raffle, "RaffleEnter")
            });

            it("doesn't allow the player to enter when raffle is calculating", async function () {
                await raffle.enterRaffle({ value: entranceFee });
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                await network.provider.request({ method: "evm_mine", params: [] });

                await raffle.performUpkeep([]);
                await expect(raffle.enterRaffle({ value: entranceFee })).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen");
            })
        })

        describe("checkUpKeep", async function () {
            it("returns false if people has not sent enough ETH", async function () {
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                await network.provider.send("evm_mine", []);
                const {upKeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
                assert(!upKeepNeeded)
            });

            it("returs false if raffle is not open", async function () {
                await raffle.enterRaffle({value:entranceFee})
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.send("evm_mine", [])
                await raffle.performUpkeep([])
                const raffleState = await raffle.getRaffleState();
                const { upKeepNeeded } = await raffle.callStatic.checkUpkeep("0x")

                assert.equal(raffleState.toString() , "1")
                assert.equal(upKeepNeeded, false)
            })

            it("returns false if enough time has not passed", async function () {
                await raffle.enterRaffle({value:entranceFee})
                await network.provider.send("evm_increaseTime", [interval.toNumber() - 5])
                await network.provider.send("evm_mine", [])
                const { upKeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
                assert(!upKeepNeeded)
            })

            it("returns true if enough time has passed, has players, eth and is open", async function () {
                await raffle.enterRaffle({value:entranceFee})
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.send("evm_mine", [])
                const { upKeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
                assert(upKeepNeeded)
            })
        })

        describe("performUpKeep", async function () {
            it("it can only if checkUpkeep is true", async function () {
                await raffle.enterRaffle({value:entranceFee});
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                await network.provider.send("evm_mine", [])
                const tx = await raffle.performUpkeep("0x");
                assert(tx)
            });

            it("reverts if checkup is false", async function () {
                await expect(raffle.performUpkeep("0x")).to.be.revertedWithCustomError(raffle, "Raffle__UpKeepNotNeeded")
            });

            it("updates the raffle state and emits the requestId", async function () {
                await raffle.enterRaffle({value:entranceFee});
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                await network.provider.send("evm_mine", []);
                const txResponse = await raffle.performUpkeep("0x");
                const txReceit = txResponse.wait(1);
                const raffleState = await raffle.getRaffleState()
                const requestId = txReceit.events[1].args.requestId;
                assert(requestId.toNumber() > 0);
                assert(raffleState == 1)
            })
        })

    })