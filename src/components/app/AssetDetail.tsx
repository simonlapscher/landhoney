import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tab } from '@headlessui/react';
import { ImageGallery } from '../common/ImageGallery';
import { InvestmentBox } from '../invest/InvestmentBox';
import { HoneyInvestmentBox } from '../invest/HoneyInvestmentBox';
import { Asset, DebtAsset } from '../../lib/types/asset';
import { assetService } from '../../lib/services/assetService';
import { transactionService } from '../../lib/services/transactionService';
import { useAuth } from '../../lib/context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';

// ... existing code ...

// Inside the return statement, replace the Investment Box section with:
        {/* Investment Box */}
        <div className="w-96">
          {asset.type === 'debt' ? (
            <InvestmentBox
              asset={asset as DebtAsset}
              userBalance={userBalance}
              onInvest={() => {}}
              onSell={() => {}}
            />
          ) : asset.symbol === 'HONEY' ? (
            <HoneyInvestmentBox
              asset={asset}
              userBalance={userBalance}
              onInvest={() => {}}
              onSell={() => {}}
            />
          ) : null}
        </div>
// ... rest of the existing code ... 