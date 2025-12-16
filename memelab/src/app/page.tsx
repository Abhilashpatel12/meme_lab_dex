'use client'
import { TokenGrid } from "@/components/elements/TokenGrid";

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* A simple banner */}
      <div className="py-12 px-6 text-center">
        <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter">
          EXPLORE <span className="text-lab-green">MUTATIONS</span>
        </h1>
        <p className="text-lab-muted font-mono max-w-xl mx-auto">
          Discover the latest experimental tokens on the MemeLab protocol.
          Trade with caution.
        </p>
      </div>


      {/* The Grid */}
      <TokenGrid />
    </div>
  );
}
