"use client";

import React, { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
// import { UnsafeBurnerWalletAdapter } from "@solana/wallet-adapter-wallets"; // Optional

import "@solana/wallet-adapter-react-ui/styles.css";

export default function AppWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Set the Network to Devnet
  const network = WalletAdapterNetwork.Devnet;

  // 2. Set the RPC Endpoint (Use Helius if you have it, otherwise standard Devnet)
  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_HELIUS_RPC_URL) {
      return process.env.NEXT_PUBLIC_HELIUS_RPC_URL;
    }
    return clusterApiUrl(network);
  }, [network]);

  // 3. Define the Wallets you want to support
  const wallets = useMemo(
    () => [
      // Add specific wallets here if needed, or leave empty for standard support
      // new UnsafeBurnerWalletAdapter(),
    ],
    [network]
  );

  // Connection config to reduce RPC calls
  const config = useMemo(
    () => ({
      commitment: 'confirmed' as const,
      confirmTransactionInitialTimeout: 60000,
    }),
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint} config={config}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
            {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}