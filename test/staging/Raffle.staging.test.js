const { expect, assert } = require("chai");
const {getNamedAccounts, deployments, ethers, network} = require("hardhat")
const {developmentChains, networkConfig} = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip()
    : describe("Raffle", async function () {
        
        let raffle, entranceFee, deployer;

        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer
            raffle = await ethers.getContract("Raffle", deployer)
            entranceFee = await raffle.getEntranceFee()
        })

        describe("fulfillRandomWords", async function () {
            it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                //enter the raffle
                const startingTimeStamp = await raffle.getLatestTimeStamp()
                const accounts = await ethers.getSigners()

                //setup the listner before we enter the raffle 
                await new Promise(async (resolve, reject) => {
                    raffle.once("RaffleWinnerPicked", async function () {
                        console.log("Winner Picked")
                        try {
                            const recentWinner = await raffle.getRecentWinner()
                            const raffleState = await raffle.getRaffleState()
                            const winnerEndingBalance = await accounts[0].getBalance()
                            const endingTimeStamp = await raffle.getLatestTimeStamp()

                            await expect(raffle.getPlayer(0)).to.be.reverted
                            assert.equal(recentWinner.toString(), accounts[0].address)
                            assert.equal(raffleState.toString(), "0")
                            assert.equal(winnerEndingBalance.toString(), winnerStartingBalance.add(entranceFee).toString())
                        } catch (e) {
                            console.log(e)
                            reject(e)
                        }
                    })
                    
                    //Then entering the raffle 
                    await raffle.enterRaffle({value: entranceFee})
                    const winnerStartingBalance = await accounts[0].getBalance()

                    //This code will not complete unitl our listner has finished listening !!

                })
            })
        })
    })