import React from 'react';
import { styles } from '../../utils/styles';

export const PrivacyPolicy: React.FC = () => (
  <div className={`${styles.container} py-8 space-y-6 text-light`}>
    <h1 className="text-3xl font-bold">Privacy Policy</h1>
    <p className="text-light/80">Last updated: {new Date().toLocaleDateString()}</p>

    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Information We Collect</h2>
        <p>
          We collect information you provide directly to us, including name, email address,
          phone number, and tax identification information. We also collect information about
          your use of our services and transactions.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
        <p>
          We use the information we collect to provide, maintain, and improve our services,
          to process your transactions, to send you technical notices and support messages,
          and to comply with legal obligations.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Information Security</h2>
        <p>
          We use industry-standard security measures to protect your personal information.
          Sensitive data like SSN/Tax ID is encrypted at rest and in transit. However, no
          method of transmission over the Internet is 100% secure.
        </p>
      </section>

      {/* Add more sections as needed */}
    </div>
  </div>
); 