import React from 'react';
import { TransactionHistory } from './TransactionHistory';
import { UserBalance } from './UserBalance';

export const ProfilePage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        {/* User Balance Section */}
        <UserBalance />
        
        {/* Transaction History Section */}
        <TransactionHistory />
      </div>
    </div>
  );
}; 