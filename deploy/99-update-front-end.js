// Script to automatically create constants file for frontend interactions when uploaded to different chains such as abi, contract address etc
require("dotenv").config()
const {ethers, network} = require("hardhat")
const fs = require("fs")

const FRONTEND_ADDRESS_FILE = "../nextjs-smartcontract-lottery-fcc/constants/contractAddress.json"
const FRONTEND_ABI_FILE = "../nextjs-smartcontract-lottery-fcc/constants/abi.json"

module.exports = async function () {
    if (process.env.UPDATE_FRONTEND) {
        console.log("Updating front end...")
        await updateContractAddress()
        console.log("writing abi")
        await updateAbi()
        console.log("update finish")
    }
}

async function updateAbi() {
    const raffle = await ethers.getContract("Raffle")
    fs.writeFileSync(FRONTEND_ABI_FILE, raffle.interface.format(ethers.utils.FormatTypes.json))
}

async function updateContractAddress() {
    const raffle = await ethers.getContract("Raffle")
    const chainId = network.config.chainId.toString()
    const currentAddress = JSON.parse(fs.readFileSync(FRONTEND_ADDRESS_FILE, "utf8"))
    if (chainId in currentAddress) {
        if (!currentAddress[chainId].includes(raffle.address)) {
            currentAddress[chainId].push(raffle.address)
        } 
    } else {
        currentAddress[chainId] = [raffle.address]
    }
    fs.writeFileSync(FRONTEND_ADDRESS_FILE, JSON.stringify(currentAddress))
}

module.exports.tags = ['all', 'frontend']