const { assert, expect } = require('chai');
const { deployments, ethers, getNamedAccounts, network } = require('hardhat');
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name) 
    ? describe.skip
    : describe("Raffle", async function () {

        let Raffle
        let entranceFee
        let player


        beforeEach(async function () {
            player = (await getNamedAccounts()).deployer;
            await deployments.fixture(["raffle"])
            Raffle = await ethers.getContract("Raffle", player)
            entranceFee = await Raffle.getEntranceFee()
        })

        describe("enterRaffle", async function () {
            it("reverts the entrance if paid fee is less than entrance fee", async function () {
                await expect(Raffle.enterRaffle()).to.be.revertedWithCustomError(Raffle, "Raffle__NotEnoughETH")
            })

            it("adds the player to list", async function () {
                await Raffle.enterRaffle({ value: entranceFee })
                const response = await Raffle.getPlayers(0);
                assert.equal(player, response)
            })
        })
    })