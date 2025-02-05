1. Overview
The Landhoney Sell Widget allows users to initiate a sale of their Landhoney‐held assets in a manner similar to Uniswap/Jupiter swap widgets but without automated settlement. Instead, users submit a request, and the Landhoney team follows up offline to complete the transaction.

This document outlines all features, design requirements, and technical specifications needed to build this widget in React + Tailwind, with a Supabase backend for storing requests and an automated integration that notifies the Landhoney admin team.

2. Objectives
2.1 Allow users to select which asset they want to sell and how much (denominated in token units or USD).
2.2 Allow users to choose what asset (or currency) they wish to receive (Honey, HoneyX, USDC, or USD) and prompt the appropriate collection of recipient details.
2.3 Capture user contact information so Landhoney can follow up with an offer.
2.4 Explain the offline sale process in clear, distinct steps.
2.5 Trigger an email notification to Landhoney admins, capturing all request details.

3. User Flow Summary
3.1. User Arrives on Sell Page
* The Sell Widget is presented. Users see three main boxes (“You’re Selling,” “You’re Receiving,” “Contact Info”), plus a “Request Sell” button.
3.2 Fill Out “You’re Selling”
* User selects whether they are entering an amount in USD or in tokens via a radio button.
* User inputs the amount (defaults to a placeholder gray 0 or $0 if in USD mode).
* User chooses which token they are selling from a dropdown (Honey by default).
3.3 Fill Out “You’re Receiving”
* User chooses the asset they want to receive (USD default).
* If user picks the same asset as in “You’re Selling,” show an error/disable that option.
Once selected, a conditional “Where do you want to receive it?” area appears with relevant input fields (Landhoney Email, External Wallet, or Bank Account + Routing Number).
3.4 Fill Out “Contact Info”
* User chooses “Email” or “Phone Number” from a dropdown.
* User enters their email or phone in the text field.
3.5 Click “Request Sell”
* If no amount is entered, the button remains inactive and displays “Enter an Amount.”
* Once a valid amount is entered, user can click “Request Sell,” which transitions to “Requesting Sell…” with a loader.
* On success, button changes to “Request Sent” and the request details are emailed to admins and recorded in Supabase.
3.6 View Sale Process Steps
* Below the widget, the user sees four numbered steps describing how Landhoney will handle the offline sale.

4. Detailed Feature Requirements
4.1 Container & Layout
* Layout: One container widget, subdivided into three boxes plus a request button and a process-steps section underneath.

  1. “You’re Selling” box
  2. “You’re Receiving” box
  3. “Contact Info” box
  4. “Request Sell” button
  5. Process Steps (below the main widget)
* Styling: Inspired by Uniswap/Jupiter. Dark background, brand colors (section 7 below), and Codec Pro font.
4.2 “You’re Selling” Box
* Radio Button Toggle: “USD” vs. “Token Amount”
   1. By default, one is selected (e.g., “Token Amount” as default).
   2. Switching between these two states changes how the input box is labeled/placeholder is displayed.
* Amount Input Field
   1. Default placeholder is a grey 0 (or $0 if in USD‐mode).
   2. Once the user types, the placeholder disappears and the typed value appears in black text.
   3. Basic validation:
      1. Must be non‐empty (else “Request Sell” remains disabled).
      2. Optionally, restrict to numeric input (with decimals).
* Asset Dropdown
   1. Default: Honey token.
   2. Options (with corresponding token logos from the local assets folder under Landhoney):
      1. Honey
      2. HoneyX
      3. GA001
      4. TX002
      5. FL003
* Error Handling
   1. If user tries to select an asset with insufficient or restricted reasons (TBD in future, e.g. if user doesn’t hold that token), an error could be shown or the widget can simply still allow the request.
   2. Must not allow the user to pick the same asset in the “You’re Receiving” dropdown.
4.3 “You’re Receiving” Box
* Asset Dropdown
   1. Default: USD
   2. Options (with corresponding logos):
      1. Honey
      2. HoneyX
      3. USDC
      4. USD
* Error Handling
   1. If the user selected “Honey” in “You’re Selling,” then “Honey” must be disabled in “You’re Receiving” (and similarly for any same‐asset scenario).
* Conditional “Where Do You Want to Receive It?”
   1. This section is hidden until the user picks from the “You’re Receiving” dropdown. Once a selection is made, show the relevant input fields:
      1. If Honey or HoneyX:
         1. Show single input box labeled “Landhoney Login Email”
         2. Placeholder: “name@example.com” (greyed out).
         3. Remove placeholder text as user starts typing.
      2. If USDC:
         1. Show single input box labeled “Your External Wallet”.
         2. Placeholder: “0x000…” or typical wallet format.
      3. If USD:
         1. Show two input boxes:
            1. “Bank Account” (placeholder: “Bank account number”)
            2. “Routing Number” (placeholder: “Routing #”)
* No Automatic Amount Calculation
   1. The widget will not display an “estimated receive amount.” Instead, it simply captures the user’s request.    
4.4 “Contact Info” Box
* Subtitle: “Where should we contact you?”
* Contact Method Dropdown: “Email” or “Phone Number.”
   1. Default: Email (optionally).
* Contact Input Field
   1. Greyed placeholder text (e.g., “Enter your email or phone”).
   2. Validation: Must not be blank.
4.5 Request Sell Button & States
* Inactive State
   1. Label: “Enter an Amount”
   2. Greyed out or otherwise visually inactive.
   3. Displayed if the “You’re Selling” input amount is zero/empty.
* Active State
   1. Label: “Request Sell”
   2. Becomes clickable once the user enters a valid selling amount.
* Loading State
   1. After user clicks “Request Sell,” change text to “Requesting Sell…” with a loader/spinner.
* Success State
   1. When the system finishes sending the email to Landhoney admins, change button text to “Request Sent”.
* Trigger Email
   1. On success, automatically send an email containing all request details to:
      1. simon@landhoney.io
      2. alex@landhoney.io
4.6 Process Steps Section
Below the main widget, display a 4‐step timeline:
   1. Request
      1. “You send the request.”
   2. Offer
      1. “You will receive an offer on your phone or email.”
   3. Send Assets
      1. “You accept the terms and send tokens from your Landhoney account.”
   4. Receive Payment
      1. “Landhoney sends you the payment to your preferred account.”
Each step has a numbered title (e.g., “1. Request”) and a short descriptive line beneath it.

5. Design & Branding
* Look & Feel:
   1. Minimal, modern design reminiscent of Uniswap/Jupiter.
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
* Icons/Logos
   1. For tokens, place logos in the assets folder under Landhoney.
   2. Display the appropriate token icon in each dropdown.

6. Technical Requirements
* Frontend
   1. React + Tailwind CSS
   2. Must incorporate standard Tailwind best practices to style the widget, handle different states (hover, disabled, loading), etc.
* Supabase Integration
   1. Create a table named sell_requests (or similar) with columns:
      1. selling_asset (text)
      2. type (token or USD)
      3. selling_amount (numeric)
      4. receiving_asset (text)
      5. landhoney_email (text, nullable)
      6. external_wallet (text, nullable)
      7. bank_account (text, nullable)
      8. routing_number (text, nullable)
      9. contact_type (text, e.g., “Email” or “Phone”)
      10. contact_info (text)
      11. (Optional) timestamps (created_at, etc.)
* Automation
   1. The “Request Sell” action triggers a record insertion into Supabase.
   2. Upon success, an email is sent automatically to simon@landhoney.io and alex@landhoney.io summarizing the request.
* Validation
   1. Prevent selection of the same asset in both “You’re Selling” and “You’re Receiving.”
   2. Require a non‐empty, numeric “You’re Selling” amount before enabling “Request Sell.”
   3. Require contact info.
* Font
   1. Use Codec Pro for all text.

7. Delivery & Milestones
   1. Widget Implementation
      1. Develop the widget using React & Tailwind.
      2. Integrate state logic for radio buttons, dropdowns, and form validation.
   2. Supabase Table Setup
      1. Create/Configure the sell_requests table.
      2. Verify read/write with a test record.
   3. Styling & Branding
      1. Incorporate brand colors, typography, and overall layout as specified.
   4. Email Notification
      1. Implement automated emailing after form submission using Supabase functions, serverless functions, or a third‐party integration.
   5. Testing & QA
      1. Verify that the request data is stored properly in Supabase.
      2. Confirm that an email is sent to the correct addresses.
      3. Validate UI edge cases (zero amount, same asset for selling/receiving, empty contact info, etc.).