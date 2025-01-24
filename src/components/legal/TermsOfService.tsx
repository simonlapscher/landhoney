import React from 'react';
import { styles } from '../../utils/styles';

export const TermsOfService: React.FC = () => (
  <div className={`${styles.container} py-8 space-y-6 text-light`}>
    <h1 className="text-3xl font-bold">Terms of Service</h1>
    <p className="text-light/80">Last updated: {new Date().toLocaleDateString()}</p>

    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Agreement to Terms</h2>
        <p>
          By accessing or using Landhoney's services, you agree to be bound by these Terms of Service
          and all applicable laws and regulations. If you do not agree with any of these terms, you
          are prohibited from using or accessing our services.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Investment Risks</h2>
        <p>
          All investments carry risk, and past performance does not guarantee future results.
          Investments in real estate and gold-pegged tokens may be especially volatile and illiquid.
          You should carefully consider your investment objectives, risks, and costs before investing.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Account Registration</h2>
        <p>
          To use our services, you must register for an account and provide accurate and complete
          information. You are responsible for maintaining the security of your account and password.
          Landhoney cannot and will not be liable for any loss or damage from your failure to comply
          with this security obligation.
        </p>
      </section>

      {/* Add more sections as needed */}
    </div>
  </div>
); 