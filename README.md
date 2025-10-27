# FHE Raffle DApp - Privacy-Preserving Blockchain Raffles

A decentralized raffle platform powered by **FHEVM (Fully Homomorphic Encryption Virtual Machine)**, enabling privacy-preserving raffles on Ethereum.

## 🔐 Features

- **Fully Encrypted Raffles**: Ticket purchases and participant data encrypted using FHEVM
- **Privacy-First**: Participant identities and ticket counts remain private until raffle ends
- **Transparent & Fair**: Smart contract-based winner selection with verifiable randomness
- **Decentralized**: No central authority, all logic executed on-chain
- **Modern UI**: Built with Next.js 15, React, and Tailwind CSS
- **MetaMask Integration**: Seamless wallet connection and transaction signing

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- MetaMask wallet extension
- Sepolia testnet ETH (for testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd production-deploy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your configuration:
   ```env
   NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address
   NEXT_PUBLIC_NETWORK_ID=11155111
   NEXT_PUBLIC_NETWORK_NAME=sepolia
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser

5. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## 📦 Deployment

### Deploy to Vercel

1. **Push to Git**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your Git repository
   - Vercel will auto-detect Next.js

3. **Add Environment Variables**
   In Vercel dashboard, add:
   ```
   NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address
   NEXT_PUBLIC_NETWORK_ID=11155111
   NEXT_PUBLIC_NETWORK_NAME=sepolia
   ```

4. **Deploy**
   - Vercel will automatically deploy
   - Your app will be live at `https://your-app.vercel.app`

## 🔧 Technology Stack

### Frontend
- **Next.js 15.0**: React framework with App Router
- **React 18**: UI library
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library

### Blockchain
- **FHEVM v0.9**: Fully Homomorphic Encryption
- **Ethers.js v6**: Ethereum interaction
- **Wagmi**: React hooks for Ethereum
- **Web3Modal**: Wallet connection

### FHEVM Libraries
- `@fhevm/solidity` (v0.9.0-1): Solidity contracts with FHE
- `fhevm` (v0.7.0-0): Core FHEVM library
- `fhevmjs` (v0.7.0-7): JavaScript SDK
- `@zama-fhe/relayer-sdk` (v0.3.0-3): Relayer integration

## 📋 Smart Contract

### Contract Address
```
Sepolia Testnet: 0x08c182B73eBC3a858E763Dae7A550AdcBF541512
```

### Contract Features
- Create encrypted raffles with custom parameters
- Buy tickets with encrypted ticket counts
- Automatic winner selection using verifiable randomness
- Prize distribution to winners
- Refund mechanism for unsold tickets
- Creator profit sharing

### Key Functions
- `createRaffleEncrypted()`: Create a new encrypted raffle
- `buyTicketsFHE()`: Purchase tickets with FHE encryption
- `buyTicketsEncrypted()`: Alternative encrypted ticket purchase
- `endRaffle()`: End raffle and select winner
- `claimPrize()`: Winner claims prize
- `claimRefund()`: Creator claims refund for unsold tickets

## 🎮 User Guide

### For Raffle Creators

1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask
2. **Create Raffle**: 
   - Navigate to "Create Raffle"
   - Fill in raffle details (name, description, prize, tickets, duration)
   - Approve transaction
3. **Monitor**: View your raffle on the dashboard
4. **Claim**: After raffle ends, claim creator profit or refund

### For Participants

1. **Connect Wallet**: Connect your MetaMask wallet
2. **Browse Raffles**: View active raffles on homepage
3. **Buy Tickets**: 
   - Select a raffle
   - Choose number of tickets
   - Approve transaction
4. **Check Status**: View your participations in profile
5. **Claim Prize**: If you win, claim your prize

## 🔒 Privacy Features

### FHEVM Integration
All sensitive data is encrypted using Fully Homomorphic Encryption:
- Ticket purchase counts
- Participant identities
- Total sold tickets (until raffle ends)
- Random seed for winner selection

### How It Works
1. Users encrypt their ticket purchase data client-side
2. Encrypted data is sent to smart contract
3. Contract performs computations on encrypted data
4. Winner is selected without revealing intermediate data
5. Results are decrypted only when necessary

## 🛠️ Development

### Project Structure
```
production-deploy/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── create/       # Create raffle page
│   │   ├── fhe/          # FHE test page
│   │   ├── profile/      # User profile
│   │   └── raffle/[id]/  # Individual raffle page
│   ├── components/       # React components
│   │   ├── ui/           # UI components
│   │   └── ...           # Dashboard components
│   ├── contracts/        # Smart contract ABIs
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries
│   └── types/            # TypeScript types
├── public/               # Static assets
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── tailwind.config.js    # Tailwind config
```

### Available Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed contract address | Yes |
| `NEXT_PUBLIC_NETWORK_ID` | Network chain ID (11155111 for Sepolia) | Yes |
| `NEXT_PUBLIC_NETWORK_NAME` | Network name (sepolia) | Yes |
| `NEXT_PUBLIC_RPC_URL` | Custom RPC endpoint | No |

## 🔍 Testing

### Test on Sepolia Testnet

1. **Get Sepolia ETH**
   - Visit [Sepolia Faucet](https://sepoliafaucet.com/)
   - Request test ETH

2. **Configure MetaMask**
   - Add Sepolia network to MetaMask
   - Switch to Sepolia network

3. **Test Features**
   - Create a test raffle
   - Buy tickets from different accounts
   - Wait for raffle to end
   - Test prize claiming

## 📊 Performance

- **Lightning Fast**: Next.js 15 with optimized rendering
- **SEO Optimized**: Server-side rendering for better SEO
- **Mobile Responsive**: Works seamlessly on all devices
- **Gas Efficient**: Optimized smart contract for lower fees

## 🔐 Security

- **Audited Smart Contracts**: Using OpenZeppelin libraries
- **Encrypted Data**: FHEVM ensures data privacy
- **Reentrancy Protection**: Safe against reentrancy attacks
- **Access Control**: Role-based permissions

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions:
- Create an issue in the GitHub repository
- Check existing documentation
- Review FHEVM documentation at [docs.zama.ai](https://docs.zama.ai)

## 🔗 Links

- **Zama FHEVM**: https://docs.zama.ai
- **Sepolia Explorer**: https://sepolia.etherscan.io
- **Contract**: https://sepolia.etherscan.io/address/0x08c182B73eBC3a858E763Dae7A550AdcBF541512

## 🎯 Roadmap

- [ ] Mainnet deployment
- [ ] Multiple network support
- [ ] Enhanced privacy features
- [ ] Mobile app
- [ ] Advanced raffle types
- [ ] NFT prize support

---

**Built with ❤️ using FHEVM and Next.js**

