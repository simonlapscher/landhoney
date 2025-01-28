import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  return (
    <div className="relative group">
      <div className="cursor-help">
        {children}
      </div>
      <div className="absolute z-10 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
        <div className="bg-dark-gray px-3 py-1 rounded text-sm text-light whitespace-nowrap">
          {content}
          <div className="absolute w-2 h-2 bg-dark-gray transform rotate-45 left-1/2 -translate-x-1/2 -bottom-1"></div>
        </div>
      </div>
    </div>
  );
}; 