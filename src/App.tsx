import React, { useEffect } from 'react';
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
import { Login } from './components/onboarding/Login';
import {
  Portfolio,
  Invest,
  LiquidReserve,
} from './components/app/AppComponents';
import { TermsOfService } from './components/legal/TermsOfService';
import { PrivacyPolicy } from './components/legal/PrivacyPolicy';
import { MarketingPreferences } from './components/legal/MarketingPreferences';
import { SSNInput } from './components/onboarding/SSNInput';
import { AssetDetail } from './components/invest';
import { EmailVerification } from './components/onboarding/EmailVerification';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLogin } from './pages/admin/Login';
import { PendingTransactions } from './pages/admin/PendingTransactions';
import { PriceManagement } from './pages/admin/PriceManagement';
import { LoanDistribution } from './pages/admin/LoanDistribution';
import { PayoutHistory } from './pages/admin/PayoutHistory';
import { TokenMinting } from './pages/admin/TokenMinting';
import { AuthProvider } from './lib/context/AuthContext';
import { ProfilePage } from './components/profile/ProfilePage';

const App: React.FC = () => {
  useEffect(() => {
    const updateTitle = () => {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) {
        document.title = 'Landhoney - Admin';
      } else {
        document.title = 'Landhoney';
      }
    };

    updateTitle();
    window.addEventListener('popstate', updateTitle);
    return () => window.removeEventListener('popstate', updateTitle);
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<WelcomeScreen />} />
          
          {/* Legal routes - publicly accessible */}
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/marketing" element={<MarketingPreferences />} />
          
          {/* Admin routes */}
          <Route path="/admin">
            <Route path="login" element={<AdminLogin />} />
            <Route element={<AdminLayout />}>
              <Route path="transactions" element={<PendingTransactions />} />
              <Route path="prices" element={<PriceManagement />} />
              <Route path="loans" element={<LoanDistribution />} />
              <Route path="payouts" element={<PayoutHistory />} />
              <Route path="mint" element={<TokenMinting />} />
              <Route index element={<Navigate to="transactions" replace />} />
            </Route>
          </Route>
          
          {/* Onboarding routes */}
          <Route path="/onboarding" element={<OnboardingLayout />}>
            <Route index element={<Navigate to="create-account" replace />} />
            <Route path="login" element={<Login />} />
            <Route path="create-account" element={<CreateAccount />} />
            <Route path="verify" element={<EmailVerification />} />
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
            <Route path="profile" element={<ProfilePage />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="invest" element={<Invest />} />
            <Route path="invest/:id" element={<AssetDetail />} />
            <Route path="reserve" element={<LiquidReserve />} />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
