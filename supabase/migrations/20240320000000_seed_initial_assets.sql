-- Create UUIDs for assets
DO $$
DECLARE
    debt1_id UUID := gen_random_uuid();
    debt2_id UUID := gen_random_uuid();
    honey_id UUID := gen_random_uuid();
    honeyx_id UUID := gen_random_uuid();
    debt5_id UUID := gen_random_uuid();
    debt6_id UUID := gen_random_uuid();
BEGIN

-- Insert base assets
INSERT INTO public.assets (id, name, type, main_image, description, created_at, updated_at, symbol, price_per_token, decimals, token_supply, min_investment, max_investment)
VALUES
  (debt1_id, 'Modern Single Family Home', 'debt', 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/TX-1.png', NULL, NOW(), NOW(), 'DEBT1', 1.00, 8, 750000, 1000, 750000),
  (debt2_id, 'Luxury Beachfront Property', 'debt', 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/mortgage-4.jpeg', NULL, NOW(), NOW(), 'DEBT2', 1.00, 8, 1200000, 1000, 1200000),
  (honey_id, 'Honey', 'commodity', 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/honey.png', '100% gold-backed token. Follows the price of gold.', NOW(), NOW(), 'HONEY', 2500.00, 8, 100000, 100, 10000),
  (honeyx_id, 'HoneyX', 'commodity', 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/honeyx.png', 'Stake your Honey and earn platform revenue', NOW(), NOW(), 'HONEYX', 1800.00, 8, 100000, 100, 10000),
  (debt5_id, 'Multi-Family Residential Complex', 'debt', 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/mortgage-7.jpg', NULL, NOW(), NOW(), 'DEBT5', 1.00, 8, 2000000, 1000, 2000000),
  (debt6_id, 'Downtown Commercial Office', 'debt', 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/mortgage-8.jpg', NULL, NOW(), NOW(), 'DEBT6', 1.00, 8, 3500000, 1000, 3500000);

-- Insert debt assets details
INSERT INTO public.debt_assets (asset_id, location, apr, ltv, term, funding_goal, funded_amount, remaining_amount)
VALUES
  (debt1_id, 'Beverly Hills, CA', 9.5, 65, '12 months', 350000, 245000, 105000),
  (debt2_id, 'Miami Beach, FL', 10.2, 70, '24 months', 650000, 162500, 487500),
  (debt5_id, 'Austin, TX', 8.8, 68, '18 months', 450000, 382500, 67500),
  (debt6_id, 'Seattle, WA', 9.8, 56, '36 months', 800000, 40000, 760000);

-- Insert initial prices for commodity assets
INSERT INTO public.asset_prices (asset_id, price, timestamp)
VALUES
  (honey_id, 2500.00, NOW()),  -- Initial price for Honey
  (honeyx_id, 1800.00, NOW());  -- Initial price for HoneyX

END $$; 