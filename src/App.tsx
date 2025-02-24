import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { Portfolio } from './components/app/Portfolio';
import { Invest } from './components/invest/Invest';
import { TermsOfService } from './components/legal/TermsOfService';
import { PrivacyPolicy } from './components/legal/PrivacyPolicy';
import { MarketingPreferences } from './components/legal/MarketingPreferences';
import { SSNInput } from './components/onboarding/SSNInput';
import { AssetDetail } from './components/invest';
import { EmailVerificationStep } from './components/onboarding/EmailVerificationStep';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLogin } from './pages/admin/Login';
import { PendingTransactions } from './pages/admin/PendingTransactions';
import { PriceManagement } from './pages/admin/PriceManagement';
import { LoanDistribution } from './pages/admin/LoanDistribution';
import { PayoutHistory } from './pages/admin/PayoutHistory';
import { TokenMinting } from './pages/admin/TokenMinting';
import { AuthProvider } from './lib/context/AuthContext';
import { ProfilePage } from './components/profile/ProfilePage';
import { AddAsset } from './pages/admin/AddAsset';
import { LiquidReserve } from './pages/app/LiquidReserve';
import { Toaster } from 'react-hot-toast';
import { AuthCallback } from './components/auth/AuthCallback';
import { StakingTerms } from './components/legal/StakingTerms';
import { HoneyTokenAgreement } from './components/legal/HoneyTokenAgreement';
import { Referrals } from './pages/admin/Referrals';
import { ReferAndEarn } from './components/profile/ReferAndEarn';
import { BeeNameStep } from './components/onboarding/BeeNameStep';
import { ReferralStep } from './components/onboarding/ReferralStep';
import { PollenLeaderboard } from './components/app/PollenLeaderboard';
import { PollenRewards } from './pages/admin/PollenRewards';
import { Home as AdminHome } from './pages/admin/Home';

const queryClient = new QueryClient();

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

  useEffect(() => {
    console.log('App: Routes initialized');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-right" />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<WelcomeScreen />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Legal routes */}
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/marketing" element={<MarketingPreferences />} />
            <Route path="/staking-terms" element={<StakingTerms />} />
            <Route path="/honey-token-agreement" element={<HoneyTokenAgreement />} />
            
            {/* Admin routes */}
            <Route path="/admin">
              <Route path="login" element={<AdminLogin />} />
              <Route element={<AdminLayout />}>
                <Route index element={<AdminHome />} />
                <Route path="transactions" element={<PendingTransactions />} />
                <Route path="prices" element={<PriceManagement />} />
                <Route path="loans" element={<LoanDistribution />} />
                <Route path="payouts" element={<PayoutHistory />} />
                <Route path="mint" element={<TokenMinting />} />
                <Route path="add-asset" element={<AddAsset />} />
                <Route path="referrals" element={<Referrals />} />
                <Route path="pollen" element={<PollenRewards />} />
              </Route>
            </Route>
            
            {/* Onboarding routes */}
            <Route path="/onboarding" element={<OnboardingLayout />}>
              <Route index element={<Navigate to="create-account" replace />} />
              <Route path="login" element={<Login />} />
              <Route path="create-account" element={<CreateAccount />} />
              <Route path="verify" element={<EmailVerificationStep />} />
              <Route path="referral" element={<ReferralStep />} />
              <Route path="bee-name" element={<BeeNameStep />} />
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
              <Route path="refer-and-earn" element={<ReferAndEarn />} />
              <Route 
                path="liquid-reserve" 
                element={
                  <React.Suspense fallback={<div>Loading...</div>}>
                    <LiquidReserve />
                  </React.Suspense>
                } 
              />
              <Route path="pollen" element={<PollenLeaderboard />} />
            </Route>

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
