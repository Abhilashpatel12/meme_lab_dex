'use client';

import { useParams } from 'next/navigation';
import { useTokenMetadata } from '@/components/hooks/useTokenMetadata';
import { useTokens } from '@/components/hooks/useTokens';
import { TokenChart } from '@/components/elements/TokenChart';
import { TradeForm } from '@/components/elements/TradeForm';

export default function TokenDetailPage() {
  const params = useParams();
  const mintAddress = params.mint as string;
  
  const { metadata, loading } = useTokenMetadata(mintAddress);
  const { tokens } = useTokens();
  const price = tokens.find((t) => t.mint === mintAddress)?.price ?? 0;

  return (
    <div className="min-h-screen bg-lab-dark bg-[url('/grid-pattern.svg')]">
      
      {/* 1. Header Info */}
      <div className="pt-24 pb-8 px-4 max-w-7xl mx-auto border-b border-lab-input/30 mb-8">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
          
          <div className="w-20 h-20 rounded-xl border-2 border-lab-green shadow-[0_0_20px_rgba(74,222,128,0.2)] overflow-hidden bg-black">
            {metadata?.image ? (
              <img src={metadata.image} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-xs text-neutral-500">No Image</div>
            )}
          </div>

          <div>
            <h1 className="text-3xl md:text-5xl font-black text-white font-mono uppercase tracking-tighter">
              {metadata?.name || "LOADING..."} 
              <span className="text-lab-green ml-3 text-xl md:text-3xl opacity-80">
                ${metadata?.symbol || "..."}
              </span>
            </h1>
            <div className="flex gap-4 mt-3">
               <span className="text-xs font-mono bg-lab-input/50 px-3 py-1 rounded text-lab-green border border-lab-green/30">
                 CA: {mintAddress.slice(0,6)}...{mintAddress.slice(-6)}
               </span>
               <span className="text-xs font-mono bg-lab-input/50 px-3 py-1 rounded text-lab-purple border border-lab-purple/30">
                 CREATOR: 8x2P...9sLq
               </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Layout Grid */}
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        
        {/* LEFT: Chart Area */}
        <div className="lg:col-span-2 bg-lab-card border border-lab-input rounded-2xl h-[500px] md:h-[600px] overflow-hidden shadow-2xl relative">
           <div className="absolute top-4 left-4 z-10 flex gap-2">
             <span className="text-xs font-mono text-lab-green">● LIVE FEED</span>
           </div>
           {/* The Real Chart */}
           <TokenChart mint={mintAddress} />
        </div>

        {/* RIGHT: Trading Panel */}
        <div>
           <TradeForm mint={mintAddress} />
        </div>

      </div>
    </div>
  );
}