import React from 'react';

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  className?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, className = '' }) => {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
        ${checked 
          ? 'bg-primary border-primary' 
          : 'border-light/20 hover:border-light/40'}
        ${className}`}
    >
      {checked && (
        <svg 
          className="w-3 h-3 text-dark" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M5 13l4 4L19 7" 
          />
        </svg>
      )}
    </button>
  );
};

export { Checkbox }; 