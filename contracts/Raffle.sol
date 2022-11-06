//SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import '@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol';
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

/* Cusom Errors */
error Raffle__NotEnoughETH();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpKeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/**
 * @title Sample Raffle Contract
 * @author Ashish Kumar
 * @dev This implements the VRF v2 and Chainlink keeper.
 * @notice This contract is to create an untamperable lottery system.
 */

contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
    /* Type Declarations */
    enum Raffle__State {
        OPEN,
        CALCULATING
    }

    /* State Variables */
    uint256 private immutable entranceFee;
    address payable [] private players;
    VRFCoordinatorV2Interface private immutable vrfCoordinator;
    bytes32 private immutable gasLane;
    uint64 private immutable subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;

    /* Lottery Variables */
    address private recentWinner;
    Raffle__State private raffleState;
    uint256 private lastTimestamp;
    uint256 private immutable interval;

    /* Events */
    event RaffleEnter(address indexed player);
    event RaffleRequestedWinner(uint256 indexed requestId);
    event RaffleWinnerPicked(address indexed winner);

    /* Constructor */
    constructor(
        uint256 fee, 
        address vrfCoordinatorV2, 
        bytes32 _gasLane,
        uint64 _subscriptionId,
        uint32 _callbackGasLimit,
        uint256 _interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        entranceFee = fee;
        vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        gasLane = _gasLane;
        subscriptionId = _subscriptionId;
        callbackGasLimit = _callbackGasLimit;
        raffleState = Raffle__State.OPEN;
        lastTimestamp = block.timestamp;
        interval = _interval;
    }

    function enterRaffle() payable public {
        if (msg.value < entranceFee) {
            revert Raffle__NotEnoughETH();
        }
        if (raffleState != Raffle__State.OPEN) {
            revert Raffle__NotOpen();
        }

        players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev This is the function chainlink keeper nodes call
     * the look the `upKeepNeeded to return true
     * Following should be true in order to return true:
     * 1. Our time interval should have passed
     * 2. The lottery should have at least one player, and have some ETH.
     * 3. Our subscription is funded with link.
     * 4. Lottery should be in "open" state.
     */
    function checkUpkeep(bytes memory /* checkData */) public view override returns(bool upKeepNeeded, bytes memory /*performData*/) {
        bool isOpen = (raffleState == Raffle__State.OPEN);
        bool timePassed = ((block.timestamp - lastTimestamp) > interval);
        bool hasPlayers = (players.length > 0);
        bool hasBalance = address(this).balance > 0;
        
        upKeepNeeded = (isOpen && hasPlayers && timePassed && hasBalance);
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upKeepNeeded, ) = checkUpkeep("");
        if (!upKeepNeeded) {
            revert Raffle__UpKeepNotNeeded(address(this).balance, players.length, uint256(raffleState));
        }

        raffleState = Raffle__State.CALCULATING; /* As we request the random winner lottery state is set to "CALCULATING" so that no new player can enter the raffle */
        uint256 requestId = vrfCoordinator.requestRandomWords(
            gasLane,
            subscriptionId,
            REQUEST_CONFIRMATIONS,
            callbackGasLimit,
            NUM_WORDS
        );
        emit RaffleRequestedWinner(requestId);
    }

    function fulfillRandomWords(uint256 /*requestId*/, uint256[] memory randomWords) internal override {
        uint256 indexOfWinner = randomWords[0] % players.length;
        address payable _recentWinner = players[indexOfWinner];
        recentWinner = _recentWinner;
        players = new address payable[](0);
        lastTimestamp = block.timestamp;
        raffleState = Raffle__State.OPEN; /* After winner is picked up the lottery will be "OPEN" again for participation of the players */
        (bool success, ) = recentWinner.call{value: address(this).balance}(""); 
        
        if (!success) {
            revert Raffle__TransferFailed();
        }
        emit RaffleWinnerPicked(recentWinner);
    }

    /* View and Pure functions */

    function getEntranceFee() public view returns(uint256) {
        return entranceFee;
    }

    function getPlayers(uint256 index) public view returns(address) {
        return players[index];
    }

    function getRentWinner() public view returns(address) {
        return recentWinner;
    }

    function getRaffleState() public view returns(Raffle__State) {
        return raffleState;
    }

    function getNumWords() public pure returns(uint256) {
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns(uint256) {
        return players.length;
    }

    function getLatesTimestamp() public view returns(uint256) {
        return lastTimestamp;
    }

    function getRequestConfirmations() public pure returns(uint256) {
        return REQUEST_CONFIRMATIONS;
    }
}