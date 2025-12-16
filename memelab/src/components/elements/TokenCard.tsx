import React from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  variant?: 'alpha' | 'graduated'; 
}

export const RadioactiveCard = ({ children, className = "", variant = 'alpha' }: Props) => {
  // Alpha = Toxic Green/Yellow | Graduated = Stable Blue
  const borderColor = variant === 'alpha' ? 'border-lab-green/30' : 'border-blue-500/30';
  const glowColor = variant === 'alpha' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)';
  const hoverBorder = variant === 'alpha' ? 'hover:border-lab-green/80' : 'hover:border-blue-500/80';
  const leakGradient = variant === 'alpha' ? 'from-transparent via-lab-green/20 to-transparent' : 'from-transparent via-blue-500/20 to-transparent';

  return (
    <div 
      className={`relative group rounded-xl border ${borderColor} bg-black/60 backdrop-blur-md overflow-hidden transition-all duration-300 ${hoverBorder} ${className}`}
      style={{ boxShadow: `0 0 20px -5px ${glowColor}` }}
    >
      {/* Scanline Texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[length:100%_2px,3px_100%] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0" />
      
      {/* Content */}
      <div className="relative z-10 p-4">
        {children}
      </div>

      {/* Hover "Radiation Leak" Animation */}
      <div className={`absolute -inset-1 bg-gradient-to-r ${leakGradient} opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 pointer-events-none`} />
    </div>
  );
};