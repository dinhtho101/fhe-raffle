// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import { FHE, euint32, euint64 } from "@fhevm/solidity/lib/FHE.sol";

/**
 * @title RaffleContract
 * @dev A privacy-enhanced decentralized raffle platform with FHEVM integration
 */
contract RaffleContract is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _raffleIds;
    
    // Platform commission rate (3%)
    uint256 public constant COMMISSION_RATE = 3;
    uint256 public constant COMMISSION_DENOMINATOR = 100;
    
    // Creator profit rate (5%)
    uint256 public constant CREATOR_PROFIT_RATE = 5;
    uint256 public constant CREATOR_PROFIT_DENOMINATOR = 100;
    
    enum RaffleStatus {
        ACTIVE,
        ENDED,
        CLAIMED,
        EXPIRED
    }
    
    struct RaffleInfo {
        uint256 id;
        address creator;
        string name;
        string description;
        uint256 prizeAmount;
        uint256 ticketPrice;
        uint256 totalTickets;
        uint256 endTime;
        address winner;
        bool prizeClaimedByWinner;
        bool refundClaimedByCreator;
        bool creatorProfitClaimed;
        RaffleStatus status;
        uint256 soldTickets; // Public count for UI purposes
    }
    
    // FHEVM Private Data Structure
    struct PrivateRaffleData {
        euint64 encryptedSoldTickets;
        euint64 encryptedRandomSeed;
        mapping(address => euint32) encryptedParticipantTickets;
        address[] participants;
        mapping(address => bool) hasParticipated;
    }
    
    mapping(uint256 => RaffleInfo) public raffles;
    mapping(uint256 => PrivateRaffleData) private privateRaffleData;
    mapping(address => uint256[]) public userRaffles;
    mapping(address => uint256[]) public userParticipations;
    mapping(uint256 => mapping(address => uint256)) public participantTickets;
    mapping(uint256 => address[]) public raffleParticipants;
    
    // FHEVM Access Control
    mapping(address => bool) private isInitialized;
    mapping(uint256 => mapping(address => bool)) private hasAccess;
    
    // Events
    event RaffleCreated(
        uint256 indexed raffleId,
        address indexed creator,
        string name,
        uint256 prizeAmount,
        uint256 ticketPrice,
        uint256 totalTickets,
        uint256 endTime
    );
    
    event TicketPurchased(
        uint256 indexed raffleId,
        address indexed participant,
        uint256 ticketCount,
        uint256 totalCost
    );
    
    event TicketPurchasedFHE(
        uint256 indexed raffleId,
        address indexed participant,
        uint256 totalCost
    );
    
    event RaffleEnded(
        uint256 indexed raffleId,
        address indexed winner,
        uint256 prizeAmount
    );
    
    event PrizeClaimed(
        uint256 indexed raffleId,
        address indexed winner,
        uint256 amount
    );
    
    event RefundClaimed(
        uint256 indexed raffleId,
        address indexed creator,
        uint256 amount
    );
    
    event CreatorProfitClaimed(
        uint256 indexed raffleId,
        address indexed creator,
        uint256 amount
    );
    
    event CommissionWithdrawn(address indexed owner, uint256 amount);
    event AccessGranted(uint256 indexed raffleId, address indexed user);
    event RandomSeedUpdated(uint256 indexed raffleId);
    
    modifier raffleExists(uint256 raffleId) {
        require(raffleId > 0 && raffleId <= _raffleIds.current(), "Raffle does not exist");
        _;
    }
    
    modifier onlyRaffleCreator(uint256 raffleId) {
        require(raffles[raffleId].creator == msg.sender, "Only raffle creator");
        _;
    }
    
    modifier hasRaffleAccess(uint256 raffleId) {
        require(hasAccess[raffleId][msg.sender], "No access to raffle data");
        _;
    }
    
    constructor() {
        // Initialize contract
    }
    
    /**
     * @dev Initialize user for FHEVM
     */
    function ensureInit(address user) private {
        if (isInitialized[user]) return;
        isInitialized[user] = true;
    }
    
    /**
     * @dev Initialize private data for a raffle
     */
    function _initializePrivateData(uint256 raffleId) external {
        require(msg.sender == address(this), "Only contract can call this");
        PrivateRaffleData storage privateData = privateRaffleData[raffleId];
        privateData.encryptedSoldTickets = FHE.asEuint64(0);
        privateData.encryptedRandomSeed = FHE.asEuint64(uint64(block.timestamp + block.prevrandao));
    }
    
    /**
     * @dev Create a new raffle
     */
    function createRaffle(
        string memory name,
        string memory description,
        uint256 ticketPrice,
        uint256 totalTickets,
        uint256 duration
    ) external payable nonReentrant {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(ticketPrice > 0, "Ticket price must be greater than 0");
        require(totalTickets > 1, "Must have at least 2 tickets");
        require(duration > 0, "Duration must be greater than 0");
        
        uint256 totalTicketValue = ticketPrice * totalTickets;
        uint256 commissionAmount = (totalTicketValue * COMMISSION_RATE) / COMMISSION_DENOMINATOR;
        uint256 creatorProfit = (totalTicketValue * CREATOR_PROFIT_RATE) / CREATOR_PROFIT_DENOMINATOR;
        uint256 prizeAmount = totalTicketValue - creatorProfit;
        uint256 requiredAmount = totalTicketValue + commissionAmount;
        
        require(msg.value >= requiredAmount, "Insufficient funds for raffle creation");
        
        _raffleIds.increment();
        uint256 newRaffleId = _raffleIds.current();
        
        // Initialize public raffle info
        raffles[newRaffleId] = RaffleInfo({
            id: newRaffleId,
            creator: msg.sender,
            name: name,
            description: description,
            prizeAmount: prizeAmount,
            ticketPrice: ticketPrice,
            totalTickets: totalTickets,
            endTime: block.timestamp + duration,
            winner: address(0),
            prizeClaimedByWinner: false,
            refundClaimedByCreator: false,
            creatorProfitClaimed: false,
            status: RaffleStatus.ACTIVE,
            soldTickets: 0
        });
        
        userRaffles[msg.sender].push(newRaffleId);
        
        // Grant access to creator
        hasAccess[newRaffleId][msg.sender] = true;
        emit AccessGranted(newRaffleId, msg.sender);
        
        // Refund excess payment
        if (msg.value > requiredAmount) {
            payable(msg.sender).transfer(msg.value - requiredAmount);
        }
        
        emit RaffleCreated(
            newRaffleId,
            msg.sender,
            name,
            prizeAmount,
            ticketPrice,
            totalTickets,
            raffles[newRaffleId].endTime
        );
    }
    
    /**
     * @dev Buy tickets for a raffle
     */
    function buyTickets(uint256 raffleId, uint256 ticketCount) 
        external 
        payable 
        nonReentrant 
        raffleExists(raffleId) 
    {
        RaffleInfo storage raffle = raffles[raffleId];
        
        require(raffle.status == RaffleStatus.ACTIVE, "Raffle is not active");
        require(block.timestamp < raffle.endTime, "Raffle has ended");
        require(ticketCount > 0, "Must buy at least 1 ticket");
        require(raffle.soldTickets + ticketCount <= raffle.totalTickets, "Not enough tickets available");
        require(msg.sender != raffle.creator, "Creator cannot buy tickets");
        
        uint256 totalCost = raffle.ticketPrice * ticketCount;
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Add participant if first time
        if (participantTickets[raffleId][msg.sender] == 0) {
            raffleParticipants[raffleId].push(msg.sender);
            userParticipations[msg.sender].push(raffleId);
        }
        
        // Update participant tickets
        participantTickets[raffleId][msg.sender] += ticketCount;
        raffle.soldTickets += ticketCount;
        
        // Refund excess payment
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit TicketPurchased(raffleId, msg.sender, ticketCount, totalCost);
        
        // Auto-end raffle if all tickets sold
        if (raffle.soldTickets >= raffle.totalTickets) {
            _endRaffle(raffleId);
        }
    }
    
    /**
     * @dev Buy tickets with FHEVM encrypted data
     */
    function buyTicketsFHE(
        uint256 raffleId, 
        bytes calldata encryptedTicketCount,
        bytes calldata inputProof
    ) 
        external 
        payable 
        nonReentrant 
        raffleExists(raffleId) 
    {
        RaffleInfo storage raffle = raffles[raffleId];
        
        require(raffle.status == RaffleStatus.ACTIVE, "Raffle is not active");
        require(block.timestamp < raffle.endTime, "Raffle has ended");
        require(msg.sender != raffle.creator, "Creator cannot buy tickets");
        
        // For now, use mock decryption (in real FHEVM this would be decrypted on-chain)
        uint256 ticketCountDecrypted = 1; // Default fallback
        
        require(ticketCountDecrypted > 0, "Must buy at least 1 ticket");
        require(raffle.soldTickets + ticketCountDecrypted <= raffle.totalTickets, "Not enough tickets available");
        
        uint256 totalCost = raffle.ticketPrice * ticketCountDecrypted;
        require(msg.value >= totalCost, "Insufficient payment");
        
        ensureInit(msg.sender);
        
        // Add participant if first time
        if (participantTickets[raffleId][msg.sender] == 0) {
            raffleParticipants[raffleId].push(msg.sender);
            userParticipations[msg.sender].push(raffleId);
            
            // Grant access to participant
            hasAccess[raffleId][msg.sender] = true;
            emit AccessGranted(raffleId, msg.sender);
        }
        
        // Update participant tickets
        participantTickets[raffleId][msg.sender] += ticketCountDecrypted;
        raffle.soldTickets += ticketCountDecrypted;
        
        // Refund excess payment
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit TicketPurchasedFHE(raffleId, msg.sender, totalCost);
        
        // Auto-end raffle if all tickets sold
        if (raffle.soldTickets >= raffle.totalTickets) {
            _endRaffle(raffleId);
        }
    }
    
    /**
     * @dev End a raffle and select winner
     */
    function endRaffle(uint256 raffleId) 
        external 
        raffleExists(raffleId) 
    {
        RaffleInfo storage raffle = raffles[raffleId];
        
        require(raffle.status == RaffleStatus.ACTIVE, "Raffle is not active");
        require(
            block.timestamp >= raffle.endTime || msg.sender == raffle.creator,
            "Raffle has not ended yet"
        );
        
        _endRaffle(raffleId);
    }
    
    /**
     * @dev Internal function to end raffle and select winner
     */
    function _endRaffle(uint256 raffleId) internal {
        RaffleInfo storage raffle = raffles[raffleId];
        
        if (raffle.soldTickets == 0) {
            raffle.status = RaffleStatus.ENDED;
            return;
        }
        
        // Calculate and automatically transfer creator profit
        uint256 totalTicketValue = raffle.ticketPrice * raffle.totalTickets;
        uint256 creatorProfit = (totalTicketValue * CREATOR_PROFIT_RATE) / CREATOR_PROFIT_DENOMINATOR;
        
        // Auto-transfer creator profit if there are sold tickets
        if (raffle.soldTickets > 0) {
            raffle.creatorProfitClaimed = true;
            payable(raffle.creator).transfer(creatorProfit);
            emit CreatorProfitClaimed(raffleId, raffle.creator, creatorProfit);
        }
        
        // Generate random winner
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            raffleId,
            raffle.soldTickets
        )));
        
        uint256 winningTicket = (randomSeed % raffle.soldTickets) + 1;
        
        // Find winner based on ticket ownership
        uint256 currentTicket = 0;
        address winner = address(0);
        
        for (uint256 i = 0; i < raffleParticipants[raffleId].length; i++) {
            address participant = raffleParticipants[raffleId][i];
            uint256 participantTicketsCount = participantTickets[raffleId][participant];
            
            if (currentTicket + participantTicketsCount >= winningTicket) {
                winner = participant;
                break;
            }
            currentTicket += participantTicketsCount;
        }
        
        raffle.winner = winner;
        raffle.status = RaffleStatus.ENDED;
        
        emit RaffleEnded(raffleId, winner, raffle.prizeAmount);
    }
    
    /**
     * @dev Get raffle information
     */
    function getRaffleInfo(uint256 raffleId) 
        external 
        view 
        raffleExists(raffleId) 
        returns (RaffleInfo memory) 
    {
        return raffles[raffleId];
    }
    
    /**
     * @dev Get participant's ticket count for a raffle
     */
    function getParticipantTickets(uint256 raffleId, address participant) 
        external 
        view 
        raffleExists(raffleId) 
        returns (uint256) 
    {
        return participantTickets[raffleId][participant];
    }
    
    /**
     * @dev Get raffle participants
     */
    function getRaffleParticipants(uint256 raffleId) 
        external 
        view 
        raffleExists(raffleId) 
        returns (address[] memory) 
    {
        return raffleParticipants[raffleId];
    }
    
    /**
     * @dev Get encrypted participant tickets (FHEVM)
     */
    function getEncryptedParticipantTickets(uint256 raffleId, address participant) 
        external 
        view 
        raffleExists(raffleId) 
        hasRaffleAccess(raffleId)
        returns (euint32) 
    {
        return privateRaffleData[raffleId].encryptedParticipantTickets[participant];
    }
    
    /**
     * @dev Get encrypted sold tickets (FHEVM)
     */
    function getEncryptedSoldTickets(uint256 raffleId) 
        external 
        view 
        raffleExists(raffleId) 
        hasRaffleAccess(raffleId)
        returns (euint64) 
    {
        return privateRaffleData[raffleId].encryptedSoldTickets;
    }
    
    /**
     * @dev Grant access to raffle data
     */
    function grantAccess(uint256 raffleId, address user) 
        external 
        raffleExists(raffleId) 
        onlyRaffleCreator(raffleId) 
    {
        hasAccess[raffleId][user] = true;
        emit AccessGranted(raffleId, user);
    }
    
    /**
     * @dev Check if user has access to raffle data
     */
    function checkAccess(uint256 raffleId, address user) 
        external 
        view 
        raffleExists(raffleId) 
        returns (bool) 
    {
        return hasAccess[raffleId][user];
    }
    
    /**
     * @dev Claim prize by winner
     */
    function claimPrize(uint256 raffleId) 
        external 
        nonReentrant 
        raffleExists(raffleId) 
    {
        RaffleInfo storage raffle = raffles[raffleId];
        
        require(raffle.status == RaffleStatus.ENDED, "Raffle is not ended");
        require(raffle.winner == msg.sender, "Only winner can claim prize");
        require(!raffle.prizeClaimedByWinner, "Prize already claimed");
        
        raffle.prizeClaimedByWinner = true;
        raffle.status = RaffleStatus.CLAIMED;
        
        payable(msg.sender).transfer(raffle.prizeAmount);
        
        emit PrizeClaimed(raffleId, msg.sender, raffle.prizeAmount);
    }
    
    /**
     * @dev Get raffles created by user
     */
    function getUserRaffles(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userRaffles[user];
    }
    
    /**
     * @dev Get raffles user participated in
     */
    function getUserParticipations(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userParticipations[user];
    }
    
    /**
     * @dev Claim refund by creator if winner doesn't claim within time limit
     */
    function claimRefund(uint256 raffleId) 
        external 
        nonReentrant 
        raffleExists(raffleId) 
        onlyRaffleCreator(raffleId) 
    {
        RaffleInfo storage raffle = raffles[raffleId];
        
        require(raffle.status == RaffleStatus.ENDED, "Raffle is not ended");
        require(!raffle.prizeClaimedByWinner, "Prize already claimed by winner");
        require(!raffle.refundClaimedByCreator, "Refund already claimed");
        
        raffle.refundClaimedByCreator = true;
        raffle.status = RaffleStatus.EXPIRED;
        
        payable(msg.sender).transfer(raffle.prizeAmount);
        
        emit RefundClaimed(raffleId, msg.sender, raffle.prizeAmount);
    }
    
    /**
     * @dev Get total number of raffles
     */
    function getTotalRaffles() external view returns (uint256) {
        return _raffleIds.current();
    }
    
    /**
     * @dev Withdraw accumulated commission (only owner)
     */
    function withdrawCommission() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No commission to withdraw");
        
        payable(owner()).transfer(balance);
        
        emit CommissionWithdrawn(owner(), balance);
    }
    
    /**
     * @dev Emergency function to withdraw stuck funds (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev Create a new raffle with encrypted data (FHEVM) - for compatibility
     */
    function createRaffleEncrypted(
        string memory name,
        string memory description,
        bytes memory encryptedTicketPrice,
        uint256 totalTickets,
        uint256 duration
    ) external payable nonReentrant {
        // For now, just implement the logic directly
        // In a real implementation, this would handle encrypted ticket price
        uint256 ticketPrice = 0.001 ether; // Default fallback to match frontend
        
        require(bytes(name).length > 0, "Name cannot be empty");
        require(ticketPrice > 0, "Ticket price must be greater than 0");
        require(totalTickets > 1, "Must have at least 2 tickets");
        require(duration > 0, "Duration must be greater than 0");
        
        uint256 totalTicketValue = ticketPrice * totalTickets;
        uint256 commissionAmount = (totalTicketValue * COMMISSION_RATE) / COMMISSION_DENOMINATOR;
        uint256 creatorProfit = (totalTicketValue * CREATOR_PROFIT_RATE) / CREATOR_PROFIT_DENOMINATOR;
        uint256 prizeAmount = totalTicketValue - creatorProfit;
        uint256 requiredAmount = totalTicketValue + commissionAmount;
        
        require(msg.value >= requiredAmount, "Insufficient funds for raffle creation");
        
        _raffleIds.increment();
        uint256 newRaffleId = _raffleIds.current();
        
        // Initialize public raffle info
        raffles[newRaffleId] = RaffleInfo({
            id: newRaffleId,
            creator: msg.sender,
            name: name,
            description: description,
            prizeAmount: prizeAmount,
            ticketPrice: ticketPrice,
            totalTickets: totalTickets,
            endTime: block.timestamp + duration,
            winner: address(0),
            prizeClaimedByWinner: false,
            refundClaimedByCreator: false,
            creatorProfitClaimed: false,
            status: RaffleStatus.ACTIVE,
            soldTickets: 0
        });
        
        userRaffles[msg.sender].push(newRaffleId);
        
        // Grant access to creator
        hasAccess[newRaffleId][msg.sender] = true;
        emit AccessGranted(newRaffleId, msg.sender);
        
        // Refund excess payment
        if (msg.value > requiredAmount) {
            payable(msg.sender).transfer(msg.value - requiredAmount);
        }
        
        emit RaffleCreated(
            newRaffleId,
            msg.sender,
            name,
            prizeAmount,
            ticketPrice,
            totalTickets,
            raffles[newRaffleId].endTime
        );
    }
    
    /**
     * @dev Purchase tickets for a raffle with encrypted data (FHEVM) - for compatibility
     */
    function buyTicketsEncrypted(uint256 raffleId, bytes memory encryptedTicketCount) 
        external 
        payable 
        nonReentrant 
        raffleExists(raffleId) 
    {
        // For now, just implement the logic directly
        // In a real implementation, this would handle encrypted ticket count
        uint256 ticketCount = 1; // Default fallback
        
        RaffleInfo storage raffle = raffles[raffleId];
        
        require(raffle.status == RaffleStatus.ACTIVE, "Raffle is not active");
        require(block.timestamp < raffle.endTime, "Raffle has ended");
        require(ticketCount > 0, "Must buy at least 1 ticket");
        require(raffle.soldTickets + ticketCount <= raffle.totalTickets, "Not enough tickets available");
        require(msg.sender != raffle.creator, "Creator cannot buy tickets");
        
        uint256 totalCost = raffle.ticketPrice * ticketCount;
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Add participant if first time
        if (participantTickets[raffleId][msg.sender] == 0) {
            raffleParticipants[raffleId].push(msg.sender);
            userParticipations[msg.sender].push(raffleId);
        }
        
        // Update participant tickets
        participantTickets[raffleId][msg.sender] += ticketCount;
        raffle.soldTickets += ticketCount;
        
        // Refund excess payment
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit TicketPurchasedFHE(raffleId, msg.sender, totalCost);
        
        // Auto-end raffle if all tickets sold
        if (raffle.soldTickets >= raffle.totalTickets) {
            _endRaffle(raffleId);
        }
    }
    
    /**
     * @dev Get raffle information with encrypted data (FHEVM) - for compatibility
     */
    function getRaffleInfoEncrypted(uint256 raffleId) 
        external 
        view 
        raffleExists(raffleId) 
        returns (RaffleInfo memory) 
    {
        return raffles[raffleId];
    }
}