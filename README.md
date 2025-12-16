# ☢️ MEMELAB - Solana Memecoin Launchpad

Memelab is a decentralized "Pump.fun-style" launchpad built on Solana. It allows users to launch memecoins instantly with a bonding curve mechanism, ensuring fair distribution and automated liquidity migration.

The project features a "Radioactive/Cyberpunk" aesthetic, real-time trading charts, and secure server-side metadata uploads to Arweave.

## ⚡ Key Features

🧪 **Alpha Vault**: New tokens launch on a bonding curve. Prices increase mathematically as people buy.

🎓 **Graduation System**: Once market cap hits the target (e.g., 60 SOL), liquidity is automatically migrated to Raydium (Mock logic implemented).

☁️ **Decentralized Storage**: Images and metadata are permanently stored on Arweave using Irys (Bundlr).

📈 **Live Trading Charts**: TradingView-style charts powered by Lightweight Charts, updated via Solana Websockets (Zero-polling).

🛡️ **Secure Uploads**: Server-side API route handles private keys for uploads, preventing browser security leaks.

⚡ **Helius Integration**: Optimized RPC usage with rate-limit protection and Websocket listeners.

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (Turbopack), React, Tailwind CSS
- **Blockchain**: Solana (Devnet), Web3.js
- **Smart Contracts**: Rust, Anchor Framework
- **Storage**: Arweave (via @irys/sdk)
- **Indexing**: Helius RPC & Websockets
- **Charts**: Lightweight Charts (v5)

## 🚀 Getting Started

### 1. Prerequisites

Ensure you have the following installed:

- Node.js (v18 or later)
- Solana CLI (optional, for contract work)
- Phantom Wallet (Browser Extension)

### 2. Clone & Install

```bash
git clone https://github.com/Abhilashpatel12/meme_lab_dex.git
cd meme_lab_dex
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory. This keeps your API keys secure.

```env
# 1. Solana RPC (Get free key from Helius.dev)
NEXT_PUBLIC_HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY
NEXT_PUBLIC_HELIUS_WSS_URL=wss://devnet.helius-rpc.com/?api-key=YOUR_API_KEY

# 2. Server Wallet for Uploads (Export Private Key from Phantom -> Array format)
# This wallet pays the tiny fee to store images on Arweave.
SERVER_PRIVATE_KEY=[123, 23, 55, 12, ...] 
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📂 Project Structure

```
memelab/
├── src/
│   ├── app/
│   │   ├── api/upload/route.ts  # 🔒 Secure Server-Side Image Uploader
│   │   ├── token/[mint]/page.tsx # Token Detail View (Chart + Trade)
│   │   └── page.tsx             # Home (Alpha Vault / Graduated List)
│   ├── components/
│   │   ├── elements/            # Core Widgets (TokenGrid, TradeForm, Chart)
│   │   ├── ui/                  # Reusable UI (RadioactiveCard, Buttons)
│   │   └── hooks/               # Logic (useTokens, useChartData)
│   └── program/                 # IDL and Types for Smart Contract
├── public/
└── next.config.ts               # Config for Irys/Arweave handling
```

## 🐛 Common Issues & Fixes

### 1. "Server responded with 429" (Rate Limit)

- **Cause**: You are polling the public RPC too fast.
- **Fix**: We implemented Websockets in `useChartData.ts` to listen for events instead of polling. Ensure `NEXT_PUBLIC_HELIUS_WSS_URL` is set.

### 2. "Module not found: fs"

- **Cause**: The browser tried to access the file system (Node.js only).
- **Fix**: We moved image uploading logic to `src/app/api/upload/route.ts`. Never import `@irys/sdk` directly in a Client Component.

### 3. "CSV Parse / Export Default Error"

- **Cause**: Next.js Turbopack compatibility issue with some crypto libraries.
- **Fix**: Already handled in `next.config.ts` via `serverExternalPackages`.

## 📜 License

This project is for educational purposes.

⚠️ **Warning**: Memecoins and Bonding Curves involve high financial risk. Use on Devnet for testing.