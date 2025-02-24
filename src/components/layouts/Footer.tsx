import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-light/10 py-6">
      <div className="px-8">
        <div className="flex items-center justify-between text-sm text-light/60">
          <div className="flex items-center space-x-6">
            <a 
              href="/terms" 
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-light transition-colors underline"
            >
              Terms & Conditions
            </a>
            <a 
              href="/privacy" 
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-light transition-colors underline"
            >
              Privacy Policy
            </a>
          </div>
          <div>
            © 2025 Honey X LLC
          </div>
        </div>
      </div>
    </footer>
  );
}; 