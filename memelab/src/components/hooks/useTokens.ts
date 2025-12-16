import { useMemelabProgram } from "./useMemelabProgram";
import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { fetchMetadata, findMetadataPda } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";

// Cache metadata to prevent refetching on every refresh
const metadataCache = new Map<string, { name: string; symbol: string; uri: string }>();

// The "Shape" of the data our UI needs
export interface TokenData {
  mint: string;
  name: string;      
  symbol: string;    
  uri: string;
  marketCap: number;
  price: number;
  virtualSolReserves: number;
  virtualTokenReserves: number;
  status: "ALPHA" | "LIVE" | "GRADUATED";
  progress: number;  // 0 to 100%
}

export const useTokens = () => {
  const { program } = useMemelabProgram();
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTokens = async () => {
      if (!program) return;

      try {
        setLoading(true);
        
        // 1. Fetch ALL Bonding Curve Accounts from the blockchain
        const programAny = program as any;
        const rawAccounts = await programAny.account.tokenBondingCurve.all();

        // Initialize Umi once for all metadata fetches
        const umi = createUmi(
          process.env.NEXT_PUBLIC_HELIUS_RPC_URL || "https://api.devnet.solana.com"
        );

        // 2. Format the Data (Convert "Big Numbers" to "Human Numbers")
        const formattedTokens: TokenData[] = [];
        const BATCH_SIZE = 1; // Process ONE token at a time to avoid 429 errors

        for (let i = 0; i < rawAccounts.length; i += BATCH_SIZE) {
          const batch = rawAccounts.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(batch.map(async (account: any) => {
            const data = account.account;
            
            // --- THE MATH SECTION ---
            
            // Step A: Clean up the reserves (Remove decimals)
            // 1 SOL = 1,000,000,000 Lamports
            // 1 Token = 1,000,000 Raw Units (6 decimals)
            const solReserves = data.virtualSolReserves.toNumber() / 1_000_000_000;
            const tokenReserves = data.virtualTokenReserves.toNumber() / 1_000_000;
            
            // Step B: Calculate Price (SOL per Token)
            // Price = SOL in Pot / Tokens in Pot
            const price = solReserves / tokenReserves;

            // Step C: Calculate Market Cap
            // Market Cap = Price * Total Supply (1 Billion)
            const marketCap = price * 1_000_000_000;

            // Step D: Calculate Progress (Graduation)
            // Graduation Target is usually ~85 SOL real liquidity
            const realSol = data.realSolReserves.toNumber() / 1_000_000_000;
            const targetSol = 85; 
            const progress = Math.min((realSol / targetSol) * 100, 100);

            // --- STATUS LOGIC ---
            // Check if still in Alpha phase (5 minutes after creation)
            const currentTime = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds
            const alphaEndTime = data.alphaPhaseEndTime.toNumber(); // Alpha phase end timestamp
            
            let status: "ALPHA" | "LIVE" | "GRADUATED" = "LIVE";
            
            // If current time is before alpha end time, it's still in ALPHA
            if (currentTime < alphaEndTime) {
              status = "ALPHA";
            }
            // If the token is marked complete, it's GRADUATED
            else if (data.isComplete === 1) {
              status = "GRADUATED";
            }
            // Otherwise it's LIVE (trading is open but not graduated yet)
            else {
              status = "LIVE";
            }

            // Fetch metadata with caching
            const mintAddress = data.tokenMint.toBase58();
            let name = "Unknown Token";
            let symbol = "???";
            let uri = "";

            // Check cache first
            if (metadataCache.has(mintAddress)) {
              const cached = metadataCache.get(mintAddress)!;
              name = cached.name;
              symbol = cached.symbol;
              uri = cached.uri;
            } else {
              // Only fetch if not in cache
              try {
                const mint = publicKey(mintAddress);
                const metadataPda = findMetadataPda(umi, { mint });
                const metadata = await fetchMetadata(umi, metadataPda);
                
                name = metadata.name || name;
                symbol = metadata.symbol || symbol;
                uri = metadata.uri || uri;
                
                // Cache the result
                metadataCache.set(mintAddress, { name, symbol, uri });
              } catch (e) {
                console.error(`Failed to fetch metadata for ${mintAddress}:`, e);
                // Cache the fallback to prevent retries
                metadataCache.set(mintAddress, { name, symbol, uri });
              }
            }

            return {
              mint: data.tokenMint.toBase58(),
              name,
              symbol,
              uri,
              marketCap,
              price,
              virtualSolReserves: solReserves,
              virtualTokenReserves: tokenReserves,
              status,
              progress
            };
          }));
          
          formattedTokens.push(...batchResults);
          
          // Add a small delay between batches to be nice to the RPC
          if (i + BATCH_SIZE < rawAccounts.length) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between each token
          }
        }

        // Sort by "Newest First" (Created At)
        // We might need to sort by `marketCap` later if you prefer
        setTokens(formattedTokens);

      } catch (e) {
        console.error("Error fetching tokens:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
    
    // Auto-refresh every 2 minutes to reduce rate limiting
    const interval = setInterval(fetchTokens, 120000); // 2 minutes
    return () => clearInterval(interval);

  }, [program]);

  return { tokens, loading };
};