-- Create referral status enum
CREATE TYPE referral_status AS ENUM ('pending', 'approved', 'rejected');

-- Create referral codes table
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  total_referrals INTEGER DEFAULT 0,
  total_rewards DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_code_format CHECK (code ~ '^[A-Z0-9]{6,12}$')
);

-- Create referral requests table
CREATE TABLE referral_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status referral_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add referral columns to profiles table
ALTER TABLE profiles
ADD COLUMN used_referral_code TEXT REFERENCES referral_codes(code),
ADD COLUMN referral_status referral_status DEFAULT 'pending',
ADD COLUMN referral_investment_amount DECIMAL DEFAULT 0;

-- Create view for pending referral rewards
CREATE VIEW pending_referral_rewards AS
SELECT 
  p.id as profile_id,
  u.email as user_email,
  p.used_referral_code,
  p.referral_investment_amount,
  ru.email as referrer_email,
  p.created_at
FROM profiles p
JOIN auth.users u ON u.id = p.user_id
JOIN referral_codes rc ON rc.code = p.used_referral_code
JOIN auth.users ru ON ru.id = rc.referrer_id
WHERE p.referral_status = 'pending'
AND p.referral_investment_amount >= 5000;

-- Function to search users by email
CREATE OR REPLACE FUNCTION search_users_by_email(search_term TEXT)
RETURNS TABLE (id UUID, email TEXT)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email::TEXT
  FROM auth.users u
  WHERE u.email ILIKE '%' || search_term || '%'
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Function to create a referral code
CREATE OR REPLACE FUNCTION create_referral_code(p_code TEXT, p_referrer_id UUID)
RETURNS referral_codes
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result referral_codes;
BEGIN
  -- Verify code format
  IF NOT (p_code ~ '^[A-Z0-9]{6,12}$') THEN
    RAISE EXCEPTION 'Invalid code format. Must be 6-12 characters, letters and numbers only.';
  END IF;

  -- Check if user already has a code
  IF EXISTS (SELECT 1 FROM referral_codes WHERE referrer_id = p_referrer_id) THEN
    RAISE EXCEPTION 'User already has a referral code';
  END IF;

  -- Create the code
  INSERT INTO referral_codes (code, referrer_id)
  VALUES (p_code, p_referrer_id)
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to mark a referral as rewarded
CREATE OR REPLACE FUNCTION mark_referral_rewarded(p_profile_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code TEXT;
  v_investment_amount DECIMAL;
BEGIN
  -- Get referral details
  SELECT used_referral_code, referral_investment_amount
  INTO v_referral_code, v_investment_amount
  FROM profiles
  WHERE id = p_profile_id AND referral_status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found or not in pending status';
  END IF;

  -- Update profile status
  UPDATE profiles
  SET referral_status = 'approved'
  WHERE id = p_profile_id;

  -- Update referral code stats
  UPDATE referral_codes
  SET 
    total_referrals = total_referrals + 1,
    total_rewards = total_rewards + (v_investment_amount * 0.01), -- 1% reward
    updated_at = NOW()
  WHERE code = v_referral_code;
END;
$$ LANGUAGE plpgsql;

-- Set up RLS policies
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_requests ENABLE ROW LEVEL SECURITY;

-- Policies for referral_codes
CREATE POLICY "Users can view their own referral code"
  ON referral_codes FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid());

-- Policies for referral_requests
CREATE POLICY "Users can create their own referral request"
  ON referral_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own referral request"
  ON referral_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON pending_referral_rewards TO authenticated;
GRANT EXECUTE ON FUNCTION search_users_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_referral_code(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_referral_rewarded(UUID) TO authenticated; 