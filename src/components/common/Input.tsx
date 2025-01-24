import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-light whitespace-nowrap">{label}</label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-light">
            {leftIcon}
          </span>
        )}
        <input
          {...props}
          className={`w-full bg-light/10 text-light p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm
            ${leftIcon ? 'pl-12' : ''}
            ${error ? 'border-tertiary-pink' : 'border-light/10'}
            ${className}`}
        />
      </div>
      {error && (
        <p className="text-tertiary-pink text-sm">{error}</p>
      )}
    </div>
  );
}; 