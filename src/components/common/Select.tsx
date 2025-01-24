import React, { SelectHTMLAttributes } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{
    value: string;
    label: string;
  }>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-light whitespace-nowrap">{label}</label>
      )}
      <div className="relative">
        <select
          {...props}
          className={`w-full appearance-none bg-light/10 text-light pl-4 pr-12 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary
            ${error ? 'border-tertiary-pink' : 'border-light/10'}
            ${className}`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="w-5 h-5 text-light absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
      {error && (
        <p className="text-tertiary-pink text-sm">{error}</p>
      )}
    </div>
  );
}; 