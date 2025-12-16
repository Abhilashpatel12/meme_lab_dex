'use client'
import { useTokens } from "@/components/hooks/useTokens";
import { useTokenMetadata } from "@/components/hooks/useTokenMetadata";
import { RadioactiveCard } from "../elements/TokenCard";
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export const TokenGrid = () => {
  const { tokens, loading } = useTokens();
  const [activeFilter, setActiveFilter] = useState<'all' | 'alpha' | 'live' | 'graduated'>('all');

  // 1. FILTER: Split tokens by their actual status
  const alphaTokens = tokens.filter(t => t.status === "ALPHA");
  const liveTokens = tokens.filter(t => t.status === "LIVE");
  const graduatedTokens = tokens.filter(t => t.status === "GRADUATED");

  if (loading) {
     return <div className="text-center py-20 text-lab-green animate-pulse font-mono">SCANNING BLOCKCHAIN...</div>;
  }

  if (tokens.length === 0) {
     return <div className="text-center py-20 text-lab-muted font-mono">NO SPECIMENS FOUND.</div>;
  }

  return (
    <div className="space-y-8 p-4">
      
      {/* Filter Buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all ${
            activeFilter === 'all'
              ? 'bg-lab-green text-white shadow-[0_0_20px_rgba(74,222,128,0.3)]'
              : 'bg-lab-input text-white/60 hover:text-white hover:border-lab-green/50 border border-lab-input'
          }`}
        >
          🔬 All
        </button>
        <button
          onClick={() => setActiveFilter('alpha')}
          className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all ${
            activeFilter === 'alpha'
              ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]'
              : 'bg-lab-input text-white/60 hover:text-white hover:border-yellow-500/50 border border-lab-input'
          }`}
        >
          ⚡ Alpha
        </button>
        <button
          onClick={() => setActiveFilter('live')}
          className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all ${
            activeFilter === 'live'
              ? 'bg-lab-green text-black shadow-[0_0_20px_rgba(74,222,128,0.3)]'
              : 'bg-lab-input text-white/60 hover:text-white hover:border-lab-green/50 border border-lab-input'
          }`}
        >
          🔴 Live
        </button>
        <button
          onClick={() => setActiveFilter('graduated')}
          className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all ${
            activeFilter === 'graduated'
              ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]'
              : 'bg-lab-input text-white/60 hover:text-white hover:border-blue-500/50 border border-lab-input'
          }`}
        >
          🎓 Graduated
        </button>
      </div>

      {/* --- SECTION 1: ALPHA VAULT (5-Minute Window) --- */}
      {(activeFilter === 'all' || activeFilter === 'alpha') && alphaTokens.length > 0 && (
      <section>
        <div className="flex items-center gap-3 mb-6">
           <div className="h-3 w-3 bg-yellow-500 rounded-full animate-ping" />
           <h2 className="text-2xl font-black text-white tracking-tighter font-mono">
             ALPHA <span className="text-yellow-500">VAULT</span>
           </h2>
           <span className="text-xs font-mono text-lab-muted border border-lab-muted/30 px-2 py-1 rounded bg-black/50">
             RISK: CRITICAL • 5 MIN WINDOW
           </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {alphaTokens.map((token) => (
            <TokenCard key={token.mint} token={token} variant="alpha" />
          ))}
        </div>
      </section>
      )}

      {/* --- SECTION 2: LIVE TRADING (Active Market) --- */}
      {(activeFilter === 'all' || activeFilter === 'live') && liveTokens.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6 border-t border-lab-input/30 pt-10">
             <div className="h-3 w-3 bg-lab-green rounded-full shadow-[0_0_10px_#4ade80]" />
             <h2 className="text-2xl font-black text-white tracking-tighter font-mono">
               LIVE <span className="text-lab-green">TRADING</span>
             </h2>
             <span className="text-xs font-mono text-lab-green/70 border border-lab-green/30 px-2 py-1 rounded bg-lab-green/10">
               STATUS: ACTIVE
             </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {liveTokens.map((token) => (
              <TokenCard key={token.mint} token={token} variant="live" />
            ))}
          </div>
        </section>
      )}

      {/* --- SECTION 3: GRADUATED (Success Stories) --- */}
      {(activeFilter === 'all' || activeFilter === 'graduated') && graduatedTokens.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6 border-t border-lab-input/30 pt-10">
             <div className="h-3 w-3 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
             <h2 className="text-2xl font-black text-white tracking-tighter font-mono">
               GRADUATED <span className="text-blue-500">PROTOCOLS</span>
             </h2>
             <span className="text-xs font-mono text-blue-500/70 border border-blue-500/30 px-2 py-1 rounded bg-blue-500/10">
               STATUS: COMPLETED
             </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {graduatedTokens.map((token) => (
              <TokenCard key={token.mint} token={token} variant="graduated" />
            ))}
          </div>
        </section>
      )}

    </div>
  );
};

// Sub-component for individual cards
const TokenCard = ({ token, variant }: { token: any, variant: 'alpha' | 'live' | 'graduated' }) => {
  // Fetch metadata with image
  const { metadata } = useTokenMetadata(token.mint, {
    name: token.name,
    symbol: token.symbol,
    uri: token.uri
  });

  const image = metadata?.image || "";

  return (
    <Link href={`/token/${token.mint}`}>
      <RadioactiveCard variant={variant === 'live' ? 'alpha' : variant} className="h-full hover:-translate-y-1 transition-transform cursor-pointer">
        {/* Header Image */}
        <div className="relative aspect-square w-full mb-4 rounded-lg overflow-hidden bg-black border border-white/5">
          {image ? (
              <Image 
                src={image} 
                alt={token.name} 
                fill 
                className="object-cover group-hover:scale-110 transition-transform duration-500" 
              />
          ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">☢️</div>
          )}
        
        {/* Status Badge */}
        {token.status === 'ALPHA' && (
          <div className="absolute top-2 right-2">
              <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded font-mono shadow-lg">ALPHA</span>
          </div>
        )}
        {token.status === 'LIVE' && (
          <div className="absolute top-2 right-2">
              <span className="bg-lab-green text-black text-[10px] font-bold px-2 py-1 rounded font-mono shadow-lg">LIVE</span>
          </div>
        )}
        {token.status === 'GRADUATED' && (
          <div className="absolute top-2 right-2">
              <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded font-mono shadow-lg">GRADUATED</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1">
        <h3 className="font-bold text-white text-lg truncate font-mono">{token.name}</h3>
        <p className="text-xs text-lab-muted font-mono truncate">ID: {token.mint.slice(0, 8)}...</p>
        
        <div className="flex justify-between items-end mt-4 pt-4 border-t border-white/10">
           <div className="flex flex-col">
             <span className="text-[10px] text-lab-muted font-mono uppercase">Market Cap</span>
             <span className={`font-bold font-mono ${variant === 'alpha' ? 'text-lab-green' : 'text-blue-400'}`}>
                {token.marketCap} SOL
             </span>
           </div>
           
           {/* Progress % Text */}
           {variant === 'alpha' && (
             <div className="text-right">
                <span className="text-[10px] text-lab-muted font-mono">{Math.min(token.progress || 0, 100).toFixed(1)}%</span>
             </div>
           )}
        </div>
        
        {/* Visual Progress Bar (Only for Alpha) */}
        {variant === 'alpha' && (
            <div className="w-full h-1 bg-gray-800 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-lab-green shadow-[0_0_10px_#22c55e]" 
                  style={{ width: `${token.progress || 0}%` }} 
                />
            </div>
        )}
      </div>
    </RadioactiveCard>
  </Link>
  );
};