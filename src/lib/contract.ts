import { ethers } from 'ethers';
import { RaffleInfo, CreateRaffleParams, BuyTicketsParams, RaffleStatus } from '../types';
import { fhevmProvider } from './fhevm';

// Contract ABI (simplified for main functions)
export const RAFFLE_CONTRACT_ABI = [
  // Regular Functions
  "function createRaffle(string memory name, string memory description, uint256 ticketPrice, uint256 totalTickets, uint256 duration) external payable",
  "function buyTickets(uint256 raffleId, uint256 ticketCount) external payable",
  "function endRaffle(uint256 raffleId) external",
  "function claimPrize(uint256 raffleId) external",
  "function claimRefund(uint256 raffleId) external",
  "function getRaffleInfo(uint256 raffleId) external view returns (tuple(uint256 id, address creator, string name, string description, uint256 prizeAmount, uint256 ticketPrice, uint256 totalTickets, uint256 endTime, address winner, bool prizeClaimedByWinner, bool refundClaimedByCreator, bool creatorProfitClaimed, uint8 status, uint256 soldTickets))",
  "function getParticipantTickets(uint256 raffleId, address participant) external view returns (uint256)",
  "function getRaffleParticipants(uint256 raffleId) external view returns (address[])",
  "function getUserRaffles(address user) external view returns (uint256[])",
  "function getUserParticipations(address user) external view returns (uint256[])",
  "function getTotalRaffles() external view returns (uint256)",
  "function withdrawCommission() external",
  "function emergencyWithdraw() external",
  // FHEVM Functions
  "function buyTicketsFHE(uint256 raffleId, bytes calldata encryptedTicketCount, bytes calldata inputProof) external payable",
  "function createRaffleEncrypted(string memory name, string memory description, bytes memory encryptedTicketPrice, uint256 totalTickets, uint256 duration) external payable",
  "function buyTicketsEncrypted(uint256 raffleId, bytes memory encryptedTicketCount) external payable",
  "function getRaffleInfoEncrypted(uint256 raffleId) external view returns (tuple(uint256 id, address creator, string name, string description, uint256 prizeAmount, uint256 ticketPrice, uint256 totalTickets, uint256 endTime, address winner, bool prizeClaimedByWinner, bool refundClaimedByCreator, bool creatorProfitClaimed, uint8 status, uint256 soldTickets))",
  "function getEncryptedParticipantTickets(uint256 raffleId, address participant) external view returns (bytes32)",
  "function getEncryptedSoldTickets(uint256 raffleId) external view returns (bytes32)",
  "function grantAccess(uint256 raffleId, address user) external",
  "function checkAccess(uint256 raffleId, address user) external view returns (bool)",
  // Events
  "event RaffleCreated(uint256 indexed raffleId, address indexed creator, string name, uint256 prizeAmount, uint256 ticketPrice, uint256 totalTickets, uint256 endTime)",
  "event TicketPurchased(uint256 indexed raffleId, address indexed participant, uint256 ticketCount, uint256 totalCost)",
  "event TicketPurchasedFHE(uint256 indexed raffleId, address indexed participant, uint256 totalCost)",
  "event RaffleEnded(uint256 indexed raffleId, address indexed winner, uint256 prizeAmount)",
  "event PrizeClaimed(uint256 indexed raffleId, address indexed winner, uint256 amount)",
  "event RefundClaimed(uint256 indexed raffleId, address indexed creator, uint256 amount)",
  "event CreatorProfitClaimed(uint256 indexed raffleId, address indexed creator, uint256 amount)",
  "event CommissionWithdrawn(address indexed owner, uint256 amount)",
  "event AccessGranted(uint256 indexed raffleId, address indexed user)",
  "event RandomSeedUpdated(uint256 indexed raffleId)"
];

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x2fDc9bb3a72e7D464F22dDc590Ff7f9a7841015f';

// Force reload contract address to avoid cache issues
console.log('🔗 Contract Address:', CONTRACT_ADDRESS);
console.log('🌐 Environment:', process.env.NODE_ENV);

// Check if contract is properly configured
export const isContractConfigured = () => {
  return CONTRACT_ADDRESS && CONTRACT_ADDRESS.trim() !== '' && CONTRACT_ADDRESS !== 'your_contract_address_here';
};
export const NETWORK_ID = process.env.NEXT_PUBLIC_NETWORK_ID || '11155111';

export class RaffleContract {
  private contract: ethers.Contract | null = null;
  private signer: ethers.Signer;
  private lastProvider: ethers.Provider | null = null;

  constructor(signer: ethers.Signer) {
    this.signer = signer;
    // Don't create contract here - create fresh on each call
  }

  private ensureContract(): ethers.Contract {
    if (!isContractConfigured()) {
      throw new Error('Smart contract is not configured. Please deploy the RaffleContract.sol and set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env.local file.');
    }
    
    // CRITICAL FIX: Always create a fresh contract instance to avoid cached provider
    // This ensures we get fresh data from blockchain on every call
    const normalizedAddress = ethers.getAddress(CONTRACT_ADDRESS);
    const freshContract = new ethers.Contract(normalizedAddress, RAFFLE_CONTRACT_ABI, this.signer);
    
    console.log(`🔄 Created fresh contract instance at ${Date.now()}`);
    
    return freshContract;
  }

  /**
   * Create a new raffle (with FHEVM support)
   */
  async createRaffle(params: CreateRaffleParams): Promise<ethers.ContractTransactionResponse> {
    const contract = this.ensureContract();
    const { name, description, ticketPrice, totalTickets, duration } = params;
    
    console.log('CreateRaffle params:', { name, description, ticketPrice, totalTickets, duration });
    
    // Always use FHEVM for privacy
    console.log('Using FHEVM for raffle creation');
    return await this.createRaffleWithFHEVM(params);
  }

  /**
   * Create raffle with FHEVM encryption
   */
  private async createRaffleWithFHEVM(params: CreateRaffleParams): Promise<ethers.ContractTransactionResponse> {
    const contract = this.ensureContract();
    const { name, description, ticketPrice, totalTickets, duration } = params;
    
    const durationSeconds = duration * 3600; // Convert hours to seconds
    const ticketPriceNum = parseFloat(ticketPrice);
    const ticketPriceWei = ethers.parseEther(ticketPrice);
    const totalTicketValue = ticketPriceWei * BigInt(totalTickets);
    const commissionAmount = totalTicketValue * BigInt(3) / BigInt(100);
    const totalCost = totalTicketValue + commissionAmount;
    
    console.log('FHEVM calculated values:', {
      ticketPriceNum,
      ticketPriceWei: ticketPriceWei.toString(),
      totalTicketValue: totalTicketValue.toString(),
      commissionAmount: commissionAmount.toString(),
      totalCost: totalCost.toString(),
      totalCostETH: ethers.formatEther(totalCost),
      ticketPriceETH: ethers.formatEther(ticketPriceWei)
    });
    
    // Encrypt ticket price using FHEVM
    const encryptedTicketPrice = await fhevmProvider.encrypt(ticketPrice);
    console.log('Encrypted ticket price:', encryptedTicketPrice);
    
    // Convert base64 string to hex bytes for contract (browser-compatible)
    // Use atob (browser API) instead of Buffer (Node.js only)
    const binaryString = typeof window !== 'undefined' 
      ? atob(encryptedTicketPrice) 
      : Buffer.from(encryptedTicketPrice, 'base64').toString('binary');
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const encryptedBytes = ethers.hexlify(bytes);
    console.log('Encrypted bytes length:', encryptedBytes.length);
    
    return await contract.createRaffleEncrypted(
      name,
      description,
      encryptedBytes,
      totalTickets,
      durationSeconds,
      { value: totalCost }
    );
  }

  /**
   * Create raffle with regular function (fallback)
   */
  private async createRaffleRegular(params: CreateRaffleParams): Promise<ethers.ContractTransactionResponse> {
    const contract = this.ensureContract();
    const { name, description, ticketPrice, totalTickets, duration } = params;
    
    const durationSeconds = duration * 3600; // Convert hours to seconds
    const ticketPriceWei = ethers.parseEther(ticketPrice);
    const totalTicketValue = ticketPriceWei * BigInt(totalTickets);
    const commissionAmount = totalTicketValue * BigInt(3) / BigInt(100);
    const totalCost = totalTicketValue + commissionAmount;
    
    console.log('Regular calculated values:', {
      ticketPriceWei: ticketPriceWei.toString(),
      totalTicketValue: totalTicketValue.toString(),
      commissionAmount: commissionAmount.toString(),
      totalCost: totalCost.toString()
    });
    
    return await contract.createRaffle(
      name,
      description,
      ticketPriceWei,
      totalTickets,
      durationSeconds,
      { value: totalCost }
    );
  }

  /**
   * Buy tickets for a raffle (regular function)
   */
  async buyTickets(params: BuyTicketsParams): Promise<ethers.ContractTransactionResponse> {
    const contract = this.ensureContract();
    const { raffleId, ticketCount } = params;
    
    // Get ticket price first
    const raffleInfo = await this.getRaffleInfo(raffleId);
    const ticketPriceWei = ethers.parseEther(raffleInfo.ticketPrice);
    const totalCost = ticketPriceWei * BigInt(ticketCount);

    console.log('Buying tickets with regular function');

    return await contract.buyTickets(raffleId, ticketCount, { value: totalCost });
  }

  /**
   * End a raffle
   */
  async endRaffle(raffleId: string): Promise<ethers.ContractTransactionResponse> {
    const contract = this.ensureContract();
    return await contract.endRaffle(raffleId);
  }

  /**
   * Claim prize as winner
   */
  async claimPrize(raffleId: string): Promise<ethers.ContractTransactionResponse> {
    const contract = this.ensureContract();
    return await contract.claimPrize(raffleId);
  }


  /**
   * Claim refund as creator (if winner doesn't claim within time limit)
   */
  async claimRefund(raffleId: string): Promise<ethers.ContractTransactionResponse> {
    const contract = this.ensureContract();
    return await contract.claimRefund(raffleId);
  }

  /**
   * Get raffle information (FHEVM encrypted) - with AGGRESSIVE cache busting
   */
  async getRaffleInfo(raffleId: string): Promise<RaffleInfo> {
    const contract = this.ensureContract();
    
    // Add timestamp to ensure unique request
    const timestamp = Date.now();
    console.log(`🔍 [${timestamp}] Fetching raffle ${raffleId} with blockTag: latest`);
    
    // Force fetch latest data from blockchain (no caching)
    const result = await contract.getRaffleInfoEncrypted(raffleId, { blockTag: 'latest' });
    
    // Log to verify we're getting fresh data
    console.log(`📊 [${timestamp}] Fresh raffle data fetched for ID ${raffleId}:`, {
      soldTickets: Number(result.soldTickets),
      totalTickets: Number(result.totalTickets),
      rawSoldTickets: result.soldTickets.toString(),
      rawTotalTickets: result.totalTickets.toString(),
      timestamp: new Date().toISOString()
    });
    
    return {
      id: result.id.toString(),
      creator: result.creator,
      name: result.name,
      description: result.description,
      prizeAmount: ethers.formatEther(result.prizeAmount),
      ticketPrice: ethers.formatEther(result.ticketPrice),
      totalTickets: Number(result.totalTickets),
      soldTickets: Number(result.soldTickets),
      endTime: Number(result.endTime),
      winner: result.winner,
      prizeClaimedByWinner: result.prizeClaimedByWinner,
      refundClaimedByCreator: result.refundClaimedByCreator,
      creatorProfitClaimed: result.creatorProfitClaimed,
      status: result.status as RaffleStatus,
    };
  }


  /**
   * Get participant's ticket count for a raffle - with AGGRESSIVE cache busting
   */
  async getParticipantTickets(raffleId: string, participant: string): Promise<number> {
    try {
      const contract = this.ensureContract();
      // Force latest data from blockchain with timestamp logging
      console.log(`🎫 [${Date.now()}] Fetching participant tickets for ${participant.slice(0, 6)}...${participant.slice(-4)}`);
      const result = await contract.getParticipantTickets(raffleId, participant, { blockTag: 'latest' });
      console.log(`✅ Participant ${participant.slice(0, 6)}...${participant.slice(-4)} has ${Number(result)} tickets`);
      return Number(result);
    } catch (error) {
      console.warn('Error getting participant tickets, returning 0:', error);
      return 0;
    }
  }

  /**
   * Get all participants for a raffle - with AGGRESSIVE cache busting
   */
  async getRaffleParticipants(raffleId: string): Promise<string[]> {
    try {
      const contract = this.ensureContract();
      // Force latest data from blockchain with timestamp logging
      console.log(`👥 [${Date.now()}] Fetching all participants for raffle ${raffleId}`);
      const result = await contract.getRaffleParticipants(raffleId, { blockTag: 'latest' });
      console.log(`✅ Found ${result.length} participants`);
      return result;
    } catch (error) {
      console.warn('Error getting raffle participants, returning empty array:', error);
      return [];
    }
  }

  /**
   * Get raffles created by user
   */
  async getUserRaffles(userAddress: string): Promise<string[]> {
    try {
      const contract = this.ensureContract();
      const result = await contract.getUserRaffles(userAddress);
      return result.map((id: bigint) => id.toString());
    } catch (error: any) {
      console.warn('Error getting user raffles, returning empty array:', error);
      return [];
    }
  }

  /**
   * Get raffles user participated in
   */
  async getUserParticipations(userAddress: string): Promise<string[]> {
    try {
      const contract = this.ensureContract();
      const result = await contract.getUserParticipations(userAddress);
      return result.map((id: bigint) => id.toString());
    } catch (error: any) {
      console.warn('Error getting user participations, returning empty array:', error);
      return [];
    }
  }

  /**
   * Get total number of raffles
   */
  async getTotalRaffles(): Promise<number> {
    try {
      const contract = this.ensureContract();
      
      // Debug logging
      console.log('Contract address:', CONTRACT_ADDRESS);
      console.log('Provider network:', await this.signer?.provider?.getNetwork());
      console.log('Signer address:', await this.signer?.getAddress());
      
      const result = await contract.getTotalRaffles();
      const total = Number(result);
      console.log('Total raffles from contract:', total);
      return total;
    } catch (error: any) {
      console.warn('Error getting total raffles, returning 0:', error);
      console.warn('Error details:', error.message);
      console.warn('Contract address:', CONTRACT_ADDRESS);
      return 0;
    }
  }

  /**
   * Get all raffles with pagination
   */
  async getAllRaffles(startId = 1, limit = 50): Promise<RaffleInfo[]> {
    try {
      console.log('Getting all raffles...');
      const totalRaffles = await this.getTotalRaffles();
      console.log('Total raffles found:', totalRaffles);
      
      if (totalRaffles === 0) {
        console.log('No raffles found in contract');
        return [];
      }
      
      const endId = Math.min(startId + limit - 1, totalRaffles); // 1-based indexing
      const raffles: RaffleInfo[] = [];
      
      console.log(`Fetching raffles from ${startId} to ${endId} (1-based indexing)`);
      
      for (let i = startId; i <= endId; i++) {
        try {
          console.log(`Fetching raffle ${i}...`);
          const raffle = await this.getRaffleInfo(i.toString());
          console.log(`Raw raffle data for ${i}:`, raffle);
          raffles.push(raffle);
          console.log(`Successfully fetched raffle ${i}:`, raffle.name);
        } catch (error: any) {
          console.error(`Error fetching raffle ${i}:`, error);
          console.error(`Error details:`, error.message);
          
          // If raffle ID 1 fails, try ID 0 as fallback
          if (i === 1) {
            try {
              console.log(`Trying fallback raffle ID 0...`);
              const fallbackRaffle = await this.getRaffleInfo("0");
              console.log(`Raw raffle data for 0:`, fallbackRaffle);
              raffles.push(fallbackRaffle);
              console.log(`Successfully fetched raffle 0:`, fallbackRaffle.name);
            } catch (fallbackError) {
              console.error(`Fallback raffle ID 0 also failed:`, fallbackError);
            }
          }
        }
      }
      
      console.log(`Successfully loaded ${raffles.length} raffles`);
      return raffles;
    } catch (error) {
      console.error('Error getting all raffles:', error);
      return [];
    }
  }

  /**
   * Get ticket purchase events for a raffle (FHEVM only)
   */
  async getTicketPurchaseEvents(raffleId: string): Promise<{
    participant: string;
    ticketCount: number;
    totalCost: string;
    blockNumber: number;
    timestamp: number;
    transactionHash: string;
  }[]> {
    const contract = this.ensureContract();
    const provider = this.signer.provider;
    
    if (!provider) {
      throw new Error('Provider is required to fetch events');
    }

    try {
      const purchaseEvents: {
        participant: string;
        ticketCount: number;
        totalCost: string;
        blockNumber: number;
        timestamp: number;
        transactionHash: string;
      }[] = [];

      // Query only TicketPurchasedFHE events
      console.log('Querying TicketPurchasedFHE events for raffle:', raffleId)
      console.log('Contract address:', contract.target)
      
      // Try without raffleId filter first to see all events
      const allFheFilter = contract.filters.TicketPurchasedFHE();
      const allFheEvents = await contract.queryFilter(allFheFilter);
      console.log('All FHE events found:', allFheEvents.length)
      console.log('All FHE events:', allFheEvents)
      
      // Now filter by raffleId
      const fheFilter = contract.filters.TicketPurchasedFHE(raffleId);
      const fheEvents = await contract.queryFilter(fheFilter);
      console.log('Filtered FHE events found:', fheEvents.length)
      
      // Also check regular TicketPurchased events
      let regularEvents: any[] = []
      try {
        const regularFilter = contract.filters.TicketPurchased(raffleId);
        regularEvents = await contract.queryFilter(regularFilter);
        console.log('Regular TicketPurchased events found:', regularEvents.length)
        console.log('Regular events:', regularEvents)
      } catch (error) {
        console.log('No regular TicketPurchased filter available:', error)
      }
      
      // Process both FHE and regular events
      // First process FHE events
      for (const event of fheEvents) {
        if ('args' in event && event.args) {
          console.log('Processing FHE event:', event)
          const block = await provider.getBlock(event.blockNumber);
          
          const eventData = {
            participant: event.args[1] as string, // participant address
            ticketCount: 1, // FHE events assume 1 ticket per purchase
            totalCost: ethers.formatEther(event.args[2] as bigint), // totalCost
            blockNumber: event.blockNumber,
            timestamp: block ? block.timestamp : 0,
            transactionHash: event.transactionHash
          };
          console.log('FHE Event data:', eventData)
          purchaseEvents.push(eventData);
        }
      }
      
      // Then process regular events if available
      console.log('Processing regular events:', regularEvents)
      
      for (const event of regularEvents) {
        if ('args' in event && event.args) {
          console.log('Processing regular event:', event)
          const block = await provider.getBlock(event.blockNumber);
          
          const eventData = {
            participant: event.args[1] as string, // participant address
            ticketCount: Number(event.args[2]), // ticketCount
            totalCost: ethers.formatEther(event.args[3] as bigint), // totalCost
            blockNumber: event.blockNumber,
            timestamp: block ? block.timestamp : 0,
            transactionHash: event.transactionHash
          };
          console.log('Regular Event data:', eventData)
          purchaseEvents.push(eventData);
        }
      }
      
      // Sort by block number (most recent first)
      return purchaseEvents.sort((a, b) => b.blockNumber - a.blockNumber);
    } catch (error) {
      console.error('Error fetching ticket purchase events:', error);
      return [];
    }
  }

  /**
   * Filter raffles by status
   */
  async getRafflesByStatus(status: RaffleStatus): Promise<RaffleInfo[]> {
    const allRaffles = await this.getAllRaffles();
    return allRaffles.filter(raffle => raffle.status === status);
  }

  /**
   * Get raffles ending soon (within 24 hours)
   */
  async getExpiringSoonRaffles(): Promise<RaffleInfo[]> {
    const allRaffles = await this.getAllRaffles();
    const now = Date.now() / 1000;
    const twentyFourHours = 24 * 60 * 60;

    return allRaffles.filter(raffle => 
      raffle.status === RaffleStatus.ACTIVE && 
      raffle.endTime > now && 
      raffle.endTime <= now + twentyFourHours
    );
  }
}