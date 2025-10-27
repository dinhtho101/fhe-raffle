'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { useWallet } from '../../hooks/useWallet'
import { RaffleContract } from '../../lib/contract'
import { RaffleFormData } from '../../types'
import { calculateCommission } from '../../lib/utils'
import { ArrowLeft, Clock } from 'lucide-react'
import Image from 'next/image'

export default function CreateRafflePage() {
  const [formData, setFormData] = useState<RaffleFormData>({
    name: '',
    description: '',
    ticketPrice: '',
    totalTickets: 100,
    duration: 24, // hours
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createStatus, setCreateStatus] = useState<'sending' | 'confirming' | 'success' | 'error'>('sending')
  const [createError, setCreateError] = useState('')
  
  const { signer, walletState, connectWallet } = useWallet()

  const handleInputChange = (field: keyof RaffleFormData, value: string | number) => {
    console.log(`Setting ${field} to:`, value, typeof value);
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleQuickSelect = (multiplier: number) => {
    setFormData(prev => ({ ...prev, totalTickets: prev.totalTickets * multiplier }))
  }

  const calculateSummary = () => {
    const ticketPrice = parseFloat(formData.ticketPrice) || 0
    const totalVolume = ticketPrice * formData.totalTickets
    const commission = totalVolume * 0.03
    const creatorProfit = totalVolume * 0.05
    const prizeAmount = totalVolume - creatorProfit
    const totalCost = totalVolume + commission

    return {
      totalVolume: totalVolume.toFixed(4),
      prizeAmount: prizeAmount.toFixed(4),
      creatorProfit: creatorProfit.toFixed(4),
      commission: commission.toFixed(4),
      totalCost: totalCost.toFixed(4),
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!signer) {
      await connectWallet()
      return
    }

    if (!acceptTerms) {
      alert('Please accept the terms and conditions')
      return
    }

    try {
      setIsSubmitting(true)
      setShowCreateModal(true)
      setCreateStatus('sending')
      setCreateError('')
      
      console.log('Form data being sent:', formData);
      
      const contract = new RaffleContract(signer)
      
      const tx = await contract.createRaffle({
        name: formData.name,
        description: formData.description,
        ticketPrice: formData.ticketPrice,
        totalTickets: formData.totalTickets,
        duration: formData.duration,
      })

      console.log('Transaction sent')
      setCreateStatus('confirming')
      
      // Wait for transaction confirmation
      await tx.wait()
      
      setCreateStatus('success')
      
      // Auto redirect after success
      setTimeout(() => {
        window.location.href = '/'
      }, 3000)
      
    } catch (error: any) {
      console.error('Error creating raffle:', error)
      setCreateStatus('error')
      setCreateError(error.message || 'Failed to create raffle. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const summary = calculateSummary()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
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
          <h1 className="text-3xl font-bold text-white">Create Your Raffle</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div className="space-y-6">
            {/* Crypto Selection */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-center w-24 h-24 bg-blue-600 rounded-lg mx-auto mb-4">
                  <Image src="/eth-icon.svg" alt="ETH" width={48} height={48} className="text-white" />
                </div>
                <div className="text-center">
                  <h3 className="text-white font-bold">Crypto</h3>
                  <p className="text-gray-400 text-sm">ETH on Sepolia</p>
                </div>
              </CardContent>
            </Card>

            {/* Form Fields */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Raffle Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Raffle Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter raffle name"
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Description
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your raffle..."
                    className="bg-gray-700 border-gray-600 text-white"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Ticket Supply 🔍
                  </label>
                  <Input
                    type="number"
                    value={formData.totalTickets}
                    onChange={(e) => handleInputChange('totalTickets', parseInt(e.target.value) || 0)}
                    placeholder="Please Input"
                    className="bg-gray-700 border-gray-600 text-white mb-2"
                    min="2"
                    required
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickSelect(2)}
                      className="bg-gray-700 border-gray-600 text-white"
                    >
                      2X
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickSelect(10)}
                      className="bg-gray-700 border-gray-600 text-white"
                    >
                      10X
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickSelect(25)}
                      className="bg-gray-700 border-gray-600 text-white"
                    >
                      25X
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickSelect(50)}
                      className="bg-gray-700 border-gray-600 text-white"
                    >
                      50X
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickSelect(100)}
                      className="bg-gray-700 border-gray-600 text-white"
                    >
                      100X
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Ticket Price 🔍
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.ticketPrice}
                      onChange={(e) => handleInputChange('ticketPrice', e.target.value)}
                      placeholder="Please Input"
                      className="bg-gray-700 border-gray-600 text-white pr-16"
                      min="0"
                      required
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Image src="/eth-icon.svg" alt="ETH" width={16} height={16} className="inline" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Raffle End Date 🔍
                  </label>
                  <Input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 1)}
                    placeholder="Duration in hours"
                    className="bg-gray-700 border-gray-600 text-white"
                    min="1"
                    required
                  />
                  <div className="text-xs text-gray-400 mt-1">Duration in hours</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Guide & Summary */}
          <div className="space-y-6">
            {/* Guide */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">A Guide to Creating FHE Raffle:</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-300 text-sm">
                <div>
                  <h4 className="text-white font-medium">Set a reasonable price and supply.</h4>
                  <p>We suggest that creators price the total ticket volume up to 30% above the raffle value.</p>
                </div>
                
                <div>
                  <h4 className="text-white font-medium">Allow enough time to sell out the tickets.</h4>
                  <p>Give ample time for your raffle to sell out. High-value raffles are recommended to have longer durations.</p>
                </div>
                
                <div>
                  <h4 className="text-white font-medium">Be sure to inform your community.</h4>
                  <p>Promote your raffle and spread the word on social media and other relevant channels.</p>
                  <p>Once a ticket has been sold, raffles cannot be modified or revoked.</p>
                  <p>Attempting to purchase tickets for your own raffle using different wallets will be considered suspicious activity and will result in the removal of the raffle from all search results on our platform.</p>
                </div>
                
                <div className="text-blue-300">
                  FHE Raffle will take a 3% platform fee from the ticket sales, and you will earn 5% profit as the raffle creator. Your profit will be automatically transferred when the raffle ends.
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Ticket Volume</span>
                  <span className="text-white font-mono flex items-center gap-1">
                    {summary.totalVolume} <Image src="/eth-icon.svg" alt="ETH" width={16} height={16} className="inline" />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Prize Amount (95%)</span>
                  <span className="text-green-400 font-mono flex items-center gap-1">
                    {summary.prizeAmount} <Image src="/eth-icon.svg" alt="ETH" width={16} height={16} className="inline" />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Your Profit (5%)</span>
                  <span className="text-yellow-400 font-mono flex items-center gap-1">
                    {summary.creatorProfit} <Image src="/eth-icon.svg" alt="ETH" width={16} height={16} className="inline" />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Platform Fee (3%)</span>
                  <span className="text-white font-mono flex items-center gap-1">
                    {summary.commission} <Image src="/eth-icon.svg" alt="ETH" width={16} height={16} className="inline" />
                  </span>
                </div>
                <hr className="border-gray-600" />
                <div className="flex justify-between font-bold items-center">
                  <span className="text-gray-300">Total Cost</span>
                  <span className="text-white font-mono flex items-center gap-1">
                    {summary.totalCost} <Image src="/eth-icon.svg" alt="ETH" width={16} height={16} className="inline" />
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Terms and Submit */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6 space-y-4">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-gray-300 text-sm">
                    I accept the{' '}
                    <a href="#" className="text-blue-400 underline">
                      terms & conditions
                    </a>
                  </span>
                </label>

                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !acceptTerms}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {!walletState.isConnected 
                    ? 'Connect Wallet' 
                    : isSubmitting 
                    ? 'Creating Raffle...' 
                    : 'Create Raffle'
                  }
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full p-6">
            <div className="text-center space-y-4">
              {createStatus === 'sending' && (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <h3 className="text-xl font-semibold text-white">Creating Raffle</h3>
                  <p className="text-gray-300">Please confirm the transaction in your wallet...</p>
                </>
              )}
              
              {createStatus === 'confirming' && (
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
              
              {createStatus === 'success' && (
                <>
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Raffle Created Successfully!</h3>
                  <p className="text-gray-300">
                    Your raffle "{formData.name}" has been created and is now live!
                  </p>
                  <p className="text-sm text-gray-400">Redirecting to homepage...</p>
                </>
              )}
              
              {createStatus === 'error' && (
                <>
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Creation Failed</h3>
                  <p className="text-gray-300">{createError}</p>
                  <Button 
                    onClick={() => {
                      setShowCreateModal(false)
                      setIsSubmitting(false)
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
    </div>
  )
}