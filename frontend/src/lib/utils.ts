import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatEthereumAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTimeRemaining(endTime: number): string {
  const now = Date.now() / 1000;
  const diff = endTime - now;
  
  if (diff <= 0) return 'Ended';
  
  const days = Math.floor(diff / (24 * 60 * 60));
  const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((diff % (60 * 60)) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

export function calculateCommission(ticketPrice: string, totalTickets: number): string {
  const totalValue = parseFloat(ticketPrice) * totalTickets;
  return (totalValue * 0.03).toFixed(4);
}

// Simple hash function for consistent username generation
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function generateUsername(address: string): string {
  // Normalize address to lowercase for consistency
  const normalizedAddress = address.toLowerCase()
  
  // Generate completely deterministic username based on address
  // This ensures the same address always generates the same username across all devices
  const hash1 = simpleHash(normalizedAddress)
  const hash2 = simpleHash(normalizedAddress.slice(10)) // Use different part of address
  
  const adjectives = [
    'cool', 'smart', 'brave', 'quick', 'wise', 'bold',
    'calm', 'kind', 'fair', 'true', 'pure', 'bright',
    'dark', 'wild', 'free', 'fast', 'slow', 'deep',
    'lucky', 'swift', 'noble', 'sharp', 'fierce', 'gentle'
  ]
  
  const nouns = [
    'trader', 'holder', 'player', 'gamer', 'user', 'fan',
    'expert', 'master', 'pro', 'star', 'hero', 'legend',
    'winner', 'champ', 'king', 'queen', 'lord', 'sage',
    'wizard', 'knight', 'hunter', 'warrior', 'guardian', 'pilot'
  ]
  
  const adjectiveIndex = hash1 % adjectives.length
  const nounIndex = hash2 % nouns.length
  const numberSuffix = ((hash1 + hash2) % 9999).toString().padStart(4, '0')
  
  return `${adjectives[adjectiveIndex]}_${nouns[nounIndex]}_${numberSuffix}`
}

export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}