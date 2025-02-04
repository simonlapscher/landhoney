-- Create the mint_tokens function
CREATE OR REPLACE FUNCTION mint_tokens(
    p_user_id UUID,
    p_asset_id UUID,
    p_amount DECIMAL,
    p_price_per_token DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Check if the current user is an admin using the check_admin_status function
    SELECT check_admin_status() INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Only admin users can mint tokens';
    END IF;

    -- Insert the minting transaction
    INSERT INTO transactions (
        user_id,
        asset_id,
        type,
        amount,
        price_per_token,
        status,
        created_at
    ) VALUES (
        p_user_id,
        p_asset_id,
        'earn',
        p_amount,
        p_price_per_token,
        'completed',
        NOW()
    );

    -- Update user balance
    INSERT INTO user_balances (user_id, asset_id, balance)
    VALUES (p_user_id, p_asset_id, p_amount)
    ON CONFLICT (user_id, asset_id)
    DO UPDATE SET balance = user_balances.balance + EXCLUDED.balance;
END;
$$;

-- Revoke all permissions from public
REVOKE ALL ON FUNCTION mint_tokens(UUID, UUID, DECIMAL, DECIMAL) FROM PUBLIC;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION mint_tokens(UUID, UUID, DECIMAL, DECIMAL) TO authenticated; 