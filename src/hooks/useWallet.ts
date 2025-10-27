import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { WalletState } from '../types';
import { fhevmProvider } from '../lib/fhevm';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    isLoading: true,
  });
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    try {
      console.log('🔗 Connecting wallet...');
      
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // CRITICAL FIX: Create a NEW provider instance to avoid cached RPC responses
      // This is the key - don't reuse the provider!
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Log provider creation
      console.log(`🏛️ Created fresh provider at ${Date.now()}`);
      
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Force fresh balance query
      const balance = await provider.getBalance(address, 'latest');
      const network = await provider.getNetwork();
      
      console.log(`✅ Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
      console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
      console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);

      setProvider(provider);
      setSigner(signer);
      
      // Initialize FHEVM after wallet connection
      try {
        await fhevmProvider.initialize();
        console.log('FHEVM initialized successfully');
      } catch (error) {
        console.error('Failed to initialize FHEVM:', error);
        // Continue with wallet connection even if FHEVM fails
      }

      setWalletState({
        isConnected: true,
        isLoading: false,
        address,
        balance: ethers.formatEther(balance),
        chainId: Number(network.chainId),
      });

      // Check if we're on the correct network (Sepolia testnet)
      if (Number(network.chainId) !== 11155111) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia chainId in hex (11155111)
          });
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0xaa36a7',
                    chainName: 'Sepolia test network',
                    nativeCurrency: {
                      name: 'SepoliaETH',
                      symbol: 'SEP',
                      decimals: 18,
                    },
                    rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
                    blockExplorerUrls: ['https://sepolia.etherscan.io'],
                  },
                ],
              });
            } catch (addError) {
              console.error('Failed to add Sepolia network:', addError);
            }
          } else {
            console.error('Failed to switch to Sepolia network:', switchError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setWalletState({ isConnected: false, isLoading: false });
    setProvider(null);
    setSigner(null);
  };

  // Check if already connected
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            console.log('🔗 Auto-connecting wallet on mount...');
            await connectWallet();
          } else {
            setWalletState({ isConnected: false, isLoading: false });
          }
        } catch (error) {
          console.error('Failed to check wallet connection:', error);
          setWalletState({ isConnected: false, isLoading: false });
        }
      } else {
        setWalletState({ isConnected: false, isLoading: false });
      }
    };

    checkConnection();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        console.log('🔄 Account changed, reconnecting...');
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          // Force fresh connection
          connectWallet();
        }
      });

      window.ethereum.on('chainChanged', () => {
        console.log('🔄 Chain changed, reloading page...');
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  return {
    walletState,
    provider,
    signer,
    connectWallet,
    disconnectWallet,
  };
};