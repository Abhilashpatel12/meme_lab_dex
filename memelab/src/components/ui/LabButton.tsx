import React from 'react';

interface LabButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const LabButton = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className, 
  ...props 
}: LabButtonProps) => {
  
  const variants = {
    primary: "bg-lab-green text-black hover:bg-green-400 hover:shadow-[0_0_15px_rgba(74,222,128,0.5)] border-none",
    secondary: "bg-lab-input text-white hover:bg-slate-600 border border-slate-500",
    danger: "bg-lab-red text-white hover:bg-red-400 hover:shadow-[0_0_15px_rgba(248,113,113,0.5)] border-none",
  };

  return (
    <button 
      disabled={isLoading || props.disabled}
      className={`
        relative px-6 py-3 rounded-xl font-bold font-mono transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed active:scale-95
        flex items-center justify-center
        ${variants[variant]}
        ${className} 
      `}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          {/* Simple CSS Spinner */}
          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>PROCESSING...</span>
        </div>
      ) : children}
    </button>
  );
};