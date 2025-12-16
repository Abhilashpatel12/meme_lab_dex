import { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { LabButton } from '../ui/LabButton';
import { LabInput } from '../ui/LabInput';
import { useBuyTokens } from '../hooks/useBuyTokens';
import { useSellTokens } from '../hooks/useSellTokens';
import { useDepositAlpha } from '../hooks/useDepositAlpha';
import { useClaimAlpha } from '../hooks/useClaimAlpha';
import { useBondingCurveStatus } from '../hooks/useBondingCurveStatus';

interface Props {
  mint: string;
}

export const TradeForm = ({ mint }: Props) => {
  const [mode, setMode] = useState<'BUY' | 'SELL' | 'ALPHA'>('ALPHA'); 
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState<string>("00:00");

  // Hooks
  const { buy } = useBuyTokens();
  const { sell } = useSellTokens();
  const { depositAlpha } = useDepositAlpha();
  const { claimAlpha } = useClaimAlpha();
  
  // Real-time Blockchain Status
  const { isLive, endTime, isLoading: isStatusLoading } = useBondingCurveStatus(mint);

  // --- DERIVE PHASE FROM BLOCKCHAIN & TIMER ---
  const timeIsUp = useMemo(() => {
    const now = Date.now();
    const validEndTime = (!endTime || isNaN(endTime)) ? 0 : endTime;
    return validEndTime > 0 && validEndTime <= now;
  }, [endTime]);

  // Use the time status (timeIsUp) to control the UI lock/unlock
  const phaseIsLive = isLive || timeIsUp;
  const phaseDisplay = isLive ? 'LIVE' : (timeIsUp ? 'FINALIZED' : 'LOCKED');


  // --- TIMER LOGIC ---
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const validEndTime = (!endTime || isNaN(endTime)) ? 0 : endTime;
      const diff = validEndTime - now;

      if (isLive) {
        setTimeLeft("TRADING LIVE");
      } else if (validEndTime > 0 && diff <= 0) {
          // Timer finished
          setTimeLeft("TRADING OPEN"); 
      } else if (validEndTime === 0) {
          // Loading or invalid time
          setTimeLeft("--:--");
      } else {
          // Standard Countdown
          const minutes = Math.floor((diff / 1000 / 60) % 60);
          const seconds = Math.floor((diff / 1000) % 60);

          if (isNaN(minutes) || isNaN(seconds)) {
              setTimeLeft("Loading...");
          } else {
              setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
          }
      }
    };

    const timer = setInterval(tick, 1000);
    tick(); // Run immediately
    return () => clearInterval(timer);
  }, [endTime, isLive]);

  // Handle Trade Action
  const handleTrade = async (action?: 'DEPOSIT' | 'CLAIM') => {
    setIsLoading(true);
    try {
        if (mode === 'BUY') await buy(mint, Number(amount));
        else if (mode === 'SELL') await sell(mint, Number(amount));
        else if (mode === 'ALPHA') {
            if (action === 'DEPOSIT') await depositAlpha(mint, Number(amount));
            // CLAIM works if time is up, regardless of isLive status
            else if (action === 'CLAIM' && phaseIsLive) await claimAlpha(mint); 
        }
        setAmount(""); 
    } catch (e) {
        console.error("Trade failed", e);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="bg-lab-card border border-lab-input rounded-2xl p-6 shadow-xl sticky top-24">
      
      {/* 1. STATUS HEADER & TIMER */}
      <div className="mb-8 flex items-center justify-between bg-black/40 p-3 rounded-lg border border-lab-input/50">
        <div className="flex flex-col">
          <span className="text-xs font-mono text-lab-muted uppercase">Market Status</span>
          <span className={`font-bold font-mono ${isLive ? 'text-lab-green' : (timeIsUp ? 'text-lab-green' : 'text-yellow-500')}`}>
            {isLive ? '● OPEN' : (timeIsUp ? '● LIVE (Lazy Open)' : '● ALPHA PHASE')}
          </span>
        </div>
        
        {/* THE COUNTDOWN */}
        <div className="text-right">
           <span className="text-xs font-mono text-lab-muted uppercase">Timer</span>
           <div className="text-2xl font-mono font-black text-white tabular-nums tracking-widest">
             {isStatusLoading ? "--:--" : timeLeft}
           </div>
        </div>
      </div>

      {/* 2. TABS (Overlay Lock for Buy/Sell during Alpha) */}
      <div className="grid grid-cols-3 gap-2 mb-6 p-1 bg-lab-dark rounded-lg border border-lab-input relative">
        
        {/* LOCK OVERLAY: Only covers Buy/Sell if phase is NOT Live OR time is NOT up */}
        {!phaseIsLive && (
           <div className="absolute left-0 top-0 bottom-0 w-2/3 bg-black/80 z-20 rounded-lg flex items-center justify-center backdrop-blur-[1px] border border-yellow-500/30 cursor-not-allowed">
             <span className="text-[10px] font-mono font-bold text-yellow-500 bg-black px-2 py-1 rounded border border-yellow-500 animate-pulse">
               🔒 LOCKED
             </span>
           </div>
        )}

        <button
          onClick={() => phaseIsLive && setMode('BUY')}
          disabled={!phaseIsLive} // Enabled once the clock hits 0
          className={`py-2 rounded font-mono font-bold text-sm transition-all ${
            mode === 'BUY' ? 'bg-lab-greentext-white' : 'text-white/60 hover:text-white'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => phaseIsLive && setMode('SELL')}
          disabled={!phaseIsLive} // Enabled once the clock hits 0
          className={`py-2 rounded font-mono font-bold text-sm transition-all ${
            mode === 'SELL' ? 'bg-lab-red text-white' : 'text-white/60 hover:text-white'
          }`}
        >
          SELL
        </button>
        
        {/* Vault is ALWAYS active */}
        <button
          onClick={() => setMode('ALPHA')}
          className={`py-2 rounded font-mono font-bold text-sm transition-all ${
            mode === 'ALPHA' ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-white'
          }`}
        >
          VAULT
        </button>
      </div>

      {/* 3. INPUTS */}
      <div className="space-y-4">
        <div className="relative">
           <LabInput 
             label={mode === 'SELL' ? "Amount (Tokens)" : "Amount (SOL)"}
             placeholder={mode === 'SELL' ? "1000" : "0.5"}
             value={amount}
             onChange={(e) => setAmount(e.target.value)}
             // Disable input only if we are claiming (Claiming requires no input)
             disabled={mode === 'ALPHA' && phaseIsLive} 
           />
        </div>

        {/* 4. DYNAMIC ACTION BUTTONS */}
        {mode === 'ALPHA' ? (
            <div className="flex flex-col gap-3 mt-4">
                {!phaseIsLive ? (
                  // STATE 1: DEPOSIT (Timer Running)
                  <LabButton 
                    onClick={() => handleTrade('DEPOSIT')}
                    isLoading={isLoading}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
                  >
                    DEPOSIT (ALPHA PHASE)
                  </LabButton>
                ) : (
                  // STATE 2: CLAIM (Timer Ended)
                  <LabButton 
                    onClick={() => handleTrade('CLAIM')}
                    isLoading={isLoading}
                    variant="secondary"
                    className="w-full border-green-500 text-green-500 hover:bg-green-500 hover:text-black"
                  >
                    CLAIM ALLOCATION 💰
                  </LabButton>
                )}
            </div>
        ) : (
            // STATE 3: NORMAL TRADING
            <LabButton 
              variant={mode === 'BUY' ? 'secondary' : 'danger'}
              onClick={() => handleTrade()}
              isLoading={isLoading}
              className={`w-full text-lg mt-4 uppercase tracking-widest ${mode === 'BUY' ? 'bg-transparent text-white hover:bg-lab-green hover:text-black' : ''}`}
            >
              {mode === 'BUY' ? 'BUY TOKENS' : 'SELL TOKENS'}
            </LabButton>
        )}
      </div>
    </div>
  );
};