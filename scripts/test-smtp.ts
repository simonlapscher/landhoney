import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSmtpConfig() {
  // Test SMTP configuration
  const { data: smtpConfig, error: smtpError } = await supabase.rpc('get_smtp_config')
  if (smtpError) {
    console.error('Error fetching SMTP config:', smtpError)
  } else {
    console.log('SMTP Config:', smtpConfig)
  }
}

async function testSignup() {
  console.log('Environment:', {
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? 'Set (starts with: ' + process.env.SENDGRID_API_KEY.substring(0, 5) + ')' : 'Not set',
    NODE_ENV: process.env.NODE_ENV,
  })
  
  await testSmtpConfig()
  
  const { data, error } = await supabase.auth.signUp({
    email: 'test@example.com',
    password: 'testpassword123',
    options: {
      emailRedirectTo: 'http://localhost:5185/onboarding/country',
      data: {
        email_confirm_required: true
      }
    }
  })

  if (error) {
    console.error('Signup Error:', error)
  } else {
    console.log('Signup Success:', JSON.stringify(data, null, 2))
    console.log('\nCheck your email testing interface at: http://localhost:54324')
  }
}

testSignup() 