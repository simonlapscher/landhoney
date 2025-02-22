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
    Can view, approve and reject orders. Can mint new tokens for users. 

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
        4.2.3.4 Invest / Sell Flow - If buying:
            Pop-up (styling like Selling Widget)    with 2 main containers: “You’re Buying” and “You’re Paying With” (or vice versa). You're buying is prepopulated based on the asset they are looking at, then they put input amount, can choose by token amount or by dollar amount. 
            Price per token
            Net investment 
            Fees section to show platform fee.
            Total amount to pay.
            Enter amount (when adding information) -> Review button (everything locks and not editable but show edit button) → Confirm button.
            After Confirm, If Buying with USDC → show Landhoney deposit wallet address with QR Code and instructions to pay.
            After Confirm, If Buying with USD → show wire/bank instructions with instructions to pay.
            If Selling → use the offline “Selling Widget” approach (the same as the separate Sell Widget PRD).
            On Confirm, record a new transaction in the transactions table and send a notification email to the user.
    4.2.4 Liquid Reserve
        Overview:
        • the liquid reserve is a pool of money from users that is used to buy debt assets from users who want to sell their debt assets
        • there are 2 liquid reserve pools - Honey and Bitcoin. When the user wants to sell, they choose what they want in return (Honey). Then an admin approves the transaction and the user gets paid.
        • the pool for each liquid reserve pool comes from users staking their Honey or Bitcoin. At any point in time, the pool's balance is comprised of: all users' staked asset (for bitcoin pool, staked bitcoin and for honey pool, staked honey) and any asset that has been sold to the pool and has not been rebought. 
        • Once a pool holds debt assets (the moment a user sells to the pool), the asset is listed back on the Invest section so users can buy it again. 
         When a user buys this asset, they will first buy the share of the asset any reserve pool owns, and then the rest from the asset offering directly. 
         If they buy using their USD balance, the USD balance for the portion of the asset that is coming from the pool is decreased from the user's balance, converted to the pool they sold to's main asset (for bitcoin pool, bitcoin and for honey pool, honey) in the background using the current price of the pool asset, and then it is added into the pool balance.
        4.2.4.1 Selling to the liquid reserve
            A user chooses the asset they want to sell, the amount they want to sell and what they want in return (e.g. Bitcoin or Honey).
            This creates a pending sell transaction in the transactions table for the admin to review and approve.
            Offline, the admin will look at the current state of the reserve, decide on a price to sell and reach out to the user outside of the platform to make the offer. 
            Once the user accepts, the admin will enter the price agreed for the asset, and the system will calculate and show the admin: how much USD the user should get. Once calculated, the admin approves the transaction. When that happens: 
             a) the user balance for the debt asset decreases 
             b) the user's USD balance for how much the user gets increases, 
             c) the pool's balance for the debt asset increases
             d) the pool's balance for the staked asset decreases by the USD amount the user got, converted to the pool's main asset (for bitcoin pool, bitcoin and for honey pool, honey) using the current price of the pool asset. 
        4.2.4.2 Buying from the liquid reserve
            Once a pool holds debt assets (the moment a user sells to the pool), the asset is listed back on the Invest section so users can buy it again. 
             When a user buys this debt asset, they will first buy the share of the asset any reserve pool owns, and then the rest from the asset offering directly. 
             If they buy using their USD balance:
              a) the user's USD balance for the portion of debt asset owned by the pool is decreased from the user's balance
              b) the user's debt asset balance increases by the amount of debt asset the user bought from the pool
              c) the pool's balance for the debt asset decreases by the amount of debt asset the user bought from the pool
              d) the pool's staked asset balance increases by the amount of USD the user paid, converted to the pool they sold to's main asset (for bitcoin pool, bitcoin and for honey pool, honey) in the background using the current price of the pool asset. 
        4.2.4.2 Stats
            For each pool, show:
            Balances of property assets & Honey.
            Total Value Locked (sum of staked assets and debt assets).
            APR for participating (default 8.8% for honey pool and 9.5% for bitcoin pool)
            Breakdown chart (e.g., pie or bar) by token balance.
            Add liquidity button that opens add liquidity modal
        4.2.4.2 Add and RemoveLiquidity
            Brings up staking and unstaking modal where user can add or remove their Honey or Bitcoin from the pool if they have any.
    4.2.5 Honey & Staking Honey
     Overview:
     Honey is a gold‐pegged commodity asset whose price is updated every 30 minutes via an oracle (e.g., Chainlink or another gold price aggregator). Users can acquire Honey, stake it for yield, and sell it (with admin approval). A special internal token, HoneyX, tracks the staked portion of a user’s Honey balance.
        4.2.5.1 Price Oracle Integration
            a. Update Frequency: The Honey price is refreshed every 30 minutes from an external gold price source.
            b. Provider: A recommended approach is to use Chainlink’s gold spot price feed or a reputable gold price API.
            c. Display:
                In the Invest Section when selecting Honey.
                In the Portfolio Holdings table under “My Assets.”
                Show the current gold‐pegged price (e.g., “1 Honey = $1,900.00”).
        4.2.5.2 Acquiring Honey
            a. Purchase via Invest
                Users can buy Honey with USD or USDC through the standard Invest flow.
                After the user sends funds externally (bank wire or crypto transfer), an admin approves the transaction and mints Honey to the user.
                A “Loan Payment” or “Purchase” transaction is recorded in the user’s history with status = “completed.”
            b. Monthly Distribution
                For users holding a loan, admins can mint Honey to them every month as a distribution or payment.
                Labeled in transaction history as “Loan Payment.”
                Triggers an email notification informing the user of new Honey minted to their account.
            c. Staking Rewards
                Users earn additional Honey via staking yields (detailed below).
                When rewards are distributed (e.g., monthly), a “Reward” transaction appears in their history.
        4.2.5.3 Selling Honey
            a. Sell Request: Users initiate a sell widget request for Honey, specifying USD or USDC as the receiving asset.
            b. Admin Approval: An admin confirms receipt of payment if needed (or simply confirms the user’s Honey balance).
            c. Balance Update: Once approved, the user’s Honey balance is reduced and the transaction is recorded (type = “sell,” status = “completed”).
            d. Same Flow as Other Assets: There is no separate “Sell Honey” pop‐up; it follows the existing offline manual sell widget flow.
        4.2.5.4 Staking Flow
            Goal: Users stake Honey into the Liquid Reserve to earn from fees and arbitrage. The yield is labeled as “Estimated APY” and currently set to 8.8%.
            a. Stake Initiation
                From the Portfolio / My Assets page, if the user has any non‐staked Honey, a “Stake” button is available.
                Clicking “Stake” opens a Staking Pop‐up showing:
                    Staking Amount: User can enter a dollar amount (primary) or Honey amount (secondary).
                    Estimated APY (8.8%).
                    Earning Wait Time: 7 days.
                    Payout Frequency: Every 30 days.
                    Unstaking Wait Time: 7 days.
                    Risk Warning: A pop‐up or tooltip explaining staking risks and yield sources.
            b. HoneyX Representation
                Upon staking, the user’s Honey balance decreases by the staked amount, and an equivalent quantity of HoneyX is allocated to them behind the scenes.
                From the user’s perspective: They still see a single combined “Honey” balance in their portfolio, but a portion is visually marked as staked.
            c. Portfolio Display
                Honey with a gold ring illustrating the % staked (e.g., “47% staked”).
                The “Balance” effectively includes (Honey + HoneyX). However:
                    If the user only has Honey (no staked portion), they see a “Stake” button.
                    If the user has both Honey and HoneyX, they see “Stake More” (primary) and “Unstake” (secondary).
                    If the user only has HoneyX (i.e., fully staked), “Stake More” is disabled since they have no free Honey.
            d. Unstake Flow
                Clicking “Unstake” opens an Unstake Pop‐up:
                    Input Amount in USD or Honey.
                    Available staked portion to unstake.
                    APY reminder (e.g., “~8.8%”).
                    Unstake button finalizes.
                One‐click uns​take, but the user’s HoneyX remains locked for a 7‐day wait period. Only after the wait time concludes does the Honey become available.
                A “Staked” transaction is recorded when the user stakes, and an “Unstaked” transaction is recorded when the user initiates unstaking.
                Optionally show “available at X date / time” for transparency.
            e. Staking Earnings
                In the Portfolio header (near “Total Value”), show:
                    A circular gauge with a gold ring filled to the user’s staked %.
                    Text like “47% staked.”
                    Staking rewards in USD.
                Payout from fees or arbitrage is distributed every 30 days, recorded as a “Reward” transaction in the user’s history.
    4.2.5.5 Transaction & Notification Details
        Transaction Types:
            “Loan Payment” for monthly minted Honey from Admin.
            “Reward” for staking payouts.
            “Staked”/“Unstaked” for the user’s stake operations.
            “Sell” for user-initiated sells.
        Email Triggers - to be implemented later after functionality is done and tested
            Loan Payment minted → Email user.
            Staking Reward distribution → Email user.
            (Future) You may add emails for stake/unstake confirmations once functionality is stable.
    4.2.5.6 Future Enhancements
        On-Chain Staking: Eventually, Honey and HoneyX will exist on a blockchain (e.g., Base). Staking transactions may become fully on-chain.
        Advanced Lock Mechanisms: Slashing, early withdrawal penalties, or variable APY calculations.
        Complex Oracle Logic: Using fallback or multiple oracle sources if the primary feed fails.
        Minimum/Maximum Staking: Possible introduction of stake limits or fees at a later stage.

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

----
New section for Admin portal:

11. Admin Portal
11.1 Overview
The Admin Portal is a restricted-access area for authorized Landhoney administrators. Its purpose is to manage and monitor the platform’s day-to-day operations, including user investments, asset controls, user account management, and compliance oversight. In the MVP, multiple admins can have access to these features.

11.2 Key Features
11.2.1 Invest Order Management
 11.2.1.1 Review Pending Orders: Admins can see all new invest and sell orders across assets awaiting approval.
 11.2.1.2 Approve / Reject Orders:
    * If the payment method is USD or USDC, the admin manually confirms receipt of funds from outside the platform and approves / rejects order. Once approved, the system adds/mints the corresponding asset tokens to the investor’s balance.
    * If the payment method is Honey, the admin confirms the investor’s Honey balance and approves the transaction. Once the admin approves the transaction, the investor's Honey balance is deducted and system mints the new asset tokens to the investor accordingly.
 11.2.1.3 Transaction Recording: Once approved, a transaction record is updated in transactions with status “completed.” and balances are updated in user_balances.

11.2.2 User & KYC Management
 11.2.2.1 View User Data: Admins can view a user’s onboarding details (country, phone, SSN/Tax ID) and, once integrated, KYC/AML status.
 11.2.2.2 Disable / Pause User Account: Temporarily or permanently restrict a user’s access to the platform. For instance, if there’s suspicion of fraudulent activity or compliance concerns, an admin can suspend the user.
 11.2.2.3 User Transaction History: Admins can see a full timeline of each user’s historical transactions (buy, sell, invest, liquidity, etc.) for auditing or support.

11.2.3 Asset Oversight
 11.2.3.1 View Investors per Asset: A list of all users holding a particular asset, along with their balances.
 11.2.3.2 Pause Asset Trading: Instantly prevent new buy/sell orders for a specific asset (e.g., if an asset is under regulatory review or liquidity constraints).

11.2.4 Platform Transactions & Reporting
 11.2.4.1 Global Transaction List: Display all transactions across the platform, with filtering by asset, date range, status, etc.
 11.2.4.2 Liquidity Reserve Transactions & Balances:
    * View an itemized list of all “add liquidity” or “remove liquidity” events.
    * Show each user’s holdings and share of the reserve fund.
 11.2.4.3 Optional Exports (future enhancement): Export CSV/PDF summaries for accounting, audits, or compliance.

11.2.5 Notifications
 11.2.5.1 Automatic or manual notifications to relevant parties (users, other admins) upon certain admin actions (e.g., order approved, user suspended, asset paused).

11.2.6 Admin portal access
 11.2.6.1 Admins should be able to access the admin portal through a unique URL.
 11.2.6.2 Admins should be able to create a new admin account from the admin portal.
 11.2.6.3 Admins should be able to login to the admin portal using their email and password.

11.3 Data Handling & Access Control
11.3.1 Supabase Authorization
 11.3.1.1 Admin accounts should be distinguishable from standard users, either via a role column in users or a separate RBAC mechanism.
 11.3.1.2 Enforce row-level security (RLS) so only admins can access admin data (invest order queue, user profiles, etc.). User should still be able to see their own data.

11.3.2 User Privacy & Compliance
 11.3.2.1 Admins can see SSN/Tax ID, but access to this data should be logged for audit purposes.
 11.3.2.2 KYC/AML status is stored alongside user info (once integrated with a 3rd-party KYC provider). For MVP, display “Pending” or “Not Verified” as placeholders.

11.3.3 Auditing
 11.3.3.1 Keep a log of admin actions (e.g., who approved an order, who paused which asset, who disabled a user). This log can be stored in a dedicated admin_logs table for security or compliance.

11.4 To Do Later (Future Enhancements)
 11.4.1 Asset Management
    * Update asset metadata (pictures, APR, terms, documents, etc.) from the admin portal.
 11.4.2 Advanced Access Control
    * Differentiate between “Owner,” “Head Admin,” or “Agent” roles with varying permissions.
    * Region‐based restrictions or blocking certain user segments.
 11.4.3 KYC Integration
    * Directly integrate the admin portal with third-party KYC providers (e.g., Sumsub) to approve/reject user identity verifications.
 11.4.4 Analytics & Reports
    * In-depth dashboards showing aggregated portfolio performance, user growth, trading volume, etc.

