export interface RaffleInfo {
  id: string;
  creator: string;
  name: string;
  description: string;
  prizeAmount: string;
  ticketPrice: string;
  totalTickets: number;
  soldTickets: number;
  endTime: number;
  winner?: string;
  prizeClaimedByWinner: boolean;
  refundClaimedByCreator: boolean;
  creatorProfitClaimed: boolean;
  status: RaffleStatus;
}


export enum RaffleStatus {
  ACTIVE = 0,
  ENDED = 1,
  CLAIMED = 2,
  EXPIRED = 3,
}

export interface Participant {
  address: string;
  ticketCount: number;
  username?: string;
}

export interface RaffleFormData {
  name: string;
  description: string;
  ticketPrice: string;
  totalTickets: number;
  duration: number; // in hours
}

export interface WalletState {
  isConnected: boolean;
  isLoading?: boolean;
  address?: string;
  balance?: string;
  chainId?: number;
}

export interface CreateRaffleParams {
  name: string;
  description: string;
  ticketPrice: string;
  totalTickets: number;
  duration: number;
}

export interface BuyTicketsParams {
  raffleId: string;
  ticketCount: number;
}

export interface Transaction {
  hash: string;
  type: 'create' | 'buy' | 'claim' | 'end';
  raffleId?: string;
  amount?: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}