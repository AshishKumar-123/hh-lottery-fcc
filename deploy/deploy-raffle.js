const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const { network, ethers } = require("hardhat");
const { verify } = require("../utils/verify")
require('dotenv').config()

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("30");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    
    let vrfCoordinatorV2Address;
    let subscriptionId;

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionRecipt = await transactionResponse.wait(1);

        subscriptionId = transactionRecipt.events[0].args.subId;
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    /* Args for deployment */
    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gasLane = networkConfig[chainId]["gasLane"]
    const callBackGasLimit = networkConfig[chainId]["callBackGasLimit"]
    const interval = networkConfig[chainId]["interval"]
    
    const args = [entranceFee, vrfCoordinatorV2Address, gasLane, subscriptionId, callBackGasLimit, interval]

    /* Deploying the contract */
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1
      })

    log("-------------------------------------------------------- \n")
    log(`Raffle deployed at : ${raffle.address} \n`)
    log("-------------------------------------------------------- \n")
    
    if (developmentChains.includes(network.name)) {
      const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
      await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
    }

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying....")
        await verify(raffle.address, args)
        log("\n-------------------------------------------------------")
    }

    
}

module.exports.tags = ["all", "raffle"]
