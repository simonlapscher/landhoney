// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "./../_shared/cors.ts"

console.log("Welcome email function started!")

// Simple in-memory cooldown store
const emailCooldowns = new Map<string, number>();
const COOLDOWN_PERIOD = 30000; // 30 seconds

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
    console.log('SendGrid API Key exists:', !!SENDGRID_API_KEY)
    
    if (!SENDGRID_API_KEY) {
      throw new Error('SendGrid API key is not configured')
    }

    const { email } = await req.json()
    if (!email) {
      throw new Error('Email is required')
    }

    // Check cooldown
    const lastSentTime = emailCooldowns.get(email);
    const now = Date.now();
    if (lastSentTime && now - lastSentTime < COOLDOWN_PERIOD) {
      console.log('Email already sent recently, skipping duplicate');
      return new Response(
        JSON.stringify({ message: 'Email already sent recently' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Set cooldown before sending
    emailCooldowns.set(email, now);

    console.log('Sending welcome email to:', email)
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email }]
        }],
        from: { email: 'simon@landhoney.io', name: 'Landhoney' },
        subject: 'Welcome to Landhoney!',
        content: [{
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/logo-positive.png" alt="Landhoney Logo" style="max-width: 200px;">
              </div>
              <h1 style="color: #333; text-align: center;">Welcome to Landhoney!</h1>
              <p style="color: #666; line-height: 1.6; margin: 20px 0;">
                Thank you for taking another step in your journey to financial freedom. We're excited to have you join our community of investors.
              </p>
              <p style="color: #666; line-height: 1.6; margin: 20px 0;">
                With Landhoney, you can:
              </p>
              <ul style="color: #666; line-height: 1.6; margin: 20px 0; padding-left: 20px;">
                <li>Invest in real estate with as little as $10 and get paid each month</li>
                <li>Grow your wealth through our liquidity reserve fund</li>
                <li>Protect your money from inflation</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://app.landhoney.com" style="display: inline-block; background-color: #F7B538; color: #000; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold;">Start Investing</a>
              </div>
              <p style="color: #666; line-height: 1.6; margin: 20px 0;">
                If you have any questions, just reply to this email - we're always happy to help.
              </p>
              <div style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
                © 2024 Landhoney. All rights reserved.
              </div>
            </div>
          `
        }]
      })
    })

    const responseText = await response.text()
    
    if (!response.ok) {
      throw new Error(`SendGrid API error: ${response.status} - ${responseText}`)
    }

    return new Response(
      JSON.stringify({ message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in welcome email function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/welcome-email' \
    --header 'Authorization: Bearer ' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
