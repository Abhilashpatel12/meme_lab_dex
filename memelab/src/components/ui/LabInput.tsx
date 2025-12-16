import React from 'react';

interface LabInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const LabInput = ({ label, className, ...props }: LabInputProps) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-lab-green font-mono text-sm uppercase tracking-wider font-bold">
        {label}
      </label>
      <input 
        className="
          w-full bg-lab-dark border-2 border-lab-input rounded-lg p-3 text-white 
          focus:border-lab-green focus:outline-none focus:shadow-[0_0_10px_rgba(74,222,128,0.1)]
          transition-all font-mono placeholder:text-lab-muted
        "
        {...props} 
      />
    </div>
  );
};