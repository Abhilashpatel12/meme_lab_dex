'use client'
import Link from 'next/link';
import { WalletDropdown } from '@/components/wallet-dropdown';

export const Navbar = () => {
  return (
    // 1. Sticky Container
    <nav className="sticky top-0 z-40 w-full bg-lab-dark/80 backdrop-blur-md border-b border-lab-input">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* 2. Left Side: LOGO */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 bg-lab-green rounded-lg flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform duration-300 shadow-lg shadow-lab-green/20">
              ðŸ§ª
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-white font-mono tracking-tighter">
                MEME<span className="text-lab-green">LAB</span>
              </span>
            </div>
          </Link>

          {/* 3. Right Side: ACTIONS */}
          <div className="flex items-center gap-4">
            
            {/* Create Button (Hidden on very small phones if needed) */}
            <Link href="/create">
              <button className="hidden sm:block px-4 py-2 rounded-lg bg-lab-input/50 text-white font-mono hover:bg-lab-green hover:text-black transition-all border border-transparent hover:border-lab-green">
                + CREATE
              </button>
            </Link>

            {/* Our Custom Wallet Component */}
            <WalletDropdown />
          </div>

        </div>
      </div>
    </nav>
  );
};
