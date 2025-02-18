import React from 'react';
import { styles } from '../../utils/styles';

export const StakingTerms: React.FC = () => (
  <div className={`${styles.container} py-8 space-y-8 text-light max-w-4xl mx-auto`}>
    <div className="text-center space-y-4">
      <h1 className="text-3xl font-bold">Honey X Staking Terms & Conditions</h1>
      <p className="text-light/80">Last Updated: February 17, 2025</p>
    </div>

    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Introduction</h2>
        <p>
          These Staking Terms & Conditions govern the participation in the staking program offered by Honey X. By staking assets, including our gold-backed token Honey, you agree to these terms, including the potential risks and liquidity constraints outlined below.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Risks of Staking</h2>
        <p>Staking involves certain risks, including but not limited to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Lock-Up Periods: Staked assets may be locked for a period, restricting immediate withdrawal.</li>
          <li>Withdrawal Delays: Due to liquidity constraints, withdrawal requests may not be processed instantly.</li>
          <li>Market Volatility: The value of staked assets may fluctuate based on market conditions.</li>
          <li>Liquidity Constraints: The ability to redeem or sell staked assets depends on the availability of funds in the reserve.</li>
          <li>Exposure Risk: While staking can provide earnings, it does not eliminate exposure to price fluctuations, and returns may not compensate for potential losses in asset value that arise from the underlying make up of the staking pool at any given time, due to assets being liquidated (e.g. debt assets).</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Liquidity & Redemption Mechanism</h2>
        <p>Liquidity on the platform shall operate based on fractional reserve principles, meaning that:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>When a holder of an asset token wishes to sell, the reserve will only buy it at a discount if sufficient liquidity is available.</li>
          <li>The discount applied will be determined initially at the discretion of the Honey X platform managers until an optimal strategy for automated transactions is established.</li>
          <li>The discount will be influenced by multiple factors, including available liquidity, market volatility, demand, and other risk elements that may arise over time.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. Role of Staked Honey in Liquidity Reserves</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>The primary source of liquidity for the reserve will be staking our gold-backed token, Honey.</li>
          <li>Holders of Honey may choose to stake it in exchange for earnings generated from purchasing tokens at a discount and collecting platform fees.</li>
          <li>While funds from staked Honey are used for asset liquidation, they may not be available for immediate withdrawal. However, the value of the staked asset remains protected, as it can only be used to buy other asset tokens at a discount.</li>
          <li>Since a portion of the liquidity pool's assets is used to purchase other assets, stakers may experience partial loss of exposure to their originally staked asset.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Staker Responsibilities</h2>
        <p>By participating in staking, users acknowledge and accept that:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Staking does not guarantee fixed returns, and earnings depend on liquidity operations.</li>
          <li>Redemptions and withdrawals are subject to liquidity availability, and delays may occur based on market conditions.</li>
          <li>The discount and liquidity mechanisms may evolve as the platform optimizes its strategy.</li>
          <li>Staking involves exposure to market and platform-related risks, and participants should only stake what they are willing to lock for potential liquidity operations.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">6. Modifications & Updates</h2>
        <p>
          Honey X reserves the right to modify these terms, including staking mechanics, liquidity policies, and discount structures, at any time. Changes will be communicated through official channels, and continued participation in staking constitutes acceptance of the updated terms.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">7. Contact Information</h2>
        <p>If you have any questions about this Agreement, you may contact us at:</p>
        <div className="mt-2">
          <p>Honey X LLC</p>
          <p>1865 Brickell Ave, Apt A1601</p>
          <p>Miami, FL 33129</p>
          <p>📧 Email: support@landhoney.io</p>
        </div>
      </section>
    </div>
  </div>
); 