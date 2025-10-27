'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { RaffleInfo, RaffleStatus } from '../types'
import { useWallet } from '../hooks/useWallet'
import { RaffleContract } from '../lib/contract'
import { formatTimeRemaining, formatEthereumAddress, generateUsername } from '../lib/utils'
import { Plus, Shield, Eye, EyeOff } from 'lucide-react'

interface FHERaffleCardProps {
  raffle: RaffleInfo
  onView: (raffleId: string) => void
  hasAccess: boolean
  encryptedTickets?: string
}

function FHERaffleCard({ raffle, onView, hasAccess, encryptedTickets }: FHERaffleCardProps) {
  const timeRemaining = formatTimeRemaining(raffle.endTime)
  const isEnded = raffle.status !== RaffleStatus.ACTIVE || timeRemaining === 'Ended'
  const creatorUsername = generateUsername(raffle.creator)
  const winnerUsername = raffle.winner ? generateUsername(raffle.winner) : null

  return (
    <Card className="w-full max-w-sm bg-gradient-to-br from-purple-900/50 to-violet-900/50 border-purple-700/50 relative">
      {/* Privacy indicator */}
      <div className="absolute top-2 left-2 bg-green-600/80 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
        <Shield className="w-3 h-3" />
        FHE
      </div>
      
      <CardHeader className="relative">
        <div className="absolute top-4 right-4 text-xs bg-purple-800/50 px-2 py-1 rounded">
          @{creatorUsername}
        </div>
        <div className="w-full h-32 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4 mt-6">
          <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
            <div className="w-8 h-8 bg-blue-400 rounded transform rotate-45"></div>
          </div>
        </div>
        <div className="space-y-1">
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-lg font-bold text-white">{parseFloat(raffle.prizeAmount).toFixed(3)} ETH</div>
            <div className="text-xs text-gray-400">Prize amount</div>
          </div>
          <div className="text-right">
            <div className="text-yellow-400 font-mono">💰 {parseFloat(raffle.ticketPrice).toFixed(3)}</div>
          </div>
        </div>

        <div className="flex justify-between text-sm">
          <div>
            <div className="text-gray-300">Remaining</div>
            <div className="text-white font-bold flex items-center gap-1">
              {raffle.soldTickets}/{raffle.totalTickets}
              {hasAccess && encryptedTickets ? (
                <Eye className="w-3 h-3 text-green-400" />
              ) : (
                <EyeOff className="w-3 h-3 text-gray-500" />
              )}
            </div>
          </div>
          {winnerUsername && (
            <div className="text-right">
              <div className="text-gray-300">Winner</div>
              <div className="text-green-400">@{winnerUsername}</div>
            </div>
          )}
        </div>

        {/* Privacy status indicator */}
        <div className="bg-green-900/20 border border-green-700 rounded p-2 text-xs">
          <div className="text-green-300 font-medium">🔐 Privacy Protected</div>
          <div className="text-green-200">
            {hasAccess ? 'You have access to encrypted data' : 'Ticket counts are encrypted on-chain'}
          </div>
        </div>

        {isEnded && (
          <div className="text-center py-2 bg-red-900/30 rounded text-red-300 text-sm">
            Raffle Ended on: {new Date(raffle.endTime * 1000).toLocaleDateString()}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button 
          onClick={() => onView(raffle.id)} 
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function FHERaffleDashboard() {
  const [raffles, setRaffles] = useState<RaffleInfo[]>([])
  const [filteredRaffles, setFilteredRaffles] = useState<RaffleInfo[]>([])
  const [activeFilter, setActiveFilter] = useState<'all' | 'ended' | 'expiring'>('all')
  const [loading, setLoading] = useState(true)
  const [fheEnabled, setFheEnabled] = useState(false)
  const [accessData, setAccessData] = useState<Map<string, { hasAccess: boolean; encryptedTickets?: string }>>(new Map())
  
  const { signer, walletState, connectWallet } = useWallet()

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

    try {
      setLoading(true)
      const contract = new RaffleContract(signer)
      
      const allRaffles = await contract.getAllRaffles()
      setRaffles(allRaffles.reverse()) // Show newest first
      
      // Load access data for each raffle
      if (walletState.address) {
        const accessMap = new Map()
        
        for (const raffle of allRaffles) {
          try {
            // Get participant tickets (uses regular method, data is encrypted on-chain)
            const ticketCount = await contract.getParticipantTickets(raffle.id, walletState.address)
            const accessInfo: any = { 
              hasAccess: ticketCount > 0,
              encryptedTickets: ticketCount > 0 ? ticketCount.toString() : undefined
            }
            
            accessMap.set(raffle.id, accessInfo)
          } catch (error) {
            console.error('Error checking tickets for raffle', raffle.id, error)
            accessMap.set(raffle.id, { hasAccess: false })
          }
        }
        
        setAccessData(accessMap)
      }
      
    } catch (error) {
      console.error('Error loading raffles:', error)
      setFheEnabled(false)
    } finally {
      setLoading(false)
    }
  }

  const filterRaffles = () => {
    switch (activeFilter) {
      case 'ended':
        setFilteredRaffles(raffles.filter(r => r.status !== RaffleStatus.ACTIVE))
        break
      case 'expiring':
        const now = Date.now() / 1000
        const twentyFourHours = 24 * 60 * 60
        setFilteredRaffles(
          raffles.filter(r => 
            r.status === RaffleStatus.ACTIVE && 
            r.endTime > now && 
            r.endTime <= now + twentyFourHours
          )
        )
        break
      default:
        setFilteredRaffles(raffles)
    }
  }

  const handleViewRaffle = (raffleId: string) => {
    // Navigate to FHE raffle detail page
    window.location.href = `/raffle-fhe/${raffleId}`
  }

  const handleCreateRaffle = () => {
    // Navigate to FHE create raffle page
    window.location.href = '/create-fhe'
  }

  const toggleFHEMode = () => {
    // Toggle between FHE and regular mode
    window.location.href = fheEnabled ? '/' : '/fhe'
  }

  if (!walletState.isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-8 h-8 text-green-400" />
            <h1 className="text-4xl font-bold text-white">Private Raffle Dapp</h1>
          </div>
          <p className="text-gray-300">Connect your wallet to participate in privacy-enhanced raffles</p>
          <div className="bg-green-900/20 border border-green-700 rounded p-4 max-w-md mx-auto">
            <div className="text-green-300 font-medium mb-2">🔐 Enhanced Privacy with FHEVM</div>
            <div className="text-green-200 text-sm">
              Your ticket purchases and counts are encrypted on-chain using Fully Homomorphic Encryption
            </div>
          </div>
          <Button onClick={connectWallet} size="lg" className="bg-purple-600 hover:bg-purple-700">
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
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-green-400" />
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">🏠 Private Raffles</h1>
              <div className="flex items-center gap-2 text-sm text-green-300">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                FHE Mode {fheEnabled ? 'Active' : 'Unavailable'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={toggleFHEMode}
              variant="outline"
              className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
            >
              {fheEnabled ? 'Switch to Regular' : 'Switch to FHE'}
            </Button>
            <div className="text-white">
              <div className="text-sm text-gray-300">Connected:</div>
              <div className="font-mono">{formatEthereumAddress(walletState.address!)}</div>
            </div>
            <Button onClick={connectWallet} variant="outline">
              Connect
            </Button>
          </div>
        </div>

        {/* FHE Information Banner */}
        <div className="mb-8 bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-600/30 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <Shield className="w-12 h-12 text-green-400 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-white mb-2">🔐 Privacy-Enhanced Raffles</h2>
              <p className="text-gray-300 mb-2">
                This version uses FHEVM (Fully Homomorphic Encryption) to keep ticket purchases and counts private on-chain.
              </p>
              <div className="text-sm text-green-300">
                ✓ Encrypted ticket counts ✓ Private participant data ✓ Secure winner selection
              </div>
            </div>
            <Button onClick={handleCreateRaffle} className="bg-green-600 hover:bg-green-700 flex-shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Create Private Raffle
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveFilter('all')}
          >
            All
          </Button>
          <Button
            variant={activeFilter === 'ended' ? 'default' : 'outline'}
            onClick={() => setActiveFilter('ended')}
          >
            Ended Raffles
          </Button>
          <div className="ml-auto">
            <Button
              variant={activeFilter === 'expiring' ? 'default' : 'outline'}
              onClick={() => setActiveFilter('expiring')}
              className="text-right"
            >
              Expiring Soon ⭐
            </Button>
          </div>
        </div>

        {/* Raffles Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-white text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 animate-pulse text-green-400" />
              Loading private raffles...
            </div>
          </div>
        ) : filteredRaffles.length === 0 ? (
          <div className="text-center py-20">
            <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <div className="text-gray-400 text-lg">No private raffles found</div>
            <p className="text-gray-500 mt-2">
              {activeFilter === 'all' 
                ? 'Be the first to create a privacy-enhanced raffle!' 
                : `No ${activeFilter} private raffles at the moment.`
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRaffles.map((raffle) => {
              const accessInfo = accessData.get(raffle.id) || { hasAccess: false }
              return (
                <FHERaffleCard
                  key={raffle.id}
                  raffle={raffle}
                  onView={handleViewRaffle}
                  hasAccess={accessInfo.hasAccess}
                  encryptedTickets={accessInfo.encryptedTickets}
                />
              )
            })}
          </div>
        )}

        {/* Privacy Information Footer */}
        <div className="mt-12 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            Privacy Protection Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
            <div>
              <div className="font-medium text-white mb-1">🔐 Encrypted Tickets</div>
              <div>Your ticket counts are encrypted using FHEVM and stored privately on-chain</div>
            </div>
            <div>
              <div className="font-medium text-white mb-1">👁️ Access Control</div>
              <div>Only you and the raffle creator can access your encrypted participation data</div>
            </div>
            <div>
              <div className="font-medium text-white mb-1">🎯 Secure Selection</div>
              <div>Winner selection uses encrypted randomness for fair and private results</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}