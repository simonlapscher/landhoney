import React from 'react';
import { styles } from '../../utils/styles';

export const MarketingPreferences: React.FC = () => (
  <div className={`${styles.container} py-8 space-y-6 text-light`}>
    <h1 className="text-3xl font-bold">Marketing Communications</h1>
    <p className="text-light/80">Last updated: {new Date().toLocaleDateString()}</p>

    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Types of Communications</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Investment opportunities and new offerings</li>
          <li>Market insights and analysis</li>
          <li>Platform updates and new features</li>
          <li>Educational content about investing</li>
          <li>Special promotions and events</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Communication Channels</h2>
        <p>
          We may contact you through:
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>Email newsletters</li>
          <li>SMS notifications (for important updates)</li>
          <li>Push notifications (if enabled)</li>
          <li>In-app messages</li>
        </ul>
      </section>
    </div>
  </div>
); 