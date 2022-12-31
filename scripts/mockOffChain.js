const {ethers, network} = require("hardhat")

async function mockKeepers() {
    const raffle = await ethers.getContract("Raffle")
    const checkData = await ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""))
    const { upKeepNeeded } = await raffle.callStatic.checkUpkeep(checkData)
    if (upKeepNeeded) {
        const tx = await raffle.performUpkeep(checkData)
        const txReciet = await tx.wait(1)
        const requestId = txReciet.events[1].args.requestId
        console.log(`Performed upKeep with RequestId: ${requestId}`)
        if (network.config.chainId == 31337) {
            await mockVrf(requestId, raffle) 
        }
    } else {
        console.log("No upkeepd needed !!")
    }
}

async function mockVrf(requestId, raffle) {
    console.log("We are on local network. So let's pretend...")
    const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
    await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.address)
    console.log("Responded!!")
    const recentWinner = await raffle.getRecentWinner()
    console.log(`The winner is: ${recentWinner}`)
}

mockKeepers()
            .then(() => process.exit(0))
            .catch((error) => {
                console.log(error)
                process.exit(1)
            })