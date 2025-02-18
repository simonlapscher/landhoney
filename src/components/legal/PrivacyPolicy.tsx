import React from 'react';
import { styles } from '../../utils/styles';

export const PrivacyPolicy: React.FC = () => (
  <div className={`${styles.container} py-8 space-y-8 text-light max-w-4xl mx-auto`}>
    <div className="text-center space-y-4">
      <h1 className="text-3xl font-bold">Landhoney Privacy Policy</h1>
      <p className="text-light/80">Last Updated: February 16, 2025</p>
    </div>

    <p className="text-light/90">
      Honey X LLC ("Company," "we," "our," or "us") values your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, store, and share your personal information when you use our platform. By using our services, you consent to the practices described in this policy.
    </p>

    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Information We Collect</h2>
        <p>We collect different types of personal information to provide and improve our services. This includes:</p>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">1.1 Personal Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Full Name</li>
              <li>Email Address</li>
              <li>Phone Number</li>
              <li>Date of Birth</li>
              <li>Government-Issued Identification (for KYC/AML compliance)</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">1.2 Financial Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Payment Details</li>
              <li>Transaction History</li>
              <li>Bank Account or Cryptocurrency Wallet Information</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">1.3 Device and Usage Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>IP Address</li>
              <li>Browser Type and Version</li>
              <li>Device Information (e.g., operating system, model)</li>
              <li>Login Activity and Access Times</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">1.4 Cookies & Tracking Technologies</h3>
            <p>We use cookies, web beacons, and tracking technologies to enhance user experience and analyze platform usage. For more details, see our Cookie Policy.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
        <p>We use the collected data for the following purposes:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>To Provide and Improve Services: Process transactions, manage accounts, and offer customer support.</li>
          <li>For Security & Fraud Prevention: Detect suspicious activity, enforce compliance, and prevent unauthorized access.</li>
          <li>Legal and Regulatory Compliance: Fulfill KYC/AML requirements and comply with applicable laws.</li>
          <li>Marketing and Communication: Send platform updates, promotions, and newsletters (only with user consent).</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. How We Share Your Information</h2>
        <p>We do not sell or rent your personal information. However, we may share it under the following circumstances:</p>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">3.1 With Service Providers</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Identity verification partners (KYC/AML compliance).</li>
              <li>Payment processors and banking partners.</li>
              <li>Analytics providers (e.g., Google Analytics).</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">3.2 With Regulatory and Law Enforcement Agencies</h3>
            <p>We may disclose information when required by law, court orders, or government requests.</p>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">3.3 In Case of Business Transfers</h3>
            <p>If Honey X LLC undergoes a merger, acquisition, or asset sale, your data may be transferred to the new entity.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. Data Security & Protection</h2>
        <p>We implement security measures to protect your information from unauthorized access, theft, and misuse, including:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Data Encryption: Sensitive data is encrypted during storage and transmission.</li>
          <li>Access Controls: User accounts are protected with authentication measures.</li>
          <li>Periodic Security Audits: Regular testing to identify vulnerabilities.</li>
          <li>User Responsibility: While we take security seriously, you are responsible for protecting your login credentials and private keys.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Data Retention</h2>
        <p>We retain your personal information as long as necessary for:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Compliance with legal obligations (e.g., financial records for regulatory authorities).</li>
          <li>Resolving disputes and enforcing our agreements.</li>
          <li>Providing ongoing services to active users.</li>
        </ul>
        <p>Once data is no longer needed, we securely delete or anonymize it.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">6. User Rights & Choices</h2>
        <p>Depending on your jurisdiction, you may have the following rights regarding your data:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Access & Correction: Request a copy of your data or correct inaccuracies.</li>
          <li>Deletion Requests: Request deletion of your personal data (subject to regulatory requirements).</li>
          <li>Opt-Out of Marketing: Unsubscribe from promotional emails at any time.</li>
          <li>Data Portability: Obtain a machine-readable copy of your data.</li>
        </ul>
        <p>To exercise these rights, contact us at support@landhoney.io.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">7. International Data Transfers</h2>
        <p>
          If you access our services outside the United States, your data may be transferred and processed in the U.S. or other jurisdictions where our service providers operate. We ensure that appropriate safeguards are in place for international transfers.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">8. Third-Party Links & Services</h2>
        <p>
          Our platform may contain links to third-party websites or services. We are not responsible for their privacy practices and encourage users to review external policies before sharing personal data.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">9. Updates to This Privacy Policy</h2>
        <p>We may update this Privacy Policy from time to time. If we make material changes, we will notify users through:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>A prominent notice on our platform.</li>
          <li>An email notification (if applicable).</li>
        </ul>
        <p>Continued use of our services after updates constitutes acceptance of the revised policy.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">10. Contact Information</h2>
        <p>For questions or concerns regarding this Privacy Policy, you may contact us at:</p>
        <div className="mt-2">
          <p>Honey X LLC</p>
          <p>1865 Brickell Ave, Apt A1601</p>
          <p>Miami, FL 33129</p>
          <p>Email: support@landhoney.io</p>
        </div>
      </section>
    </div>
  </div>
); 