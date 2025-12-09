'use client'

import { ReactNode } from 'react'
import { WagmiConfig, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { createPublicClient, http } from 'viem'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http()
})

const config = createConfig({
  autoConnect: true,
  publicClient,
})

const queryClient = new QueryClient()

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
        {children}
      </WagmiConfig>
    </QueryClientProvider>
  )
}