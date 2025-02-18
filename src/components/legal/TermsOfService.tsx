import React from 'react';
import { styles } from '../../utils/styles';

export const TermsOfService: React.FC = () => (
  <div className={`${styles.container} py-8 space-y-8 text-light max-w-4xl mx-auto`}>
    <div className="text-center space-y-4">
      <h1 className="text-3xl font-bold">LANDHONEY - TERMS OF SERVICE</h1>
      <p className="text-light/80">Last Updated: February 16, 2025</p>
    </div>

    <p className="text-light/90">
      These Terms of Service ("Terms") govern your access to and use of the website, platform, and services provided by Honey X LLC ("Company," "we," "our," or "us"). By accessing or using our platform, you agree to be bound by these Terms. If you do not agree to these Terms, you may not use our services.
    </p>

    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Company Information</h2>
        <p>
          Honey X LLC is a Florida limited liability company with its principal place of business located at: 1865 Brickell Ave, Apt A1601, Miami, FL 33129<br />
          Support Email: support@landhoney.io
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Nature of Services</h2>
        <p>
          Honey X LLC provides an online platform that allows users to access investment opportunities in various asset classes, including debt, commodities, and cryptocurrencies ("Services"). We do not offer investment advice, brokerage services, or act as a financial institution. We do not execute trades on behalf of users.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. User Eligibility</h2>
        <p>You must be at least 18 years old to use our Services. By accessing our platform, you represent and warrant that:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>You have the legal capacity to enter into a binding agreement;</li>
          <li>You are not located in a jurisdiction where the use of our Services would be illegal;</li>
          <li>You understand and accept the risks associated with investing in financial assets, including cryptocurrencies.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. Role of Company</h2>
        <p>
          The Company acts as a platform provider and facilitator for real estate investment opportunities. We do not provide investment advice or recommendations. All investment decisions are made solely by you, and you are responsible for evaluating the risks and merits of each investment opportunity.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Disclaimer of Direct Ownership</h2>
        <p>
          You acknowledge and agree that any digital or tokenized asset ("Asset") made available on the Platform does not constitute direct ownership of the underlying asset. Instead, you are acquiring a representation of the underlying asset held or managed by Honey X LLC (or its designated custodian). Honey X LLC maintains a 100% reserve of the underlying asset to back this representation, except when such Assets are actively staked or otherwise utilized according to the Platform's staking program. In those instances, the backing of the staked Assets may be subject to the terms and risks associated with staking, as described in the Platform's Staking Terms & Conditions. By using the Platform, you expressly agree and understand that your rights and obligations relate to the represented Asset balances in your account rather than any direct ownership interest in the underlying asset itself.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">6. Investment Risks</h2>
        <p>
          Investing in financial assets, including but not limited to equities, debt instruments, commodities, and cryptocurrencies, carries significant risks. By using our Services, you acknowledge and accept the following risks:
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">General Investment Risks</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Loss of Capital: Investments may result in partial or total loss of capital, and there is no guarantee of profitability.</li>
              <li>Market Risks: Prices of financial assets fluctuate due to market conditions, economic developments, regulatory changes, and geopolitical events.</li>
              <li>Liquidity Risks: Some assets may have limited liquidity, making them difficult to sell quickly or at a favorable price, potentially resulting in significant losses.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Specific Risks Related to Financial Assets</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Volatility: Certain assets, such as cryptocurrencies and speculative stocks, may experience extreme price swings within short periods.</li>
              <li>Interest Rate and Inflation Risks: Changes in interest rates or inflation levels can impact the value of investments, especially fixed-income securities.</li>
              <li>Regulatory and Legal Risks: Changes in laws, regulations, or government policies may negatively impact investments, including restrictions on trading or ownership.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Derivatives Risk</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>No Direct Ownership: Asset Tokens issued as derivatives do not represent direct ownership of the underlying assets. However, these investments are backed by Honey X ownership of the underlying asset, ensuring that the derivative instruments maintain a direct correlation to the asset's value.</li>
              <li>Settlement Risks: Some derivatives require settlement through third parties, which may present operational or liquidity risks.</li>
              <li>Price Decoupling: The market price of derivatives may deviate from the value of the underlying asset due to liquidity, trading volume, or structural inefficiencies.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Risks Related to Cryptocurrencies and Digital Assets</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Security Risks: Digital assets may be subject to hacking, fraud, and cyber threats, leading to potential loss of funds.</li>
              <li>Regulatory Uncertainty: Cryptocurrency markets are subject to evolving regulations that may impact asset availability and trading conditions.</li>
              <li>Irreversibility of Transactions: Cryptocurrency transactions are generally irreversible, meaning errors or unauthorized access can result in permanent loss.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Staking and Unstaking Risks</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Lock-up Periods: Some staking mechanisms require assets to be locked for a specific period, limiting liquidity and access to funds.</li>
              <li>Protocol Changes: Staking rewards and requirements are subject to changes by the protocol, which may impact expected returns and staking viability.</li>
              <li>Unstaking Delays: Some protocols enforce delays before assets can be unstaked and withdrawn, which may prevent timely access to funds during market fluctuations.</li>
              <li>Exposure Risks: while staking can provide earnings, it does not eliminate exposure to price fluctuations, and returns may not compensate for potential losses in asset value that arise from the underlying make up of the staking pool at any given time, due to assets being liquidated (e.g. debt assets).</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">7. Compliance & Sanctions Policy</h2>
        <p>
          Users represent and warrant that they are not subject to economic or trade sanctions administered or enforced by any governmental authority, including the U.S. Department of the Treasury's Office of Foreign Assets Control (OFAC). Users agree not to use our platform for any activities that violate applicable sanctions laws. We reserve the right to restrict or terminate access to users from jurisdictions with high regulatory risks or that are subject to global sanctions.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">8. Account Registration & Security</h2>
        <p>To access certain features of our platform, you may be required to create an account. You agree to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Provide accurate and complete registration information;</li>
          <li>Maintain the confidentiality of your login credentials;</li>
          <li>Notify us immediately if you suspect any unauthorized access to your account.</li>
        </ul>
        <p>We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent activities.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">9. Prohibited Activities</h2>
        <p>By using our Services, you agree not to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Use our platform for illegal, fraudulent, or abusive purposes;</li>
          <li>Engage in market manipulation, including wash trading, front-running, or spoofing;</li>
          <li>Upload harmful software, viruses, or malicious code;</li>
          <li>Attempt to gain unauthorized access to our systems or data;</li>
          <li>Engage in money laundering, terrorism financing, or other financial crimes;</li>
          <li>Use the platform to trade or promote fraudulent or unregistered securities.</li>
        </ul>
        <p>Violations of these rules may result in account suspension, reporting to authorities, and legal action.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">10. Intellectual Property Rights & Licensing</h2>
        <p>
          We retain all ownership rights in the intellectual property related to our platform, including trademarks, software, content, and proprietary technology. Users are granted a limited, revocable, non-exclusive, non-transferable license to use our platform for personal and non-commercial purposes. Any unauthorized use, modification, reproduction, or distribution of our intellectual property is strictly prohibited.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">11. Transaction Fees & Gas Fees</h2>
        <p>
          Users are responsible for all transaction fees associated with the use of our platform, including blockchain gas fees for cryptocurrency transactions. These fees are non-refundable and subject to network conditions. Honey X LLC is not responsible for fluctuating gas fees or transaction failures due to network congestion.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">12. Indemnification</h2>
        <p>Users agree to indemnify and hold harmless Honey X LLC, its affiliates, officers, directors, employees, and agents from any claims, damages, losses, or expenses arising out of:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Violations of these Terms;</li>
          <li>Use of our platform for unlawful activities;</li>
          <li>Third-party disputes related to transactions conducted through our platform;</li>
          <li>Regulatory or legal actions arising from the user's investment activities.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">13. Limitation of Liability</h2>
        <p>To the fullest extent permitted by law:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Honey X LLC is not responsible for any loss of funds due to cyberattacks, software vulnerabilities, or user error.</li>
          <li>We do not guarantee uninterrupted access to our platform and disclaim liability for service disruptions.</li>
          <li>We are not liable for losses related to smart contract failures, liquidity risks, or decentralized finance (DeFi) protocols.</li>
          <li>Our total liability for any claims shall not exceed the fees paid to us by the user in the 12 months preceding the claim.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">14. Regulatory Status</h2>
        <p>
          Honey X LLC is not registered with the U.S. Securities and Exchange Commission (SEC) or any other regulatory authority. Users acknowledge that our platform does not offer securities, derivatives, or investment products requiring regulatory registration. It is the responsibility of users to ensure their investment activities comply with applicable laws in their jurisdiction.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">15. Tax Obligations</h2>
        <p>
          Users are solely responsible for reporting and paying any applicable taxes related to transactions conducted on our platform. Honey X LLC does not provide tax advice. Users should consult a qualified tax professional to understand their tax obligations based on their investment activities.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">16. Risk of Capital Loss</h2>
        <p>
          Investing in debt tokens carries the risk of capital loss in the event of borrower default. While these tokens are backed by the underlying mortgage collateral, there is no guarantee that the collateral's liquidation value will fully cover the principal investment. Factors such as market downturns, property depreciation, legal complexities, or delays in foreclosure proceedings may reduce or prevent full recovery of funds.
        </p>
        <p>
          By purchasing debt tokens, investors acknowledge and accept the risk that a defaulting borrower and an insufficient collateral value may result in partial or total loss of their invested capital. Investors should conduct their own due diligence and assess their risk tolerance before participating in mortgage-backed investments.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">17. Dispute Resolution & Governing Law</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Mandatory Arbitration: Any disputes arising from these Terms shall be resolved through binding arbitration in Miami, Florida, under the rules of the American Arbitration Association.</li>
          <li>Class Action Waiver: You agree to resolve disputes individually and waive the right to participate in any class-action lawsuit or jury trial.</li>
          <li>Governing Law: These Terms shall be governed by and construed under the laws of the State of Florida.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">18. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. Any changes will be posted on our platform with the "Last Updated" date revised. Your continued use of our Services constitutes acceptance of the modified Terms.
        </p>
      </section>
    </div>
  </div>
); 