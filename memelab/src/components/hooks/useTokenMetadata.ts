'use client';
import { useState, useEffect } from "react";
import { fetchMetadata, findMetadataPda } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";

interface TokenMetadata {
  name: string;
  symbol: string;
  image: string;
}

// Cache to prevent duplicate requests
const metadataCache = new Map<string, TokenMetadata>();

export const useTokenMetadata = (mintAddress: string, initialData?: { name: string, symbol: string, uri: string }) => {
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokenMetadata = async () => {
      if (!mintAddress) {
        setLoading(false);
        return;
      }

      // Check cache first
      if (metadataCache.has(mintAddress)) {
        setMetadata(metadataCache.get(mintAddress)!);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let name = "Unknown";
        let symbol = "???";
        let uri = "";

        if (initialData) {
          name = initialData.name;
          symbol = initialData.symbol;
          uri = initialData.uri;
        } else {
          // Initialize Umi
          const umi = createUmi(
            process.env.NEXT_PUBLIC_HELIUS_RPC_URL || "https://api.devnet.solana.com"
          );

          const mint = publicKey(mintAddress);
          
          // 1. Find the Metadata PDA
          const metadataPda = findMetadataPda(umi, { mint });

          // CHECK existence first (production-grade): use RPC to avoid throwing on missing accounts
          let accountExists = true;
          try {
            // metadataPda is a Pda tuple [PublicKey, bump], extract the PublicKey
            const accountInfo = await umi.rpc.getAccount(metadataPda[0]);
            if (!accountInfo?.exists) accountExists = false;
          } catch (err) {
            // If the RPC call fails, fall back to attempting to fetch metadata
            console.warn('Could not check metadata account existence, will attempt fetch:', err);
          }

          // 2. Fetch on-chain metadata (name, symbol) ONLY if the account exists
          if (!accountExists) {
            const fallback = {
              name: "Unknown Token",
              symbol: "???",
              image: ""
            };
            metadataCache.set(mintAddress, fallback);
            setMetadata(fallback);
            setLoading(false);
            return;
          }

          const account = await fetchMetadata(umi, metadataPda);
          name = account.name;
          symbol = account.symbol;
          uri = account.uri;
        }
        
        let imageUri = "";

        // 3. Fetch off-chain JSON with timeout
        if (uri) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(uri, {
              headers: { "Accept": "application/json" },
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const json = await response.json();
                imageUri = json.image || imageUri;
              }
            }
          } catch (err) {
            console.warn("Could not fetch image URI:", err);
          }
        }

        const result = {
          name: name || "Unknown",
          symbol: symbol || "???",
          image: imageUri
        };

        // Cache the result
        metadataCache.set(mintAddress, result);
        setMetadata(result);

      } catch (e: any) {
        console.error("❌ Metadata fetch failed:", e);
        setError(e.message || "Failed to fetch metadata");
        
        const fallback = {
          name: "Unknown Token",
          symbol: "???",
          image: ""
        };
        
        metadataCache.set(mintAddress, fallback);
        setMetadata(fallback);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenMetadata();
  }, [mintAddress, initialData]);

  return { metadata, loading, error };
};
