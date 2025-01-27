-- Create enum types
CREATE TYPE asset_type AS ENUM ('debt', 'equity', 'commodity');
CREATE TYPE transaction_type AS ENUM ('buy', 'sell', 'convert', 'earn');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- Create base assets table
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name TEXT NOT NULL,
    symbol TEXT NOT NULL UNIQUE,
    type asset_type NOT NULL,
    main_image TEXT,
    price_per_token NUMERIC(16,8) NOT NULL,
    decimals INTEGER NOT NULL DEFAULT 8,
    token_supply NUMERIC(24,8) NOT NULL,
    min_investment NUMERIC(16,8) NOT NULL,
    max_investment NUMERIC(16,8) NOT NULL,
    description TEXT,
    metadata JSONB,
    CONSTRAINT valid_investment_range CHECK (min_investment <= max_investment),
    CONSTRAINT positive_token_supply CHECK (token_supply > 0),
    CONSTRAINT positive_price CHECK (price_per_token > 0)
);

-- Create debt assets table
CREATE TABLE debt_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id),
    apr NUMERIC(5,2) NOT NULL,
    term_months INTEGER NOT NULL,
    loan_amount NUMERIC(16,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'sold_out', 'closed')),
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'USA',
    appraised_value NUMERIC(16,2) NOT NULL,
    loan_start_date TIMESTAMPTZ,
    loan_maturity_date TIMESTAMPTZ,
    images JSONB,
    documents JSONB,
    metadata JSONB,
    CONSTRAINT positive_loan_amount CHECK (loan_amount > 0),
    CONSTRAINT positive_appraised_value CHECK (appraised_value > 0),
    CONSTRAINT valid_loan_dates CHECK (loan_maturity_date > loan_start_date)
);

-- Create historical prices table
CREATE TABLE asset_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id),
    price NUMERIC(16,8) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT positive_historical_price CHECK (price > 0)
);

-- Create transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    asset_id UUID NOT NULL REFERENCES assets(id),
    type transaction_type NOT NULL,
    amount NUMERIC(24,8) NOT NULL,
    price_per_token NUMERIC(16,8) NOT NULL,
    status transaction_status NOT NULL DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    metadata JSONB,
    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT positive_transaction_price CHECK (price_per_token > 0)
);

-- Create user balances table
CREATE TABLE user_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    asset_id UUID NOT NULL REFERENCES assets(id),
    balance NUMERIC(24,8) NOT NULL DEFAULT 0,
    total_interest_earned NUMERIC(16,8) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_transaction_at TIMESTAMPTZ,
    CONSTRAINT positive_balance CHECK (balance >= 0),
    CONSTRAINT positive_interest CHECK (total_interest_earned >= 0),
    UNIQUE(user_id, asset_id)
);

-- Create admin actions table
CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

-- Create view for user balances with total value
CREATE VIEW user_balances_with_value AS
SELECT 
    ub.*,
    (ub.balance * a.price_per_token) as total_value
FROM user_balances ub
JOIN assets a ON a.id = ub.asset_id;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_balances_updated_at
    BEFORE UPDATE ON user_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_assets_type ON assets(type);
CREATE INDEX idx_debt_assets_status ON debt_assets(status);
CREATE INDEX idx_asset_prices_asset_timestamp ON asset_prices(asset_id, timestamp);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_asset ON transactions(asset_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_user_balances_user ON user_balances(user_id);
CREATE INDEX idx_user_balances_asset ON user_balances(asset_id);

-- Enable Row Level Security
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Assets: viewable by everyone
CREATE POLICY "Assets are viewable by everyone" ON assets
    FOR SELECT USING (true);

-- Debt Assets: viewable by everyone
CREATE POLICY "Debt assets are viewable by everyone" ON debt_assets
    FOR SELECT USING (true);

-- Asset Prices: viewable by everyone
CREATE POLICY "Asset prices are viewable by everyone" ON asset_prices
    FOR SELECT USING (true);

-- Transactions: users can view their own
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Balances: users can view their own
CREATE POLICY "Users can view their own balances" ON user_balances
    FOR SELECT USING (auth.uid() = user_id);

-- Create special reserve fund user if it doesn't exist
INSERT INTO auth.users (id, email)
SELECT 
    '00000000-0000-0000-0000-000000000000',
    'reserve@landhoney.com'
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000000'
); 