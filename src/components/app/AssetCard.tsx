// Find the button at the bottom of the commodity asset section
{asset.type === 'commodity' ? (
  <div className="flex flex-col justify-between h-full">
    {/* ... other content ... */}
    <button 
      onClick={handleInvestClick}
      className="w-full text-black font-medium py-3 px-6 rounded-lg hover:opacity-90 transition-colors"
      style={{
        background: asset.symbol === 'BTC' 
          ? 'linear-gradient(90deg, #F7931A 0%, #FFAB4A 100%)'
          : asset.symbol === 'HONEY'
          ? 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)'
          : '#00D54B'
      }}
    >
      Buy
    </button>
  </div>
) : null} 

interface AssetCardProps {
  asset: Asset;
  handleInvestClick: (asset: Asset) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, handleInvestClick }) => {
  // ... component code
}; 