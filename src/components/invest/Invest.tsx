import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import { AssetCard, Asset } from './AssetCard';

// Mock data for testing
const mockAssets: Asset[] = [
  {
    id: '1',
    name: 'Modern Single Family Home',
    type: 'debt',
    imageUrl: 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/mortgage-3.jpg',
    location: 'Beverly Hills, CA',
    apr: 9.5,
    ltv: 65,
    term: '12 months',
    fundingGoal: 750000,
    fundedAmount: 525000,
    remainingAmount: 225000,
    status: 'active',
  },
  {
    id: '2',
    name: 'Luxury Beachfront Property',
    type: 'debt',
    imageUrl: 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/mortgage-4.jpeg',
    location: 'Miami Beach, FL',
    apr: 10.2,
    ltv: 70,
    term: '24 months',
    fundingGoal: 1200000,
    fundedAmount: 840000,
    remainingAmount: 360000,
    status: 'active',
  },
  {
    id: '5',
    name: 'Multi-Family Residential Complex',
    type: 'debt',
    imageUrl: 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/mortgage-7.jpg',
    location: 'Austin, TX',
    apr: 8.8,
    ltv: 68,
    term: '18 months',
    fundingGoal: 2000000,
    fundedAmount: 1200000,
    remainingAmount: 800000,
    status: 'active',
  },
  {
    id: '6',
    name: 'Downtown Commercial Office',
    type: 'debt',
    imageUrl: 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/mortgage-8.jpg',
    location: 'Seattle, WA',
    apr: 9.8,
    ltv: 56,
    term: '36 months',
    fundingGoal: 3500000,
    fundedAmount: 2100000,
    remainingAmount: 1400000,
    status: 'active',
  },
  {
    id: '3',
    name: 'Honey',
    type: 'commodity',
    imageUrl: 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/honey.png',
    fundingGoal: 250000,
    fundedAmount: 175000,
    remainingAmount: 75000,
    status: 'active',
    description: '100% gold-backed token. Follows the price of gold.',
  },
  {
    id: '4',
    name: 'HoneyX',
    type: 'commodity',
    imageUrl: 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/honeyx.png',
    fundingGoal: 180000,
    fundedAmount: 90000,
    remainingAmount: 90000,
    status: 'active',
    description: 'Stake your Honey and earn platform revenue',
  }
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export const Invest: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const categories = ['All Assets', 'Debt', 'Commodities'];

  const filteredAssets = selectedIndex === 0 
    ? mockAssets
    : mockAssets.filter(asset => 
        asset.type === (selectedIndex === 1 ? 'debt' : 'commodity')
      );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border-b border-light/10 mb-8">
        <nav className="flex space-x-8">
          {categories.map((category, index) => (
            <button
              key={category}
              className={classNames(
                'pb-4 text-sm font-medium border-b-2 -mb-px',
                selectedIndex === index
                  ? 'border-primary text-primary'
                  : 'border-transparent text-light/60 hover:text-light/80 hover:border-light/30'
              )}
              onClick={() => setSelectedIndex(index)}
            >
              {category}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAssets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>
    </div>
  );
}; 