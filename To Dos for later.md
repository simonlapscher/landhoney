## To Dos for later

Onboarding flow:
Authentication & Security:
- [ ] Add a "forgot password" flow
- [ ] Add password strength indicator
- [ ] Add view password eye icon
- [ ] Add rate limiting for failed login attempts
- [ ] Add session timeout handling
- [ ] Add multi-factor authentication option
- [ ] Add account recovery security questions

Email & Communication:
- [ ] Add account creation email
- [ ] Change email to Landhoney domain
- [ ] Add custom SMTP to Supabase so auth emails are sent from Landhoney
- [ ] Add email preferences during signup (marketing, notifications)
- [ ] Add automated welcome email A/B testing

User Experience:
- [ ] Add form validation error messages (e.g., invalid email format, password too short)
- [ ] Add loading states to all buttons during form submission
- [ ] Add social login options (Google, Apple)
- [ ] Add progress indicator for multi-step onboarding
- [ ] Add welcome tour/walkthrough for new users
- [ ] Add ability to save onboarding progress and resume later

Verification & Compliance:
- [ ] Add a "verify phone number" flow
- [ ] Add terms of service and privacy policy checkboxes

Analytics & Feedback:
- [ ] Add analytics tracking for onboarding funnel
- [ ] Add user feedback survey after onboarding completion

Investment Flow & Database:
Database Structure:
- [ ] Design and create assets table (properties, details, status)
- [ ] Design and create investments table (user investments, amounts, dates)
- [ ] Design and create transactions table (all financial movements)
- [ ] Design and create user_balances table (current holdings, available funds)
- [ ] Set up database triggers for balance updates
- [ ] Create database functions for investment calculations
- [ ] Add database constraints and validation rules

Investment UI Flow:
- [ ] Create asset listing page with filters and search
- [ ] Create asset details page with full property information
- [ ] Create investment calculator component
- [ ] Build investment confirmation flow
- [ ] Add transaction success/failure handling
- [ ] Create transaction history view
- [ ] Add portfolio balance and performance metrics

Investment Backend:
- [ ] Create API endpoints for asset listing and filtering
- [ ] Create secure transaction processing system
- [ ] Add investment amount validation
- [ ] Set up transaction rollback mechanism
- [ ] Create balance update system
- [ ] Add investment confirmation emails
- [ ] Set up automated investment receipts
