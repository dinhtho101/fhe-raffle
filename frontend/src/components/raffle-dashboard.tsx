'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { RaffleInfo, RaffleStatus } from '../types'
import { useWallet } from '../hooks/useWallet'
import { RaffleContract, isContractConfigured } from '../lib/contract'
import { formatTimeRemaining, formatEthereumAddress, generateUsername } from '../lib/utils'
import { Plus } from 'lucide-react'
import Image from 'next/image'

interface RaffleCardProps {
  raffle: RaffleInfo
  onView: (raffleId: string) => void
}

// Helper function to format small ETH values
function formatEthValue(value: string): string {
  const num = parseFloat(value)
  if (num === 0) return '0'
  if (num >= 1) return num.toFixed(3)
  if (num >= 0.001) return num.toFixed(3)
  if (num >= 0.0001) return num.toFixed(4)
  if (num >= 0.00001) return num.toFixed(5)
  return num.toExponential(2)
}

function RaffleCard({ raffle, onView }: RaffleCardProps) {
  const now = Date.now() / 1000
  const isEnded = raffle.endTime <= now || raffle.soldTickets >= raffle.totalTickets
  const timeRemaining = isEnded ? 'Ended' : formatTimeRemaining(raffle.endTime)
  const creatorUsername = generateUsername(raffle.creator)
  const winnerUsername = raffle.winner ? generateUsername(raffle.winner) : null
  const remainingTickets = raffle.totalTickets - raffle.soldTickets

  return (
    <Card className="w-full max-w-sm bg-gradient-to-br from-blue-900/50 to-slate-800/50 border-blue-700/50">
      <CardHeader className="relative">
        <div className="relative w-full h-32 rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500">
          <Image 
            src="/ethereum-crystal.jpg" 
            alt="Ethereum Raffle" 
            fill
            className="object-cover"
            sizes="(max-width: 400px) 100vw, 400px"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/50 to-transparent" />
          
          {/* ETH Value Overlay */}
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
            <div className="flex items-center gap-1 text-white text-sm font-bold">
              <Image src="/eth-icon.svg" alt="ETH" width={14} height={14} className="inline" />
              {formatEthValue(raffle.prizeAmount)}
            </div>
          </div>
          
          {/* Fallback Ethereum icon when image doesn't load */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-blue-300">
                <path d="M12 1.5L5.25 12.25L12 16L18.75 12.25L12 1.5Z" fill="currentColor"/>
                <path d="M12 17.5L5.25 13.25L12 22.5L18.75 13.25L12 17.5Z" fill="currentColor" fillOpacity="0.6"/>
              </svg>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white truncate">{raffle.name}</h3>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <Image src="/eth-icon.svg" alt="ETH" width={20} height={20} className="inline" />
              {formatEthValue(raffle.prizeAmount)}
            </div>
            <div className="text-xs text-gray-400">Prize Amount</div>
          </div>
          <div className="text-right">
            <div className="text-yellow-400 font-mono flex items-center gap-2">
              <Image src="/eth-icon.svg" alt="ETH" width={16} height={16} className="inline" />
              {formatEthValue(raffle.ticketPrice)}
            </div>
            <div className="text-xs text-gray-400">Ticket Price</div>
          </div>
        </div>

        <div className="flex justify-between text-sm">
          <div>
            <div className="text-gray-300">Remaining</div>
            <div className="text-white font-bold">{remainingTickets}/{raffle.totalTickets}</div>
          </div>
          {isEnded && winnerUsername && raffle.soldTickets > 0 && (
            <div className="text-right">
              <div className="text-gray-300">Winner</div>
              <div className="text-green-400">@{winnerUsername}</div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Ticket Sales Progress</span>
            <span>{Math.round((raffle.soldTickets / raffle.totalTickets) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${(raffle.soldTickets / raffle.totalTickets) * 100}%` }}
        ></div>
          </div>
        </div>

        <div className="text-center py-3 rounded-lg text-sm">
          {isEnded ? (
            <div className="bg-gradient-to-r from-red-900/40 to-red-800/40 text-red-200 border border-red-700/50 rounded-lg py-2 px-3">
            {raffle.soldTickets >= raffle.totalTickets && raffle.soldTickets > 0 ? (
              raffle.winner ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">🎉</span>
                  <span className="font-medium">All tickets sold! Winner selected!</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">🎉</span>
                  <span className="font-medium">All tickets sold! Drawing winner...</span>
                </div>
              )
            ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-red-400">⏰</span>
                  <span className="font-medium">Ended on: {new Date(raffle.endTime * 1000).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-r from-green-900/40 to-emerald-800/40 text-green-200 border border-green-700/50 rounded-lg py-2 px-3">
              <div className="flex items-center justify-center gap-2">
                <span className="text-green-400 text-lg">⏰</span>
                <span className="font-medium">Ends in: {timeRemaining}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Button 
          onClick={() => onView(raffle.id)} 
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          View
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function RaffleDashboard() {
  const [raffles, setRaffles] = useState<RaffleInfo[]>([])
  const [filteredRaffles, setFilteredRaffles] = useState<RaffleInfo[]>([])
  const [activeFilter, setActiveFilter] = useState<'all' | 'ended' | 'expiring'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const { signer, walletState, connectWallet, disconnectWallet } = useWallet()

  useEffect(() => {
    if (signer) {
      loadRaffles()
    }
  }, [signer])

  useEffect(() => {
    filterRaffles()
  }, [raffles, activeFilter])

  const loadRaffles = async () => {
    if (!signer) return

    // Check if contract is configured first
    if (!isContractConfigured()) {
      setError('Smart contract is not deployed. Please deploy the contract and configure the address.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      const contract = new RaffleContract(signer)
      
      // Debug network info
      const network = await signer.provider?.getNetwork()
      console.log('Current network:', network)
      console.log('Expected network: Sepolia (11155111)')
      
      const allRaffles = await contract.getAllRaffles()
      setRaffles(allRaffles.reverse()) // Show newest first
    } catch (error: any) {
      console.error('Error loading raffles:', error)
      if (error.message.includes('Smart contract is not configured')) {
        setError('Smart contract is not deployed. Please deploy the RaffleContract.sol first and set the contract address in your .env.local file.')
      } else if (error.message.includes('network')) {
        setError('Network mismatch! Please switch to Sepolia testnet to view raffles.')
      } else {
        setError('Failed to load raffles. Please check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const filterRaffles = () => {
    const now = Date.now() / 1000
    
    switch (activeFilter) {
      case 'ended':
        setFilteredRaffles(raffles.filter(r => r.endTime <= now || r.soldTickets >= r.totalTickets))
        break
      case 'expiring':
        const twentyFourHours = 24 * 60 * 60
        setFilteredRaffles(
          raffles.filter(r => 
            r.endTime > now && 
            r.soldTickets < r.totalTickets &&
            r.endTime <= now + twentyFourHours
          )
        )
        break
      default:
        setFilteredRaffles(raffles)
    }
  }

  const handleViewRaffle = (raffleId: string) => {
    // Navigate to raffle detail page
    window.location.href = `/raffle/${raffleId}`
  }

  const handleCreateRaffle = () => {
    // Navigate to create raffle page
    window.location.href = '/create'
  }

  if (walletState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (!walletState.isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">Raffle Dapp</h1>
          <p className="text-gray-300">Connect your wallet to participate in raffles</p>
          <Button onClick={connectWallet} size="lg" className="bg-blue-600 hover:bg-blue-700">
            Connect Wallet
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">🏠 Raffles</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-white">
              <div className="text-sm text-gray-300">Connected:</div>
              <div className="font-mono">{formatEthereumAddress(walletState.address!)}</div>
            </div>
            <Button onClick={() => window.location.href = '/profile'} variant="outline" className="border-blue-600 text-blue-400 hover:bg-blue-900/20">
              Profile
            </Button>
            <Button onClick={disconnectWallet} variant="outline" className="border-blue-600 text-blue-400 hover:bg-blue-900/20">
              Disconnect
            </Button>
          </div>
        </div>

        {/* Create Raffle Banner */}
        <div className="mb-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">🎯 Create Your Raffle</h2>
            <p className="text-blue-100">Easily set up and manage your own raffle with our user-friendly platform</p>
          </div>
          <Button onClick={handleCreateRaffle} className="bg-white text-blue-600 hover:bg-gray-100">
            <Plus className="w-4 h-4 mr-2" />
            Create
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-900/20 border border-red-700 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white text-sm">!</div>
              <div>
                <h3 className="text-red-300 font-bold">Error Loading Raffles</h3>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={loadRaffles} size="sm" className="bg-red-600 hover:bg-red-700">
                Retry
              </Button>
              <Button 
                onClick={() => {
                  // Force reload page to clear cache
                  window.location.reload();
                }} 
                size="sm" 
                variant="outline" 
                className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/20"
              >
                🔄 Clear Cache & Reload
              </Button>
              {error.includes('Smart contract is not deployed') && (
                <Button onClick={() => window.open('https://hardhat.org/hardhat-runner/docs/guides/deploying', '_blank')} size="sm" variant="outline" className="border-blue-600 text-blue-400 hover:bg-blue-900/20">
                  View Deployment Guide
                </Button>
              )}
            </div>
          </div>
        )}
        <div className="flex gap-4 mb-6">
          <Button
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveFilter('all')}
            className={activeFilter === 'all' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-blue-600 text-blue-400 hover:bg-blue-900/20'}
          >
            All
          </Button>
          <Button
            variant={activeFilter === 'ended' ? 'default' : 'outline'}
            onClick={() => setActiveFilter('ended')}
            className={activeFilter === 'ended' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-blue-600 text-blue-400 hover:bg-blue-900/20'}
          >
            Ended Raffles
          </Button>
          <div className="ml-auto">
            <Button
              variant={activeFilter === 'expiring' ? 'default' : 'outline'}
              onClick={() => setActiveFilter('expiring')}
              className={`text-right ${activeFilter === 'expiring' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-blue-600 text-blue-400 hover:bg-blue-900/20'}`}
            >
              Expiring Soon ⭐
            </Button>
          </div>
        </div>

        {/* Raffles Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-white text-lg">Loading raffles...</div>
          </div>
        ) : filteredRaffles.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 text-lg">No raffles found</div>
            <p className="text-gray-500 mt-2">
              {activeFilter === 'all' 
                ? 'Be the first to create a raffle!' 
                : `No ${activeFilter} raffles at the moment.`
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredRaffles.map((raffle) => (
              <RaffleCard
                key={raffle.id}
                raffle={raffle}
                onView={handleViewRaffle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}