'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { useWallet } from '../../hooks/useWallet'
import { RaffleContract } from '../../lib/contract'
import { RaffleInfo } from '../../types'
import { formatEthereumAddress, generateUsername } from '../../lib/utils'
import { ArrowLeft, User, Trophy, Ticket } from 'lucide-react'

interface ParticipationInfo extends RaffleInfo {
  userTickets: number
}

export default function ProfilePage() {
  const router = useRouter()
  const { signer, walletState, connectWallet, disconnectWallet } = useWallet()
  
  const [username, setUsername] = useState('')
  const [userRaffles, setUserRaffles] = useState<RaffleInfo[]>([])
  const [userParticipations, setUserParticipations] = useState<ParticipationInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (walletState.address) {
      // Generate username from wallet address (read-only)
      const generatedUsername = generateUsername(walletState.address)
      setUsername(generatedUsername)
      
      // Load user's raffle data
      loadUserData()
    }
  }, [walletState.address, signer])

  const loadUserData = async () => {
    if (!signer || !walletState.address) return

    try {
      setLoading(true)
      const contract = new RaffleContract(signer)
      
      // Load user's created raffles
      const raffleIds = await contract.getUserRaffles(walletState.address)
      const raffleData: RaffleInfo[] = []
      for (const id of raffleIds) {
        try {
          const raffle = await contract.getRaffleInfo(id)
          raffleData.push(raffle)
        } catch (error) {
          console.error(`Error loading raffle ${id}:`, error)
        }
      }
      setUserRaffles(raffleData)

      // Load user's participations
      const participationIds = await contract.getUserParticipations(walletState.address)
      const participationData: ParticipationInfo[] = []
      for (const id of participationIds) {
        try {
          const raffle = await contract.getRaffleInfo(id)
          const ticketCount = await contract.getParticipantTickets(id, walletState.address)
          participationData.push({ ...raffle, userTickets: ticketCount })
        } catch (error) {
          console.error(`Error loading participation ${id}:`, error)
        }
      }
      setUserParticipations(participationData)
      
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (walletState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <div className="text-white text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  if (!walletState.isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">Profile</h1>
          <p className="text-gray-300">Connect your wallet to view your profile</p>
          <Button onClick={connectWallet} size="lg" className="bg-blue-600 hover:bg-blue-700">
            Connect Wallet
          </Button>
        </div>
      </div>
    )
  }

  const handleViewRaffle = (raffleId: string) => {
    router.push(`/raffle/${raffleId}`)
  }

  const winCount = userParticipations.filter(p => 
    p.winner && p.winner.toLowerCase() === walletState.address!.toLowerCase()
  ).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Profile</h1>
              <p className="text-gray-300">{formatEthereumAddress(walletState.address!)}</p>
            </div>
          </div>
          <div className="ml-auto">
            <Button onClick={disconnectWallet} variant="outline">
              Disconnect
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm">Username</label>
                  <div className="text-white font-mono text-lg">@{username}</div>
                  <div className="text-xs text-gray-400 mt-1">Auto-generated from wallet address</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{userRaffles.length}</div>
                    <div className="text-gray-400 text-sm">Raffles Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{winCount}</div>
                    <div className="text-gray-400 text-sm">Raffles Won</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Created Raffles */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  My Raffles ({userRaffles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center text-gray-400 py-8">Loading...</div>
                ) : userRaffles.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <Ticket className="w-8 h-8 mx-auto mb-2" />
                    <div>No raffles created yet</div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {userRaffles.map((raffle) => (
                      <div key={raffle.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded hover:bg-gray-700/70 transition-colors cursor-pointer group"
                           onClick={() => handleViewRaffle(raffle.id)}>
                        <div>
                          <div className="text-white font-medium group-hover:text-blue-300">{raffle.name}</div>
                          <div className="text-gray-400 text-sm flex items-center gap-1">
                            <Image src="/eth-icon.svg" alt="ETH" width={14} height={14} className="inline" />
                            {raffle.prizeAmount} ETH
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-white text-sm">{raffle.soldTickets}/{raffle.totalTickets}</div>
                            <div className="text-gray-400 text-xs">tickets sold</div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewRaffle(raffle.id)
                            }}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Participated Raffles */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  My Participations ({userParticipations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center text-gray-400 py-8">Loading...</div>
                ) : userParticipations.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <Trophy className="w-8 h-8 mx-auto mb-2" />
                    <div>No participations yet</div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {userParticipations.map((raffle) => {
                      const isWinner = raffle.winner && raffle.winner.toLowerCase() === walletState.address!.toLowerCase()
                      const isClaimed = isWinner && raffle.prizeClaimedByWinner
                      return (
                        <div key={raffle.id} className={`flex items-center justify-between p-3 rounded hover:opacity-80 transition-all cursor-pointer group ${
                          isWinner ? (isClaimed ? 'bg-green-900/30 border border-green-700 hover:bg-green-900/40' : 'bg-yellow-900/30 border border-yellow-700 hover:bg-yellow-900/40') : 'bg-gray-700/50 hover:bg-gray-700/70'
                        }`}
                             onClick={() => handleViewRaffle(raffle.id)}>
                          <div>
                            <div className="text-white font-medium flex items-center gap-2 group-hover:text-blue-300">
                              {raffle.name}
                              {isWinner && <Trophy className={`w-4 h-4 ${isClaimed ? 'text-green-400' : 'text-yellow-400'}`} />}
                              {isClaimed && <span className="text-xs text-green-400 bg-green-900/50 px-2 py-1 rounded">✅ Claimed</span>}
                            </div>
                            <div className="text-gray-400 text-sm flex items-center gap-1">
                            <Image src="/eth-icon.svg" alt="ETH" width={14} height={14} className="inline" />
                            {raffle.prizeAmount} ETH
                          </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-white text-sm">{raffle.userTickets} tickets</div>
                              <div className={`text-xs ${
                                isClaimed ? 'text-green-400 font-bold' : isWinner ? 'text-yellow-400 font-bold' : 'text-gray-400'
                              }`}>
                                {isClaimed ? 'CLAIMED!' : isWinner ? 'WINNER!' : 'Participant'}
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant={isWinner ? "default" : "outline"}
                              className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                                isClaimed ? 'bg-green-600 hover:bg-green-700' : isWinner ? 'bg-yellow-600 hover:bg-yellow-700' : ''
                              }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewRaffle(raffle.id)
                              }}
                            >
                              {isClaimed ? 'Claimed' : isWinner ? 'Claim' : 'View'}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}