-- Create assets table
create table if not exists assets (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    type text not null check (type in ('debt', 'commodity')),
    main_image text,
    description text,
    symbol text not null,
    price_per_token numeric not null,
    decimals integer not null default 18,
    token_supply numeric not null,
    min_investment numeric not null,
    max_investment numeric not null,
    -- Debt specific fields
    location text,
    apr numeric,
    ltv numeric,
    term text,
    term_months integer,
    loan_amount numeric,
    appraised_value numeric,
    funded_amount numeric default 0,
    remaining_amount numeric,
    total_supply numeric,
    available_supply numeric,
    images text[],
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Create transactions table
create table if not exists transactions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id),
    asset_id uuid not null references assets(id),
    type text not null check (type in ('buy', 'sell')),
    amount numeric not null,
    price_per_token numeric not null,
    status text not null check (status in ('pending', 'completed', 'failed', 'cancelled')),
    metadata jsonb,
    approved_at timestamp with time zone,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Create user_balances table
create table if not exists user_balances (
    user_id uuid not null references auth.users(id),
    asset_id uuid not null references assets(id),
    amount numeric not null default 0,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    primary key (user_id, asset_id)
);

-- Create indexes
create index if not exists idx_transactions_user_id on transactions(user_id);
create index if not exists idx_transactions_asset_id on transactions(asset_id);
create index if not exists idx_user_balances_user_id on user_balances(user_id);
create index if not exists idx_user_balances_asset_id on user_balances(asset_id);

-- Create trigger to update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_assets_updated_at
    before update on assets
    for each row
    execute function update_updated_at_column();

create trigger update_transactions_updated_at
    before update on transactions
    for each row
    execute function update_updated_at_column();

create trigger update_user_balances_updated_at
    before update on user_balances
    for each row
    execute function update_updated_at_column(); 