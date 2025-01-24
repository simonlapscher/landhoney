import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WelcomeScreen } from './components/onboarding/WelcomeScreen';
import { OnboardingLayout } from './components/layouts/OnboardingLayout';
import { ProtectedLayout } from './components/layouts/ProtectedLayout';
import {
  CreateAccount,
  CountrySelection,
  PhoneInput,
  TaxInfo,
  Agreements,
  Completion,
} from './components/onboarding/OnboardingComponents';
import {
  Profile,
  Portfolio,
  Invest,
  LiquidReserve,
} from './components/app/AppComponents';
import { TermsOfService } from './components/legal/TermsOfService';
import { PrivacyPolicy } from './components/legal/PrivacyPolicy';
import { MarketingPreferences } from './components/legal/MarketingPreferences';
import { SSNInput } from './components/onboarding/SSNInput';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<WelcomeScreen />} />
        
        {/* Legal routes - publicly accessible */}
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/marketing" element={<MarketingPreferences />} />
        
        {/* Onboarding routes */}
        <Route path="/onboarding" element={<OnboardingLayout />}>
          <Route index element={<Navigate to="create-account" replace />} />
          <Route path="create-account" element={<CreateAccount />} />
          <Route path="country" element={<CountrySelection />} />
          <Route path="phone" element={<PhoneInput />} />
          <Route path="tax-info" element={<TaxInfo />} />
          <Route path="agreements" element={<Agreements />} />
          <Route path="complete" element={<Completion />} />
          <Route path="ssn" element={<SSNInput />} />
        </Route>

        {/* Protected app routes */}
        <Route path="/app" element={<ProtectedLayout />}>
          <Route index element={<Navigate to="portfolio" replace />} />
          <Route path="profile" element={<Profile />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="invest" element={<Invest />} />
          <Route path="reserve" element={<LiquidReserve />} />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
