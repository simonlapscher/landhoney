import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      
      {isVisible && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-dark px-3 py-1.5 rounded text-xs text-light shadow-xl border border-light/10 whitespace-nowrap">
            {content}
            <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-dark border-r border-b border-light/10" />
          </div>
        </div>
      )}
    </div>
  );
}; 