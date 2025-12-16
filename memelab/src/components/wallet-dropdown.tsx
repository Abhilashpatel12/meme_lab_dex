import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { toast } from 'sonner';

export const WalletDropdown = () => {
  // 1. Get Wallet Data
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal(); // This opens the standard "Select Wallet" popup
  
  // 2. State for the Dropdown Menu
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper: Close menu if user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper: Shorten Address (5EhS...WE47)
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      toast.success("Address Copied!");
      setIsOpen(false);
    }
  };

  // --- SCENARIO A: NOT CONNECTED ---
  if (!connected || !publicKey) {
    return (
      <button 
        onClick={() => setVisible(true)}
        className="bg-lab-green text-white font-mono font-bold py-2 px-4 rounded-lg hover:bg-green-400 hover:text-black transition-all shadow-[0_0_10px_rgba(74,222,128,0.3)]"
      >
        CONNECT WALLET
      </button>
    );
  }

  // --- SCENARIO B: CONNECTED (Show Custom Dropdown) ---
  return (
    <div className="relative" ref={dropdownRef}>
      {/* The Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-lab-card border border-lab-input text-lab-green font-mono py-2 px-4 rounded-lg hover:border-lab-green transition-all"
      >
        <span className="h-2 w-2 bg-lab-green rounded-full animate-pulse"/>
        {truncateAddress(publicKey.toBase58())}
        <span>▾</span>
      </button>

      {/* The Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-lab-dark border border-lab-input rounded-xl shadow-2xl z-50 overflow-hidden">
          
          {/* Option 1: Profile */}
          <Link href={`/account/${publicKey.toBase58()}`}>
            <div className="block px-4 py-3 text-white hover:bg-lab-card cursor-pointer font-mono text-sm border-b border-lab-input">
              👤 View Profile
            </div>
          </Link>

          {/* Option 2: Copy */}
          <button 
            onClick={copyAddress}
            className="w-full text-left px-4 py-3 text-white hover:bg-lab-card font-mono text-sm border-b border-lab-input"
          >
            📋 Copy Address
          </button>

          {/* Option 3: Disconnect */}
          <button 
            onClick={() => { disconnect(); setIsOpen(false); }}
            className="w-full text-left px-4 py-3 text-lab-red hover:bg-lab-card font-mono text-sm"
          >
            🔌 Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

// Default export to handle import mismatch issues
export default WalletDropdown;