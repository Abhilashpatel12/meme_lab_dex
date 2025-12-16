import { useEffect, useState, useRef, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { useMemelabProgram } from './useMemelabProgram'; 

export interface ChartData {
  time: number; 
  value: number; 
}

export const useChartData = (mintAddress: string) => {
  const [data, setData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { program } = useMemelabProgram();
  
  // Ref to keep track of the latest data without triggering re-renders
  const currentDataRef = useRef<ChartData[]>([]);

  useEffect(() => {
    if (!mintAddress || !program) return;

    const connection = new Connection(
       process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.devnet.solana.com',
       { wsEndpoint: process.env.NEXT_PUBLIC_HELIUS_WSS_URL } // Optional: Custom WSS URL
    );
    
    const mint = new PublicKey(mintAddress);
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), mint.toBuffer()],
      program.programId
    );

    // --- PART 1: FETCH HISTORY (Run Only Once) ---
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const signatures = await connection.getSignaturesForAddress(bondingCurve, { limit: 50 });
        const signatureList = signatures.map(s => s.signature);
        
        if (signatureList.length === 0) {
            setIsLoading(false);
            return;
        }

        const txs = await connection.getParsedTransactions(signatureList, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed'
        });

        const points: ChartData[] = [];
        
        // Regex to parse your Rust logs
        const buyRegex = /Bought (\d+) tokens for ([\d.]+) SOL/;
        const sellRegex = /Sold (\d+) tokens for ([\d.]+) SOL/;

        txs.reverse().forEach(tx => {
           if (!tx?.meta?.logMessages || !tx.blockTime) return;
           
           tx.meta.logMessages.forEach(log => {
             let match = log.match(buyRegex) || log.match(sellRegex);
             if (match) {
               const tokens = parseFloat(match[1]);
               const sol = parseFloat(match[2]);
               if (tokens > 0) {
                 points.push({ time: tx.blockTime!, value: sol / tokens });
               }
             }
           });
        });

        currentDataRef.current = points;
        setData(points);
      } catch (e) {
        console.error("History fetch failed:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();

    // --- PART 2: LISTEN FOR LIVE UPDATES (0 API Credits) ---
    // This subscription pushes data to us ONLY when a trade happens.
    const subscriptionId = connection.onLogs(
      bondingCurve,
      (logs) => {
        if (logs.err) return; // Ignore failed transactions

        const now = Math.floor(Date.now() / 1000);
        const buyRegex = /Bought (\d+) tokens for ([\d.]+) SOL/;
        const sellRegex = /Sold (\d+) tokens for ([\d.]+) SOL/;

        logs.logs.forEach(log => {
           let match = log.match(buyRegex) || log.match(sellRegex);
           if (match) {
             const tokens = parseFloat(match[1]);
             const sol = parseFloat(match[2]);
             
             if (tokens > 0) {
               const newPoint = { time: now, value: sol / tokens };
               
               // Optimistically update the chart
               currentDataRef.current = [...currentDataRef.current, newPoint];
               
               // Sort to be safe and update state
               setData(prev => [...prev, newPoint].sort((a, b) => a.time - b.time));
             }
           }
        });
      },
      "confirmed"
    );

    // Cleanup: Unsubscribe when component unmounts
    return () => {
      connection.removeOnLogsListener(subscriptionId);
    };

  }, [mintAddress, program]);

  return { data, isLoading };
};