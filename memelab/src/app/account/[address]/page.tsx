'use client';

import { useParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useMemelabProgram } from '@/components/hooks/useMemelabProgram';
import { useConnection } from '@solana/wallet-adapter-react';
import { Navbar } from '@/components/ui/Navbar';

export default function ProfilePage() {
  const params = useParams();
  const address = params.address as string;
  const { connection } = useConnection(); // Use wallet adapter's connection
  
  const [balance, setBalance] = useState<number>(0);
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!connection || !address) return;
      
      try {
        const pubKey = new PublicKey(address);

        // 1. Get SOL Balance
        const bal = await connection.getBalance(pubKey);
        setBalance(bal / LAMPORTS_PER_SOL);

        // 2. Get All Token Accounts
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
          programId: TOKEN_PROGRAM_ID,
        });

        const items = tokenAccounts.value.map((item) => {
           const info = item.account.data.parsed.info;
           return {
             mint: info.mint,
             amount: info.tokenAmount.uiAmount,
             decimals: info.tokenAmount.decimals,
           };
        }).filter(t => t.amount > 0); // Hide empty accounts

        setTokens(items);
      } catch (e) {
        console.error("Profile load failed:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [connection, address]);

  return (
    <div className="min-h-screen bg-lab-dark bg-[url('/grid-pattern.svg')]">
      <div className="max-w-5xl mx-auto px-6 py-24">
        
        {/* Header */}
        <div className="bg-lab-card border border-lab-input rounded-2xl p-8 mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white font-mono mb-2">OPERATOR PROFILE</h1>
            <p className="text-lab-green font-mono">{address}</p>
          </div>
          <div className="text-right">
             <p className="text-xs text-lab-muted font-mono uppercase">Current Balance</p>
             <p className="text-4xl font-bold text-white">{balance.toFixed(4)} SOL</p>
          </div>
        </div>

        {/* Token Inventory */}
        <h2 className="text-xl font-bold text-white mb-6 font-mono border-b border-lab-input pb-2">
          INVENTORY ({tokens.length})
        </h2>

        {loading ? (
          <div className="text-lab-green animate-pulse">SCANNING BLOCKCHAIN...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens.map((token) => (
              <div key={token.mint} className="bg-black/50 border border-lab-input p-4 rounded-xl flex items-center gap-4 hover:border-lab-green transition-colors">
                <div className="w-10 h-10 rounded-full bg-lab-input flex items-center justify-center text-xs">
                  💊
                </div>
                <div>
                   <p className="text-white font-bold text-lg">{token.amount.toLocaleString()}</p>
                   <p className="text-xs text-gray-500 font-mono truncate w-32">Mint: {token.mint.slice(0,6)}...</p>
                </div>
                <a href={`/token/${token.mint}`} className="ml-auto text-xs bg-lab-green text-black px-2 py-1 rounded font-bold hover:bg-white">
                  TRADE
                </a>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
