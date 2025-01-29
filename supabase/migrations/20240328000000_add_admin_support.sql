-- Add is_admin column to auth.users
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create initial admin users
INSERT INTO auth.users (email, password, is_admin)
VALUES 
  ('simon@landhoney.io', crypt('landhoney1', gen_salt('bf')), true),
  ('alex@landhoney.io', crypt('landhoney2', gen_salt('bf')), true);

-- Update RLS policies for admin access
-- Allow admins to view all transactions
CREATE POLICY "Admins can view all transactions"
ON transactions FOR SELECT
USING ((SELECT is_admin FROM auth.users WHERE id = auth.uid()));

-- Allow admins to update transactions
CREATE POLICY "Admins can update transactions"
ON transactions FOR UPDATE
USING ((SELECT is_admin FROM auth.users WHERE id = auth.uid()));

-- Allow admins to view all user balances
CREATE POLICY "Admins can view all balances"
ON user_balances FOR SELECT
USING ((SELECT is_admin FROM auth.users WHERE id = auth.uid()));

-- Allow admins to update user balances
CREATE POLICY "Admins can update balances"
ON user_balances FOR UPDATE
USING ((SELECT is_admin FROM auth.users WHERE id = auth.uid())); 