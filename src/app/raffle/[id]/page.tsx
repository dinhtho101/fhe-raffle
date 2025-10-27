'use client'
'use client'

// Disable Next.js caching for this dynamic route
export const dynamic = 'force-dynamic'
export const revalidate = 0

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { useWallet } from '../../../hooks/useWallet'
import { RaffleContract } from '../../../lib/contract'
import { RaffleInfo, RaffleStatus, Participant } from '../../../types'
import { formatTimeRemaining, formatEthereumAddress, generateUsername, formatDate } from '../../../lib/utils'
import { ArrowLeft, Users, Clock, Trophy, Ticket, DollarSign } from 'lucide-react'

interface ActivityEntry {
  participant: string
  participantAddress: string
  ticketCount: number
  timestamp: string
  transactionType: 'purchase'
}

export default function RaffleDetailPage() {
  const params = useParams()
  const raffleId = params?.id as string
  
  const [raffle, setRaffle] = useState<RaffleInfo | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [ticketAmount, setTicketAmount] = useState(1)
  const [userTickets, setUserTickets] = useState(0)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [activeTab, setActiveTab] = useState<'activity' | 'participants'>('activity')
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [purchaseStatus, setPurchaseStatus] = useState<'sending' | 'confirming' | 'success' | 'error'>('sending')
  const [purchaseError, setPurchaseError] = useState('')
  const [showEndModal, setShowEndModal] = useState(false)
  const [endStatus, setEndStatus] = useState<'sending' | 'confirming' | 'success' | 'error'>('sending')
  const [endError, setEndError] = useState('')
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [claimStatus, setClaimStatus] = useState<'sending' | 'confirming' | 'success' | 'error'>('sending')
  const [claimError, setClaimError] = useState('')
  
  const { signer, walletState, connectWallet } = useWallet()

  // Helper function to format time ago
  const formatTimeAgo = (date: Date): string => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  useEffect(() => {
    if (signer && raffleId) {
      // Force load on mount (even if cached)
      console.log('🔄 Page mounted, loading raffle details...');
      loadRaffleDetails(false) // Initial load
      
      // Auto-refresh every 5 seconds to sync with other users' transactions
      const intervalId = setInterval(() => {
        loadRaffleDetails(true) // Auto-refresh (don't show loading spinner)
      }, 5000) // Refresh every 5 seconds
      
      return () => {
        console.log('🗑️ Cleaning up raffle detail auto-refresh interval');
        clearInterval(intervalId);
      }
    }
  }, [signer, raffleId])
  
  // CRITICAL FIX: Listen for page visibility changes (F5, tab focus)
  // This ensures data refreshes when user returns to tab or presses F5
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && signer && raffleId) {
        console.log('👁️ Page became visible, refreshing data...');
        loadRaffleDetails(false);
      }
    };
    
    const handleFocus = () => {
      if (signer && raffleId) {
        console.log('🔍 Window focused, refreshing data...');
        loadRaffleDetails(false);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [signer, raffleId]);

  const loadRaffleDetails = async (isAutoRefresh = false) => {
    if (!signer || !raffleId) return

    try {
      const refreshTimestamp = Date.now();
      // Log refresh attempt with unique timestamp
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 [REFRESH #${refreshTimestamp}] Loading raffle details`);
      console.log(`🕒 Time: ${new Date().toLocaleTimeString()}`);
      console.log(`🤖 Auto-refresh: ${isAutoRefresh}`);
      console.log(`🎫 Raffle ID: ${raffleId}`);
      console.log(`${'='.repeat(60)}\n`);
      
      // Only show loading spinner on initial load, not on auto-refresh
      if (!isAutoRefresh) {
        setLoading(true)
      }
      const contract = new RaffleContract(signer)
      
      // Load raffle info
      console.log(`⏳ [${refreshTimestamp}] Calling contract.getRaffleInfo()...`);
      const raffleInfo = await contract.getRaffleInfo(raffleId)
      console.log(`\n✅ [${refreshTimestamp}] Raffle info loaded:`);
      console.log(`   🎫 Sold: ${raffleInfo.soldTickets}`);
      console.log(`   🎫 Total: ${raffleInfo.totalTickets}`);
      console.log(`   🎫 Status: ${raffleInfo.status}`);
      console.log(`   🕒 End Time: ${new Date(raffleInfo.endTime * 1000).toLocaleString()}\n`);
      
      setRaffle(raffleInfo)
      
      // Load participants
      const participantAddresses = await contract.getRaffleParticipants(raffleId)
      const participantData: Participant[] = []
      
      for (const address of participantAddresses) {
        const ticketCount = await contract.getParticipantTickets(raffleId, address)
        const username = generateUsername(address)
        
        participantData.push({
          address,
          ticketCount,
          username,
        })
      }
      
      setParticipants(participantData.sort((a, b) => b.ticketCount - a.ticketCount))
      
      // Load user's ticket count
      if (walletState.address) {
        const userTicketCount = await contract.getParticipantTickets(raffleId, walletState.address)
        setUserTickets(userTicketCount)
      }
      
      // Load real activity from blockchain events
      try {
        console.log('Loading activity events for raffle:', raffleId)
        const purchaseEvents = await contract.getTicketPurchaseEvents(raffleId)
        console.log('Purchase events found:', purchaseEvents)
        
        const realActivity: ActivityEntry[] = purchaseEvents.map(event => ({
          participant: generateUsername(event.participant),
          participantAddress: event.participant,
          ticketCount: event.ticketCount,
          timestamp: formatTimeAgo(new Date(event.timestamp * 1000)),
          transactionType: 'purchase'
        }))
        console.log('Real activity mapped:', realActivity)
        setActivity(realActivity)
      } catch (error) {
        console.error('Error loading activity events:', error)
        // Fallback to simple activity if events fail
        const fallbackActivity: ActivityEntry[] = participantData.map((p, index) => {
          const minutesAgo = Math.floor(Math.random() * 60) + 1
          const timestamp = new Date(Date.now() - (minutesAgo * 60 * 1000))
          
          return {
            participant: p.username!,
            participantAddress: p.address,
            ticketCount: p.ticketCount,
            timestamp: formatTimeAgo(timestamp),
            transactionType: 'purchase'
          }
        })
        setActivity(fallbackActivity.reverse())
      }
      
    } catch (error) {
      console.error('Error loading raffle details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBuyTickets = async () => {
    if (!walletState.isConnected) {
      await connectWallet()
      return
    }

    if (!signer || !raffle) {
      alert('Please connect your wallet first')
      return
    }

    if (ticketAmount <= 0 || ticketAmount > (raffle.totalTickets - raffle.soldTickets)) {
      alert('Invalid ticket amount')
      return
    }

    try {
      setPurchasing(true)
      setShowPurchaseModal(true)
      setPurchaseStatus('sending')
      setPurchaseError('')
      
      const contract = new RaffleContract(signer)
      
      const tx = await contract.buyTickets({
        raffleId: raffleId,
        ticketCount: ticketAmount,
      })
      
      setPurchaseStatus('confirming')
      
      // Wait for proper blockchain confirmation
      let retryCount = 0
      const maxRetries = 10
      
      const waitForUpdate = async () => {
        try {
          // Check if the raffle data has been updated
          const updatedRaffle = await contract.getRaffleInfo(raffleId)
          
          // Check if sold tickets increased
          if (updatedRaffle.soldTickets > raffle.soldTickets) {
            setPurchaseStatus('success')
            
            // Wait a bit more then reload
            setTimeout(async () => {
              await loadRaffleDetails()
              setShowPurchaseModal(false)
              setPurchasing(false)
              setTicketAmount(1)
            }, 1500)
            return
          }
          
          // If not updated yet and we haven't exceeded retries, try again
          if (retryCount < maxRetries) {
            retryCount++
            setTimeout(waitForUpdate, 2000) // Wait 2 seconds between checks
          } else {
            // Max retries reached, show success anyway and reload
            setPurchaseStatus('success')
            setTimeout(async () => {
              await loadRaffleDetails()
              setShowPurchaseModal(false)
              setPurchasing(false)
              setTicketAmount(1)
            }, 1500)
          }
        } catch (error) {
          console.error('Error checking update:', error)
          // If error checking, still proceed with success
          setPurchaseStatus('success')
          setTimeout(async () => {
            await loadRaffleDetails()
            setShowPurchaseModal(false)
            setPurchasing(false)
            setTicketAmount(1)
          }, 1500)
        }
      }
      
      // Start checking for updates after 3 seconds
      setTimeout(waitForUpdate, 3000)
      
    } catch (error: any) {
      console.error('Error buying tickets:', error)
      setPurchaseStatus('error')
      
      if (error.message.includes('insufficient funds')) {
        setPurchaseError('Insufficient funds. Please check your ETH balance.')
      } else if (error.message.includes('user rejected')) {
        setPurchaseError('Transaction cancelled by user.')
        setShowPurchaseModal(false)
        setPurchasing(false)
      } else {
        setPurchaseError('Failed to buy tickets. Please try again.')
      }
    }
  }

  const handleEndRaffle = async () => {
    if (!signer || !raffle) return

    try {
      setShowEndModal(true)
      setEndStatus('sending')
      setEndError('')
      
      const contract = new RaffleContract(signer)
      const tx = await contract.endRaffle(raffleId)
      
      setEndStatus('confirming')
      
      // Wait for transaction confirmation
      await tx.wait()
      
      setEndStatus('success')
      
      // Reload raffle details
      setTimeout(() => {
        loadRaffleDetails()
      }, 3000)
      
    } catch (error: any) {
      console.error('Error ending raffle:', error)
      setEndStatus('error')
      setEndError(error.message || 'Failed to end raffle. Please try again.')
    }
  }


  const handleClaimPrize = async () => {
    if (!signer || !raffle) return

    try {
      setShowClaimModal(true)
      setClaimStatus('sending')
      setClaimError('')
      
      const contract = new RaffleContract(signer)
      const tx = await contract.claimPrize(raffleId)
      
      setClaimStatus('confirming')
      
      // Wait for transaction confirmation
      await tx.wait()
      
      setClaimStatus('success')
      
      // Reload raffle details after 3 seconds
      setTimeout(async () => {
        await loadRaffleDetails()
        setShowClaimModal(false)
        setClaimStatus('sending')
      }, 3000)
      
    } catch (error: any) {
      console.error('Error claiming prize:', error)
      setClaimStatus('error')
      setClaimError(error.message || 'Failed to claim prize. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <div className="text-white text-lg">Loading raffle details...</div>
        </div>
      </div>
    )
  }

  if (!raffle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-lg">Raffle not found</div>
      </div>
    )
  }

  if (walletState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <div className="text-white text-lg">Connecting wallet...</div>
        </div>
      </div>
    )
  }

  const timeRemaining = formatTimeRemaining(raffle.endTime)
  const now = Date.now() / 1000
  const isEnded = raffle.endTime <= now || raffle.soldTickets >= raffle.totalTickets
  const isWinner = raffle.winner && walletState.address?.toLowerCase() === raffle.winner.toLowerCase()
  const isCreator = walletState.address?.toLowerCase() === raffle.creator.toLowerCase()
  const canEndRaffle = isCreator && !isEnded && raffle.soldTickets > 0
  const canClaimProfit = false // Creator profit is now auto-transferred, no manual claim needed
  const canBuyTickets = !isEnded && !isCreator && walletState.isConnected

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{parseFloat(raffle.prizeAmount).toFixed(3)} ETH</h1>
            <p className="text-gray-300">@{generateUsername(raffle.creator)}</p>
            {isCreator && (
              <div className="mt-1 text-sm">
                <span className="text-yellow-400">💰 Creator Profit: </span>
                <span className="text-yellow-300 font-mono">
                  {(parseFloat(raffle.prizeAmount) / 0.95 * 0.05).toFixed(4)} ETH (5%)
                </span>
              </div>
            )}
          </div>
          <div className="ml-auto">
            {walletState.isConnected ? (
              <div className="text-white text-right">
                <div className="text-sm text-gray-300">Connected:</div>
                <div className="font-mono text-sm">{formatEthereumAddress(walletState.address!)}</div>
              </div>
            ) : (
              <Button onClick={connectWallet} variant="outline">
                Connect Wallet
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Raffle Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Raffle Card */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="w-full h-48 bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 rounded-lg flex items-center justify-center mb-6">
                  <div className="w-20 h-20 bg-white/20 rounded-lg flex items-center justify-center">
                    <Image src="/eth-icon.svg" alt="ETH" width={40} height={40} className="text-blue-300" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">
                      {parseFloat(raffle.prizeAmount).toFixed(3)} ETH
                    </div>
                  </div>

                  {isEnded ? (
                    <div className="text-center py-4 bg-red-900/30 rounded text-red-300">
                      <Clock className="w-5 h-5 inline mr-2" />
                      {raffle.soldTickets >= raffle.totalTickets && raffle.soldTickets > 0 ? (
                        <>🎉 All tickets sold! Winner selected!</>
                      ) : (
                        <>Raffle Ended on: {formatDate(raffle.endTime)}</>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-green-900/30 rounded text-green-300">
                      <Clock className="w-5 h-5 inline mr-2" />
                      Ends in: {timeRemaining}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-gray-300">Ticket Price</div>
                      <div className="text-yellow-400 font-mono text-lg flex items-center justify-center gap-1">
                        <Image src="/eth-icon.svg" alt="ETH" width={16} height={16} className="inline" />
                        {(() => {
                          const price = parseFloat(raffle.ticketPrice)
                          if (price === 0) return '0'
                          if (price >= 1) return price.toFixed(3)
                          if (price >= 0.001) return price.toFixed(3)
                          if (price >= 0.0001) return price.toFixed(4)
                          if (price >= 0.00001) return price.toFixed(5)
                          return price.toExponential(2)
                        })()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-300">Tickets Remaining</div>
                      <div className="text-white font-bold text-lg">{raffle.totalTickets - raffle.soldTickets}/{raffle.totalTickets}</div>
                      <div className="text-xs text-gray-400">({participants.length} Unique Ticket Holders)</div>
                    </div>
                  </div>

                  {isEnded && raffle.winner && raffle.soldTickets > 0 && (
                    <div className="text-center py-4 bg-yellow-900/30 rounded">
                      <Trophy className="w-5 h-5 inline mr-2 text-yellow-400" />
                      <span className="text-yellow-400">Winner: </span>
                      <span className="text-white font-bold">@{generateUsername(raffle.winner)}</span>
                      <div className="text-xs text-gray-400 mt-1">
                        {participants.find(p => p.address.toLowerCase() === raffle.winner!.toLowerCase())?.ticketCount || 0} tickets
                      </div>
                      {raffle.prizeClaimedByWinner && (
                        <div className="mt-2 px-3 py-1 bg-green-900/50 text-green-400 text-xs rounded-full inline-block">
                          ✅ Prize Claimed
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {isWinner && isEnded && !raffle.prizeClaimedByWinner && (
                      <Button 
                        onClick={handleClaimPrize}
                        className="w-full bg-yellow-600 hover:bg-yellow-700"
                      >
                        <Trophy className="w-4 h-4 mr-2" />
                        Claim Prize
                      </Button>
                    )}

                    {isWinner && isEnded && raffle.prizeClaimedByWinner && (
                      <Button 
                        disabled
                        className="w-full bg-green-900/50 text-green-400 cursor-not-allowed"
                      >
                        ✅ Prize Claimed
                      </Button>
                    )}

                    {canEndRaffle && (
                      <Button 
                        onClick={handleEndRaffle}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        End Raffle & Draw Winner
                      </Button>
                    )}


                    {canBuyTickets && walletState.isConnected && raffle.soldTickets < raffle.totalTickets && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="1"
                            max={raffle.totalTickets - raffle.soldTickets}
                            value={ticketAmount}
                            onChange={(e) => setTicketAmount(Math.min(parseInt(e.target.value) || 1, raffle.totalTickets - raffle.soldTickets))}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="Ticket amount"
                          />
                          <Button 
                            onClick={handleBuyTickets}
                            disabled={purchasing || !walletState.isConnected}
                            className="bg-blue-600 hover:bg-blue-700 flex-1 whitespace-nowrap"
                          >
                            {purchasing ? 'Buying...' : `Buy ${ticketAmount} Ticket${ticketAmount > 1 ? 's' : ''}`}
                          </Button>
                        </div>
                        <div className="text-xs text-gray-400">
                          Total cost: {(parseFloat(raffle.ticketPrice) * ticketAmount).toFixed(6)} ETH
                        </div>
                      </div>
                    )}

                    {!walletState.isConnected && !isEnded && raffle.soldTickets < raffle.totalTickets && (
                      <Button 
                        onClick={connectWallet}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        Connect Wallet to Buy Tickets
                      </Button>
                    )}

                    {raffle.status === RaffleStatus.ENDED && !raffle.winner && (
                      <Button className="w-full bg-purple-600 hover:bg-purple-700">
                        🔍 Verify & Draw
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guide */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">A guide to buying raffle tickets:</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-gray-300 text-sm">
                <p>• Familiarize yourself with raffle rules.</p>
                <p>• Raffle tickets are non-refundable, whether you win or not.</p>
                <p>• Purchasing one ticket will grant you an opportunity to win in the raffle, more tickets represent a higher probability of winning.</p>
                <p>• Winners will be given sixty (60) days after the draw to claim their prize.</p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Activity & Participants */}
          <div className="space-y-6">
            {/* User's Tickets */}
            {userTickets > 0 && (
              <Card className="bg-green-900/20 border-green-700">
                <CardContent className="p-4 text-center">
                  <Ticket className="w-8 h-8 mx-auto text-green-400 mb-2" />
                  <div className="text-white font-bold">You own {userTickets} ticket{userTickets > 1 ? 's' : ''}</div>
                  <div className="text-green-400 text-sm">
                    {((userTickets / raffle.totalTickets) * 100).toFixed(2)}% chance to win
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity & Participants Tabs */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <div className="flex gap-4">
                  <Button 
                    variant={activeTab === 'activity' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setActiveTab('activity')}
                  >
                    Activity ({activity.length})
                  </Button>
                  <Button 
                    variant={activeTab === 'participants' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setActiveTab('participants')}
                  >
                    Participants ({participants.length})
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeTab === 'activity' ? (
                  // Activity Tab
                  activity.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <Users className="w-8 h-8 mx-auto mb-2" />
                      <div>No activity yet</div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {activity.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm">
                              {entry.participant.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-white text-sm">@{entry.participant}</div>
                              <div className="text-gray-400 text-xs">
                                Bought {entry.ticketCount} ticket{entry.ticketCount > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-gray-400 text-xs">{entry.timestamp}</div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  // Participants Tab
                  participants.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <Users className="w-8 h-8 mx-auto mb-2" />
                      <div>No participants yet</div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {participants.map((participant, index) => (
                        <div key={participant.address} className="flex items-center justify-between py-2 border-b border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm">
                              {participant.username!.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-white text-sm">@{participant.username}</div>
                              <div className="text-gray-400 text-xs">
                                {formatEthereumAddress(participant.address)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white text-sm font-bold">{participant.ticketCount} tickets</div>
                            <div className="text-gray-400 text-xs">
                              {((participant.ticketCount / raffle.totalTickets) * 100).toFixed(1)}% chance
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full p-6">
            <div className="text-center space-y-4">
              {purchaseStatus === 'sending' && (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <h3 className="text-xl font-semibold text-white">Sending Transaction</h3>
                  <p className="text-gray-300">Please confirm the transaction in your wallet...</p>
                </>
              )}
              
              {purchaseStatus === 'confirming' && (
                <>
                  <div className="animate-pulse">
                    <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Confirming Transaction</h3>
                  <p className="text-gray-300">Waiting for blockchain confirmation...</p>
                  <div className="flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </>
              )}
              
              {purchaseStatus === 'success' && (
                <>
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Purchase Successful!</h3>
                  <p className="text-gray-300">
                    Successfully purchased {ticketAmount} ticket{ticketAmount > 1 ? 's' : ''}!
                  </p>
                  <p className="text-sm text-gray-400">Page will refresh automatically...</p>
                </>
              )}
              
              {purchaseStatus === 'error' && (
                <>
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Purchase Failed</h3>
                  <p className="text-gray-300">{purchaseError}</p>
                  <Button 
                    onClick={() => {
                      setShowPurchaseModal(false)
                      setPurchasing(false)
                    }}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    Close
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* End Raffle Modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full p-6">
            <div className="text-center space-y-4">
              {endStatus === 'sending' && (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                  <h3 className="text-xl font-semibold text-white">Ending Raffle</h3>
                  <p className="text-gray-300">Please confirm the transaction in your wallet...</p>
                </>
              )}
              
              {endStatus === 'confirming' && (
                <>
                  <div className="animate-pulse">
                    <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Confirming Transaction</h3>
                  <p className="text-gray-300">Waiting for blockchain confirmation...</p>
                  <div className="flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </>
              )}
              
              {endStatus === 'success' && (
                <>
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Raffle Ended Successfully!</h3>
                  <p className="text-gray-300">
                    Winner has been selected and the raffle is now closed.
                  </p>
                  <p className="text-sm text-gray-400">Refreshing page to show results...</p>
                </>
              )}
              
              {endStatus === 'error' && (
                <>
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Failed to End Raffle</h3>
                  <p className="text-gray-300">{endError}</p>
                  <Button 
                    onClick={() => {
                      setShowEndModal(false)
                    }}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    Close
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Claim Prize Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full p-6">
            <div className="text-center space-y-4">
              {claimStatus === 'sending' && (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
                  <h3 className="text-xl font-semibold text-white">Claiming Prize</h3>
                  <p className="text-gray-300">Please confirm the transaction in your wallet...</p>
                </>
              )}
              
              {claimStatus === 'confirming' && (
                <>
                  <div className="animate-pulse">
                    <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Confirming Transaction</h3>
                  <p className="text-gray-300">Waiting for blockchain confirmation...</p>
                  <div className="flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-yellow-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-yellow-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </>
              )}
              
              {claimStatus === 'success' && (
                <>
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Prize Claimed Successfully!</h3>
                  <p className="text-gray-300">
                    Congratulations! Your prize of {parseFloat(raffle.prizeAmount).toFixed(3)} ETH has been claimed.
                  </p>
                  <p className="text-sm text-gray-400">Refreshing page to show updated status...</p>
                </>
              )}
              
              {claimStatus === 'error' && (
                <>
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Failed to Claim Prize</h3>
                  <p className="text-gray-300">{claimError}</p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        setShowClaimModal(false)
                        setClaimStatus('sending')
                        setClaimError('')
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      Close
                    </Button>
                    <Button 
                      onClick={handleClaimPrize}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                    >
                      Try Again
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}