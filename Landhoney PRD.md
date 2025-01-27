Landhoney MVP – Product Requirements Document (PRD)
1. Overview
Landhoney aims to help users protect their money from inflation and generate wealthby offering fractionalized investments in unique assets like real estate debt and a gold-pegged token called Honey, all managed via a user-friendly web platform. Users can also add liquidity to an internal fund and earn a yield on their assets. The MVP will focus on these core features:

1.1 Onboarding & Basic User Auth
1.2 Portfolio Management (virtual balances in Supabase)
1.3 Invest Flow (showing available assets, detail screens, and buy/sell modals)
1.4 Liquid Reserve (adding liquidity to an internal liquidity reserve fund)
1.5 Notifications for major user and transaction events
Future integrations (KYC with Sumsub, on-chain wallets with Privy, Transak on/off ramps, and real smart contracts) are out of scope for the MVP but will be considered in subsequent phases.

2. Tech Stack & Architecture
 2.1. Frontend:
  21.1 React (possibly using Create React App or Vite).
  2.1.2 Hosting: A static hosting provider like Vercel or Netlify is recommended for simplicity.
 2.2 Backend & Database:
  2.2.1 Supabase for database (Postgres) and authentication.
  2.2.2 Supabase Auth for email/password sign-up and login.
  2.2.3 Edge Functions in Supabase (or a small Node server if needed) to handle any advanced server-side logic.
 2.3. Notifications:
  2.3.1 At MVP, use a basic transactional email service (like SendGrid or Mailgun) triggered from Supabase Edge Functions or a simple node API to notify users and admins of relevant events.
 2.4. Security & Compliance:
  2.4.1 Store SSN/Tax ID in a secure, encrypted column within Supabase.
  2.4.2 Use Row-Level Security (RLS) so that only the owner of the record can access their sensitive info.
  2.4.3 Full KYC integration with Sumsub is out of scope for MVP; capturing data is enough for now.

3. User Types
  3.1 Standard User:
    Can sign up, manage portfolio, invest, buy/sell, add liquidity, etc.
    For MVP, all users have the same permissions.
  3.2 Admin Roles:
    Not implemented in the MVP. Will come later for advanced management.

4. Features & User Flow
  4.1 Onboarding
    4.1.1 Welcome Screen
        Title: “Welcome to Landhoney: free yourself from inflation.”
        Buttons: Get Started (primary), Log In (secondary).
    4.1.2 Step-by-Step Flow (progress bar at the top for visual feedback):
        4.1.2.1 Create Account: Email + Password (Supabase Auth).
        4.1.2.2 Country of Residence: user selects from a dropdown.
        4.1.2.3 Phone Number: plain text or numeric input.
        4.1.2.4 SSN/Tax ID (optional for MVP, but capture if user provides).
        This is stored encrypted in Supabase for generating 1099s.
        4.1.2.5 Accept Agreements: Terms & Privacy check box (with links to actual docs).
        4.1.2.6 Completed: “Welcome to Landhoney! Start Investing” button.
    4.1.3 Data Handling
        Each step updates a profiles table in Supabase (linked to the user’s auth record).
    4.1.4 Notifications
        Account Creation triggers a welcome email to the user.
 4.2 Main Site Sections
     Use a left-side navigation with these items:
      a) Account / Profile
      b) Portfolio
      c) Invest
      d) Liquid Reserve
    4.2.1 Account / Profile
        4.2.1.1 Profile Picture: For MVP, a static placeholder.
        4.2.1.2 Email: Read-only or allow editing (depending on final decision).
        4.2.1.3 Country, Phone, SSN: Editable fields if needed.
        4.2.1.4 Save Changes: Updates profiles table in Supabase.
    4.2.2 Portfolio
        4.2.2.1 Summary - “Total Holdings” in USD (summing all assets in user’s account).
        4.2.2.2 Holdings Table
            Asset Name + Symbol
            Balance (tokens/units)
            Price per Token (from an internal pricing reference—could be stored in Supabase or updated manually)
            Total Value = Balance × Price
            Action buttons:
            Buy / Sell / Earn (Earn only for Honey, which links to add liquidity flow)
        4.2.2.3 Transaction History
            Type (bought, sold, sent, staked, earned)
            Status (pending, completed)
            Asset + Symbol
            Amount (tokens)
            Amount in USD
            Date (timestamp)
        4.2.2.4 Buy / Sell Buttons
            Opens the same modals as the Invest flow for consistency.
    4.2.3 Invest
        4.2.3.1 Filters: “All / Debt / Commodities”
        4.2.3.2 Asset Offering Cards
            Picture (image from Supabase Storage).
            APR
            LTV
            Term
            Progress Bar for how much investment remains: 
             Loan amount - below the progress bar, on the left
             Investment amount left - below the progress bar, on the right
            Invest Button → opens Asset Detail Screen.
        4.2.3.3 Asset Detail Screen
            Large Highlight Picture.
            Info card with APR, LTV, Term, progress bar, plus Buy / Sell buttons (copy of Asset offering card)
            Overview Text describing the asset.
            Documents: Link or PDF stored in Supabase Storage (if any).
            Possibly more disclaimers or information.
        4.2.3.4 Buy / Sell Flow - If buying:
            Pop-up (styling like Selling Widget)    with 2 main containers: “You’re Buying” and “You’re Paying With” (or vice versa).
            Fees section.
            Review → Confirm button.
            If Buying with USDC → show Landhoney deposit wallet address.
            If Buying with USD → show wire/bank instructions.
            If Selling → use the offline “Selling Widget” approach (the same as the separate Sell Widget PRD).
            On Confirm, record a new transaction in the transactions table and send a notification email to the user.
    4.2.4 Liquid Reserve
        4.2.4.1 Stats
            Balances of property assets & Honey (virtual data).
            Total Value Locked.
            APR for participating.
            Breakdown chart (e.g., pie or bar) by token balance.
            Add liquidity button that opens add liquidity modal
        4.2.4.2 Add Liquidity
            From (Honey, USD, USDC)
            Amount input
                If USD, show wire instructions.
                If USDC, show deposit address.
            Explanation text about how liquidity is used.
            Review → Add Liquidity button → final confirmation.
            Creates a transaction in transactions with type “liquidity_add” or similar.
            Notification email to user confirming the liquidity addition.

5. Database Schema (Proposed)
Below are proposed   tables for Supabase. (Adjust naming/fields as needed.)
    5.1 users
     Managed automatically by Supabase Auth (email, password, user_id).
    5.2 profiles
     user_id (FK to users table)
     country (text)
     phone (text)
     ssn_or_tax_id (text, encrypted)
     created_at, updated_at (timestamps)
    5.3 transactions
     id (PK)
     user_id (FK to users.user_id)
     type (buy, sell, stake, earn, liquidity_add, etc.)
     asset (text, e.g., “Honey”, “USDC”)
     status (pending, completed, etc.)
     amount_token (numeric)
     amount_usd (numeric)
     created_at (timestamp)
    5.4 assets_offered
     id (PK)
     name (e.g., “GA001”)
     symbol (text)
     APR
     LTV
     Term (numeric)
     total_supply
     remaining_supply (numeric) - calculated from total supply - sum of users balances for this asset + landhoney wallet balance
     overview_text (text)
     document_links (array or separate table)
     created_at, 
     updated_at (timestamps)
(Optional: Separate table for “Asset Documents” if you want multiple files per asset.)

6. Notifications
    6.1 Account Creation → Welcome email to user.
    6.2 Buy / Sell → Email to user and optionally admin.
    6.3 Add Liquidity → Email to user.
    6.4 Payment to User (when a user is paid out) → Email to user.
 Implementation:
     Use Supabase Edge Functions or a minimal Node backend with a library like SendGrid to handle email triggers.
     Keep this logic simple for MVP.

7. Security & Compliance
    7.1 SSN/Tax ID
        Stored fully to enable 1099 generation.
        Use Supabase’s encrypted columns or encryption at rest.
        Restrict access via RLS to only the record owner.
    7.2 KYC
        Out of scope for MVP. Sumsub will be integrated in a future phase.
    7.3 Data Encryption
        Evaluate using Supabase PG crypto or an external encryption library.
    7.4 Future
        Integration with on-chain balances (Privy + Base).
        On/off ramps (Transak, etc.).

8. Milestones & Deliverables
    8.1 Onboarding & Auth
        Implement Supabase Auth (email/password).
        Build step-by-step Onboarding flow.
        Store user profile data (country, phone, ssn).
    8.2 Main Navigation
        Left-side menu with routes for Profile, Portfolio, Invest, Liquid Reserve.
    8.3 Profile & Portfolio
        Display user data.
        Allow editing profile data.
    8.4 Portfolio
        Show portfolio summary
        Transaction history table
        Integrate buy/sell modals
    8.4 Invest
        Display assets_offered from Supabase.
        Detail view with Buy/Sell.
        Payment instructions (manual for USD/USDC).
        Record new transactions, notify user.
    8.5 Liquid Reserve
        Stats overview (dummy data or from Supabase).
        Add Liquidity flow with instructions for USD/USDC.
        Notifications upon successful addition.
    8.6 Notifications
        Implement email notifications for major actions (onboarding, buy, sell, add liquidity, user payment).
    8.7 Testing & QA
        Validate all flows (Onboarding → Portfolio → Invest → Liquidity).
        Validate all flows (Onboarding → Portfolio → Invest → Liquidity).
        Confirm that SSN data is secure and only visible to the user in the DB.
        Check RLS policies in Supabase.
    8.8 Deployment
        Deploy the frontend to Vercel or Netlify.
        Confirm environment variables for Supabase are set.
        Ensure email service credentials are secured.

9. Future Phases (Post-MVP)
    9.1 KYC: Integration with Sumsub for identity verification.
    9.2 On-Chain: Connect user wallets with Privy, deploy real smart contracts on Base.
    9.3 Admin Roles: Admin UI for managing assets, user info, manual approvals.
    9.4 Automated Bank Integrations: Transak or direct bank APIs for on/off-ramping.
    9.5 Advanced Analytics: Charts, performance metrics, ROI, etc.

10. Design & Branding
* Look & Feel:
   1. Minimal, modern design reminiscent of Robinhood or Coinbase.
   2. Dark backgrounds with brand colors for highlights and buttons.
   3. Use Codec Pro as the primary font.
* Brand Colors
   1. Primary Colors
      1. #FFE51D
      2. #221E19
      3. #FCFAF3
   2. Secondary Colors
      1. #FFF184
      2. #F27C08
   3. Tertiary Colors
      1. #67D1EF
      2. #0B5AD5
      3. #79E5E4
      4. #42DB98
      5. #F88396