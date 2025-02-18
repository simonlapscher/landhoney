import React from 'react';
import { styles } from '../../utils/styles';

export const HoneyTokenAgreement: React.FC = () => (
  <div className={`${styles.container} py-8 space-y-8 text-light max-w-4xl mx-auto`}>
    <div className="text-center space-y-4">
      <h1 className="text-3xl font-bold">HNX Token Agreement, Redemption Policy, and Compliance Statement</h1>
      <p className="text-light/80">Last Updated: February 16, 2025</p>
    </div>

    <p className="text-light/90">
      This Agreement ("Agreement") governs the use, transfer, redemption, dispute resolution, and compliance obligations related to the HNX Token, issued by Honey X LLC ("Company," "we," "our," or "us"). By purchasing, holding, or redeeming HNX Tokens, you ("User" or "You") agree to these Terms & Conditions. If you do not agree, do not use HNX.
    </p>

    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. HNX Token Overview</h2>
        <ul className="list-disc pl-6 space-y-2 text-light/90">
          <li>Asset-Backed: Each HNX token is backed 1:1 by PAXG, a digital asset backed by physical gold stored by Paxos Trust Company. PAXG tokens are redeemable for gold and reflect the price of gold in real-time.</li>
          <li>Purpose: HNX provides a blockchain-based representation of gold ownership while allowing users to transact and transfer value.</li>
          <li>Market Conditions: Honey X LLC does not guarantee liquidity, price stability, or continuous redemption availability of HNX tokens.</li>
          <li>Platform Limitations: The platform does not update in real-time, and users should verify balances and transactions before making financial decisions.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Redemption & Reserve Management</h2>
        <ul className="list-disc pl-6 space-y-2 text-light/90">
          <li>Backing to PAXG: Every HNX token in circulation is backed by an equivalent amount of PAXG held in reserve.</li>
          <li>Custodianship: PAXG reserves are securely held with third-party custodians under legally binding agreements.</li>
          <li>Redemption Conditions: Users may request redemption of HNX for PAXG or equivalent USDC, subject to conditions outlined in the Redemption & Reserve Management Policy.</li>
          <li>Liquidations: All liquidations are subject to approval and acceptance of offer by Honey X LLC.</li>
          <li>Audit & Transparency: Honey X LLC reserves the right to conduct and publish independent reserve verification audits to ensure backing and liquidity.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Purchase & Payment Terms</h2>
        <ul className="list-disc pl-6 space-y-2 text-light/90">
          <li>Payment Methods: Users may purchase HNX using approved payment methods, including fiat currencies and cryptocurrencies.</li>
          <li>Transaction Fees: Users are responsible for any blockchain gas fees and transaction costs associated with acquiring, redeeming, or transferring HNX.</li>
          <li>No Refunds: All purchases are final and non-refundable, except as required by applicable law.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. Regulatory & Compliance</h2>
        <ul className="list-disc pl-6 space-y-2 text-light/90">
          <li>Non-Security Classification: Honey X LLC does not guarantee that HNX will not be classified as a security in any jurisdiction.</li>
          <li>AML/KYC Requirements: Users must comply with Anti-Money Laundering (AML) and Know Your Customer (KYC) regulations before purchasing or redeeming HNX.</li>
          <li>Jurisdictional Restrictions: HNX may not be available in certain jurisdictions due to regulatory constraints. Honey X LLC reserves the right to restrict accounts based on local laws.</li>
          <li>OFAC & Sanctions Compliance: Honey X LLC does not provide services to individuals or entities sanctioned under OFAC (Office of Foreign Assets Control) regulations.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Risks & Liabilities</h2>
        <ul className="list-disc pl-6 space-y-2 text-light/90">
          <li>Gold Price Volatility: The value of HNX fluctuates with the price of gold as determined by market conditions.</li>
          <li>Custodian Risk: Honey X LLC is not liable for any loss of PAXG held by third-party custodians.</li>
          <li>Regulatory Uncertainty: Future regulatory actions may impact the use, trading, or legality of HNX.</li>
          <li>Technical Failures: Blockchain technology and smart contracts are subject to vulnerabilities, including hacks, technical failures, and network congestion.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">6. Redemption Process & Restrictions</h2>
        <ul className="list-disc pl-6 space-y-2 text-light/90">
          <li>Eligibility: Users must complete AML/KYC verification before requesting redemptions.</li>
          <li>Minimum Redemption Amount: A minimum redemption threshold may apply based on platform policies.</li>
          <li>Processing Time: Redemption requests will be processed within a reasonable timeframe, subject to liquidity availability.</li>
          <li>Transfer Fees: Users are responsible for blockchain gas fees or processing charges associated with redemptions.</li>
          <li>Redemption Method: PAXG or USDC will be transferred to the user's verified wallet upon successful redemption.</li>
          <li>Liquidity Restrictions: In extreme cases, Honey X LLC reserves the right to pause redemptions for operational or market stability reasons.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">7. Dispute Resolution & Governing Law</h2>
        <ul className="list-disc pl-6 space-y-2 text-light/90">
          <li>Binding Arbitration: Any disputes must be resolved through binding arbitration in Miami, Florida, under the rules of the American Arbitration Association (AAA).</li>
          <li>Class Action Waiver: Users waive the right to participate in class-action lawsuits or collective legal actions against Honey X LLC.</li>
          <li>Governing Law: This Agreement shall be governed by the laws of the State of Florida.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">8. Modifications & Termination</h2>
        <ul className="list-disc pl-6 space-y-2 text-light/90">
          <li>Honey X LLC reserves the right to modify or discontinue the issuance, transfer, or redemption of HNX at any time.</li>
          <li>Any updates to these Terms will be communicated through official channels, and continued use of HNX constitutes acceptance of any modifications.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">9. Contact Information</h2>
        <p className="text-light/90">
          If you have any questions about this Agreement, you may contact us at:
        </p>
        <div className="mt-2 text-light/90">
          <p>Honey X LLC</p>
          <p>1865 Brickell Ave, Apt A1601</p>
          <p>Miami, FL 33129</p>
          <p>📧 Email: support@landhoney.io</p>
        </div>
      </section>
    </div>
  </div>
); 