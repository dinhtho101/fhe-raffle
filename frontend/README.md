# Raffle DApp Frontend

Next.js 15 frontend for the FHEVM v0.9 Privacy-Preserving Raffle Platform.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Build for Production

```bash
npm run build
npm start
```

## Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x88e7DBDbe5DEc2041fB859606D42D8980FeE3D2c
NEXT_PUBLIC_NETWORK_ID=11155111
NEXT_PUBLIC_NETWORK_NAME=sepolia
```

## Features

- Create raffles with encrypted ticket counts
- Buy tickets with privacy (FHEVM encryption)
- Self-relaying decryption workflow
- MetaMask integration
- Real-time raffle updates

## Tech Stack

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- FHEVM v0.9
- Ethers.js v6
