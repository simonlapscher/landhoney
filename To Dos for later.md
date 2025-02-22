## To Dos for later

Onboarding flow:
Authentication & Security:
- [ ] Add a "forgot password" flow
- [ ] Add password strength indicator
- [ ] Add view password eye icon
- [ ] Add session timeout handling
- [ ] Add multi-factor authentication option

Email & Communication:
- [ ] Change verification email to Landhoney domain (Add custom SMTP to Supabase so auth emails are sent from Landhoney)
- [ ] Add order creation email
- [ ] Add order confirmation email  
- [ ] Add deposit initiation email
- [ ] Add deposit confirmation email
- [ ] Add withdrawal initiation email
- [ ] Add withdrawal confirmation email
- [ ] Add staking confirmation email
- [ ] Add unstaking confirmation email  
- [ ] Add new asset listing email

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

Investment UI Flow:
- [ ] Create filters and search for assets
- [ ] Create investment calculator component
- [ ] Add transaction success/failure handling

Asset details page:
- [ ] Only allow Sell click if user has tokens / balance

Investment Backend:
- [ ] Create API endpoints for asset listing and filtering
- [ ] Create secure transaction processing system
- [ ] Add investment amount validation
- [ ] Create balance update system
- [ ] Add investment confirmation emails

Invest pop up:
- [ ] set naming convention for assets
- [ ] create email when order is created
- [ ] create email when order is confirmed
- [ ] add real order confirmation number to confirmation widget

Profile:
- [ ] Test changing email flow


Check functionality: 
- honey unstaking not modifying the liquid reserve balance
- staking not adding to pool

- Supabase type generation
- Pool assets are Bitcoin and Honey instead of BitcoinX and HoneyX