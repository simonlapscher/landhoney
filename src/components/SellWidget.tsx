import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

const SellWidget: React.FC = () => {
  const [sellingAmount, setSellingAmount] = useState<string>('');
  const [amountType, setAmountType] = useState<'USD' | 'Token'>('Token');
  const [sellingAsset, setSellingAsset] = useState<string>('Honey');
  const [receivingAsset, setReceivingAsset] = useState<string>('USD');
  const [contactMethod, setContactMethod] = useState<string>('Email');
  const [contactInfo, setContactInfo] = useState<string>('');
  const [receivingDetails, setReceivingDetails] = useState({
    landhoneyEmail: '',
    externalWallet: '',
    bankAccount: '',
    routingNumber: '',
  });

  const handleRequestSell = () => {
    // Logic to handle the sell request
  };

  const renderReceivingDetailsInput = () => {
    switch (receivingAsset) {
      case 'Honey':
      case 'HoneyX':
        return (
          <div className="flex items-center gap-4">
            <label className="text-light whitespace-nowrap">Landhoney Login Email:</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={receivingDetails.landhoneyEmail}
              onChange={(e) => setReceivingDetails({ ...receivingDetails, landhoneyEmail: e.target.value })}
              className="flex-1 bg-light/10 text-light p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
        );
      case 'USDC':
        return (
          <div className="flex items-center gap-4">
            <label className="text-light whitespace-nowrap">Your External Wallet:</label>
            <input
              type="text"
              placeholder="0x000..."
              value={receivingDetails.externalWallet}
              onChange={(e) => setReceivingDetails({ ...receivingDetails, externalWallet: e.target.value })}
              className="flex-1 bg-light/10 text-light p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
        );
      case 'USD':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <label className="text-light whitespace-nowrap w-32">Bank Account:</label>
              <input
                type="text"
                placeholder="Bank account number"
                value={receivingDetails.bankAccount}
                onChange={(e) => setReceivingDetails({ ...receivingDetails, bankAccount: e.target.value })}
                className="flex-1 bg-light/10 text-light p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="text-light whitespace-nowrap w-32">Routing Number:</label>
              <input
                type="text"
                placeholder="Routing #"
                value={receivingDetails.routingNumber}
                onChange={(e) => setReceivingDetails({ ...receivingDetails, routingNumber: e.target.value })}
                className="flex-1 bg-light/10 text-light p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-dark/80 p-4 rounded-2xl shadow-xl border border-light/10">
      <div className="space-y-3">
        {/* You're Selling Section */}
        <div className="bg-light/5 p-4 rounded-xl">
          <h2 className="text-lg font-bold text-light mb-2">You're Selling</h2>
          
          {/* Radio Buttons */}
          <div className="flex gap-2 mb-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                className="hidden"
                name="amountType"
                checked={amountType === 'USD'}
                onChange={() => setAmountType('USD')}
              />
              <span className={`px-3 py-1 text-sm rounded-lg ${amountType === 'USD' ? 'bg-primary text-dark' : 'bg-light/10'}`}>
                USD
              </span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                className="hidden"
                name="amountType"
                checked={amountType === 'Token'}
                onChange={() => setAmountType('Token')}
              />
              <span className={`px-3 py-1 text-sm rounded-lg ${amountType === 'Token' ? 'bg-primary text-dark' : 'bg-light/10'}`}>
                Token Amount
              </span>
            </label>
          </div>

          {/* Amount Input and Asset Selector */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              {amountType === 'USD' && (
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-light text-4xl">$</span>
              )}
              <input
                type="text"
                placeholder="0"
                value={sellingAmount}
                onChange={(e) => setSellingAmount(e.target.value)}
                className={`w-full bg-transparent text-light text-4xl font-medium p-6 focus:outline-none ${
                  amountType === 'USD' ? 'pl-12' : ''
                }`}
              />
            </div>
            <div className="relative">
              <select
                value={sellingAsset}
                onChange={(e) => setSellingAsset(e.target.value)}
                className="appearance-none bg-light/10 text-light pl-4 pr-12 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Honey">Honey</option>
                <option value="HoneyX">HoneyX</option>
                <option value="GA001">GA001</option>
                <option value="TX002">TX002</option>
                <option value="FL003">FL003</option>
              </select>
              <ChevronDownIcon className="w-5 h-5 text-light absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* You're Receiving Section */}
        <div className="bg-light/5 p-4 rounded-xl">
          <h2 className="text-lg font-bold text-light mb-2">You're Receiving</h2>
          <div className="relative">
            <select
              value={receivingAsset}
              onChange={(e) => setReceivingAsset(e.target.value)}
              className="w-full appearance-none bg-light/10 text-light pl-4 pr-12 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="USD">USD</option>
              <option value="Honey">Honey</option>
              <option value="HoneyX">HoneyX</option>
              <option value="USDC">USDC</option>
            </select>
            <ChevronDownIcon className="w-5 h-5 text-light absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Conditional Receiving Details Section */}
        <div className="bg-light/5 p-4 rounded-xl">
          <h2 className="text-lg font-bold text-light mb-2">Where Do You Want to Receive It?</h2>
          {renderReceivingDetailsInput()}
        </div>

        {/* Contact Info Section - reverting to original style */}
        <div className="bg-light/5 p-4 rounded-xl">
          <h2 className="text-lg font-bold text-light mb-2">Contact Info</h2>
          <div className="space-y-2">
            <select
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value)}
              className="w-full bg-light/10 text-light p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="Email">Email</option>
              <option value="Phone">Phone Number</option>
            </select>
            <input
              type="text"
              placeholder={`Enter your ${contactMethod.toLowerCase()}`}
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              className="w-full bg-light/10 text-light p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
        </div>

        {/* Request Sell Button */}
        <button
          onClick={handleRequestSell}
          disabled={!sellingAmount || !contactInfo || (
            (receivingAsset === 'Honey' || receivingAsset === 'HoneyX') && !receivingDetails.landhoneyEmail ||
            receivingAsset === 'USDC' && !receivingDetails.externalWallet ||
            receivingAsset === 'USD' && (!receivingDetails.bankAccount || !receivingDetails.routingNumber)
          )}
          className="w-full bg-primary text-dark font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary-honey transition-colors"
        >
          {!sellingAmount ? 'Enter an Amount' : 'Request Sell'}
        </button>
      </div>
    </div>
  );
};

export default SellWidget; 