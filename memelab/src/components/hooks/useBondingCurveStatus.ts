import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useMemelabProgram } from './useMemelabProgram';

export const useBondingCurveStatus = (mintAddress: string) => {
  const { program } = useMemelabProgram();
  const [isLive, setIsLive] = useState(false);
  const [endTime, setEndTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!program || !mintAddress) return;

    const fetchStatus = async () => {
      try {
        const mint = new PublicKey(mintAddress);
        const [bondingCurve] = PublicKey.findProgramAddressSync(
          [Buffer.from("bonding_curve"), mint.toBuffer()],
          program.programId
        );

        const account: any = await (program.account as any).tokenBondingCurve.fetch(bondingCurve);
        
        // ✅ FIX 1: Map 'trading_live' (0 or 1) to boolean
        const live = Number(account.tradingLive) === 1; 
        
        // ✅ FIX 2: Use the CORRECT field name from your Rust struct
        // Rust: alpha_phase_end_time -> JS: alphaPhaseEndTime
        const endSeconds = Number(account.alphaPhaseEndTime); 

        setIsLive(live);
        setEndTime(isNaN(endSeconds) ? 0 : endSeconds * 1000); // Convert to ms

      } catch (e) {
        console.error("Failed to fetch curve status", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);

  }, [program, mintAddress]);

  return { isLive, endTime, isLoading };
};