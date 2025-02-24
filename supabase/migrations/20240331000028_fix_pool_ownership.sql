-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_staking_positions_trigger ON transactions;
DROP FUNCTION IF EXISTS update_staking_positions();

-- Reset all staking-related data
BEGIN;

-- Delete all staking positions
DELETE FROM staking_positions;

-- Reset pool assets
UPDATE pool_assets 
SET balance = 0;

-- Reset pool TVL
UPDATE pools 
SET total_value_locked = 0;

-- Convert BTCX to BTC and handle BTCPS
WITH btc_assets AS (
  SELECT id, symbol 
  FROM assets 
  WHERE symbol IN ('BTC', 'BTCX', 'BTCPS')
)
UPDATE user_balances ub
SET 
  balance = ub.balance + COALESCE(
    (SELECT balance 
     FROM user_balances ub2 
     WHERE ub2.asset_id = (SELECT id FROM btc_assets WHERE symbol = 'BTCX')
     AND ub2.user_id = ub.user_id),
    0
  ),
  updated_at = NOW()
WHERE ub.asset_id = (SELECT id FROM btc_assets WHERE symbol = 'BTC')
AND EXISTS (
  SELECT 1 
  FROM user_balances ub2 
  WHERE ub2.asset_id = (SELECT id FROM btc_assets WHERE symbol = 'BTCX')
  AND ub2.user_id = ub.user_id
);

-- Convert HONEYX to HONEY and handle HONEYPS
WITH honey_assets AS (
  SELECT id, symbol 
  FROM assets 
  WHERE symbol IN ('HONEY', 'HONEYX', 'HONEYPS')
)
UPDATE user_balances ub
SET 
  balance = ub.balance + COALESCE(
    (SELECT balance 
     FROM user_balances ub2 
     WHERE ub2.asset_id = (SELECT id FROM honey_assets WHERE symbol = 'HONEYX')
     AND ub2.user_id = ub.user_id),
    0
  ),
  updated_at = NOW()
WHERE ub.asset_id = (SELECT id FROM honey_assets WHERE symbol = 'HONEY')
AND EXISTS (
  SELECT 1 
  FROM user_balances ub2 
  WHERE ub2.asset_id = (SELECT id FROM honey_assets WHERE symbol = 'HONEYX')
  AND ub2.user_id = ub.user_id
);

-- Delete BTCX, HONEYX, BTCPS, and HONEYPS balances
DELETE FROM user_balances ub
USING assets a
WHERE ub.asset_id = a.id
AND a.symbol IN ('BTCX', 'HONEYX', 'BTCPS', 'HONEYPS');

COMMIT;

-- Now proceed with the rest of the migration...

-- Drop existing view and trigger first
DROP VIEW IF EXISTS pool_ownership;
DROP TRIGGER IF EXISTS update_staking_positions_trigger ON transactions;
DROP FUNCTION IF EXISTS calculate_pool_ownership(UUID, UUID);
DROP FUNCTION IF EXISTS update_staking_positions();
DROP FUNCTION IF EXISTS update_pool_assets(UUID, UUID, DECIMAL, BOOLEAN);
DROP FUNCTION IF EXISTS calculate_pool_tvl(UUID);

-- Create function to calculate pool ownership percentage dynamically
CREATE OR REPLACE FUNCTION calculate_pool_ownership(
    p_user_id UUID,
    p_pool_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_user_shares DECIMAL := 0;
    v_total_shares DECIMAL := 0;
BEGIN
    -- Get user's share count (BTCPS/HONEYPS)
    SELECT COALESCE(ub.balance, 0)
    INTO v_user_shares
    FROM user_balances ub
    JOIN assets a ON a.id = ub.asset_id
    WHERE ub.user_id = p_user_id
    AND a.symbol IN ('BTCPS', 'HONEYPS');

    -- Get total shares in the pool
    SELECT COALESCE(pa.balance, 0)
    INTO v_total_shares
    FROM pool_assets pa
    JOIN assets a ON a.id = pa.asset_id
    WHERE pa.pool_id = p_pool_id
    AND a.symbol IN ('BTCPS', 'HONEYPS');

    -- Calculate ownership percentage
    IF v_total_shares > 0 THEN
        RETURN v_user_shares / v_total_shares;
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create view for pool ownership
CREATE VIEW pool_ownership AS
WITH user_pool_shares AS (
    SELECT 
        ub.user_id,
        ub.balance as user_shares,
        pa.balance as total_shares,
        a.symbol
    FROM user_balances ub
    JOIN assets a ON a.id = ub.asset_id
    JOIN pool_assets pa ON pa.asset_id = a.id
    WHERE a.symbol IN ('BTCPS', 'HONEYPS')
)
SELECT 
    user_id,
    user_shares,
    total_shares,
    symbol
FROM user_pool_shares;

-- Create debug log table
CREATE TABLE IF NOT EXISTS debug_pool_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type TEXT,
    pool_id UUID,
    asset_symbol TEXT,
    previous_balance DECIMAL,
    new_balance DECIMAL,
    change_amount DECIMAL,
    transaction_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to log debug info
CREATE OR REPLACE FUNCTION log_pool_operation(
    p_operation TEXT,
    p_pool_id UUID,
    p_asset_id UUID,
    p_prev_balance DECIMAL,
    p_new_balance DECIMAL,
    p_change DECIMAL,
    p_transaction_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO debug_pool_operations (
        operation_type,
        pool_id,
        asset_symbol,
        previous_balance,
        new_balance,
        change_amount,
        transaction_id,
        details
    )
    SELECT 
        p_operation,
        p_pool_id,
        a.symbol,
        p_prev_balance,
        p_new_balance,
        p_change,
        p_transaction_id,
        p_details
    FROM assets a
    WHERE a.id = p_asset_id;
END;
$$ LANGUAGE plpgsql;

-- Modify update_pool_assets to include detailed logging
CREATE OR REPLACE FUNCTION update_pool_assets(
    p_pool_id UUID,
    p_asset_id UUID,
    p_amount DECIMAL,
    p_is_add BOOLEAN,
    p_operation_type TEXT DEFAULT 'unknown'
) RETURNS void AS $$
DECLARE
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
BEGIN
    -- Get current balance with detailed logging
    SELECT balance INTO v_current_balance
    FROM pool_assets
    WHERE pool_id = p_pool_id AND asset_id = p_asset_id;

    -- Log initial state
    PERFORM log_pool_operation(
        p_operation_type || '_start',
        p_pool_id,
        p_asset_id,
        v_current_balance,
        NULL,
        p_amount,
        NULL,
        jsonb_build_object('is_add', p_is_add)
    );

    -- Calculate new balance
    IF v_current_balance IS NULL THEN
        v_new_balance := p_amount;
    ELSE
        v_new_balance := CASE 
            WHEN p_is_add THEN v_current_balance + p_amount
            ELSE GREATEST(0, v_current_balance - p_amount)
        END;
    END IF;

    -- Update or insert new balance
    INSERT INTO pool_assets (
        pool_id,
        asset_id,
        balance,
        created_at,
        updated_at
    ) VALUES (
        p_pool_id,
        p_asset_id,
        v_new_balance,
        NOW(),
        NOW()
    )
    ON CONFLICT (pool_id, asset_id)
    DO UPDATE SET
        balance = v_new_balance,
        updated_at = NOW();

    -- Log final state
    PERFORM log_pool_operation(
        p_operation_type || '_complete',
        p_pool_id,
        p_asset_id,
        v_current_balance,
        v_new_balance,
        p_amount,
        NULL,
        jsonb_build_object(
            'is_add', p_is_add,
            'calculation_type', CASE WHEN v_current_balance IS NULL THEN 'initial' ELSE 'update' END
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate TVL
CREATE OR REPLACE FUNCTION calculate_pool_tvl(p_pool_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_tvl DECIMAL;
BEGIN
    SELECT COALESCE(SUM(pa.balance * a.price_per_token), 0)
    INTO v_tvl
    FROM pool_assets pa
    JOIN assets a ON a.id = pa.asset_id
    WHERE pa.pool_id = p_pool_id
    AND a.symbol NOT IN ('BTCPS', 'HONEYPS');

    RETURN v_tvl;
END;
$$ LANGUAGE plpgsql;

-- Modify process_debt_purchase to include operation context
CREATE OR REPLACE FUNCTION process_debt_purchase(
    p_pool_id UUID,
    p_btcx_asset_id UUID,
    p_debt_asset_id UUID,
    p_amount DECIMAL,
    p_price_in_btc DECIMAL
) RETURNS void AS $$
DECLARE
    v_btcx_balance DECIMAL;
    v_btc_reduction DECIMAL;
BEGIN
    -- Log start of debt purchase
    PERFORM log_pool_operation(
        'debt_purchase_start',
        p_pool_id,
        p_btcx_asset_id,
        NULL,
        NULL,
        p_price_in_btc,
        NULL,
        jsonb_build_object(
            'debt_amount', p_amount,
            'price_in_btc', p_price_in_btc
        )
    );

    -- Get current BTCX balance
    SELECT balance INTO v_btcx_balance
    FROM pool_assets
    WHERE pool_id = p_pool_id AND asset_id = p_btcx_asset_id;

    -- Calculate BTC reduction
    v_btc_reduction := p_price_in_btc;

    -- Log pre-update state
    PERFORM log_pool_operation(
        'debt_purchase_btcx_update',
        p_pool_id,
        p_btcx_asset_id,
        v_btcx_balance,
        v_btcx_balance - v_btc_reduction,
        v_btc_reduction,
        NULL,
        jsonb_build_object(
            'operation', 'subtract',
            'reason', 'debt_purchase'
        )
    );

    -- Update BTCX balance
    UPDATE pool_assets
    SET 
        balance = balance - v_btc_reduction,
        updated_at = NOW()
    WHERE pool_id = p_pool_id 
    AND asset_id = p_btcx_asset_id;

    -- Add DEBT1 to pool
    PERFORM update_pool_assets(
        p_pool_id,
        p_debt_asset_id,
        p_amount,
        TRUE,
        'debt_purchase'
    );

    -- Recalculate pool TVL
    PERFORM calculate_pool_tvl(p_pool_id);

    -- Log completion
    PERFORM log_pool_operation(
        'debt_purchase_complete',
        p_pool_id,
        p_btcx_asset_id,
        v_btcx_balance,
        v_btcx_balance - v_btc_reduction,
        v_btc_reduction,
        NULL,
        jsonb_build_object(
            'final_btcx_balance', v_btcx_balance - v_btc_reduction,
            'debt_amount_added', p_amount
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Create or replace the update_staking_positions function
CREATE OR REPLACE FUNCTION update_staking_positions()
RETURNS TRIGGER AS $$
DECLARE
    v_pool_id UUID;
    v_shares_asset_id UUID;
    v_shares_amount DECIMAL;
    v_btcx_asset_id UUID;
    v_honeyx_asset_id UUID;
    v_asset_symbol TEXT;
BEGIN
    IF NEW.type = 'stake' AND NEW.status = 'completed' THEN
        -- Get the asset symbol first
        SELECT symbol INTO v_asset_symbol
        FROM assets
        WHERE id = NEW.asset_id;

        -- Log the asset being staked
        RAISE NOTICE 'Processing stake for asset: %', v_asset_symbol;

        -- Get the appropriate pool ID and shares asset ID
        SELECT p.id, a.id INTO v_pool_id, v_shares_asset_id
        FROM pools p
        CROSS JOIN assets a
        WHERE p.type = (
            CASE 
                WHEN v_asset_symbol = 'BTC' THEN 'bitcoin'::pool_type
                WHEN v_asset_symbol = 'HONEY' THEN 'honey'::pool_type
            END
        )
        AND a.symbol = (
            CASE 
                WHEN v_asset_symbol = 'BTC' THEN 'BTCPS'
                WHEN v_asset_symbol = 'HONEY' THEN 'HONEYPS'
            END
        );

        -- Log pool lookup results
        RAISE NOTICE 'Pool lookup results - pool_id: %, shares_asset_id: %', v_pool_id, v_shares_asset_id;

        -- Verify we found the pool and shares asset
        IF v_pool_id IS NULL THEN
            RAISE EXCEPTION 'Pool not found for asset: %', v_asset_symbol;
        END IF;

        IF v_shares_asset_id IS NULL THEN
            RAISE EXCEPTION 'Shares asset not found for asset: %', v_asset_symbol;
        END IF;

        -- Get BTCX/HONEYX asset ID
        SELECT id INTO v_btcx_asset_id FROM assets WHERE symbol = 'BTCX';
        SELECT id INTO v_honeyx_asset_id FROM assets WHERE symbol = 'HONEYX';

        -- Log start of staking operation
        PERFORM log_pool_operation(
            'stake_start',
            v_pool_id,
            CASE 
                WHEN v_asset_symbol = 'BTC' THEN v_btcx_asset_id
                ELSE v_honeyx_asset_id
            END,
            NULL,
            NULL,
            NEW.amount,
            NEW.id,
            jsonb_build_object('transaction_type', NEW.type)
        );

        -- Calculate shares amount (1:1 for now)
        v_shares_amount := NEW.amount;

        -- Insert or update pool shares balance
        INSERT INTO pool_assets (
            pool_id,
            asset_id,
            balance,
            created_at,
            updated_at
        ) VALUES (
            v_pool_id,
            v_shares_asset_id,
            v_shares_amount,
            NOW(),
            NOW()
        ) ON CONFLICT (pool_id, asset_id) 
        DO UPDATE SET
            balance = pool_assets.balance + v_shares_amount,
            updated_at = NOW();

        -- Insert or update pool's main asset (BTCX/HONEYX) balance
        INSERT INTO pool_assets (
            pool_id,
            asset_id,
            balance,
            created_at,
            updated_at
        ) VALUES (
            v_pool_id,
            CASE 
                WHEN v_asset_symbol = 'BTC' THEN v_btcx_asset_id
                ELSE v_honeyx_asset_id
            END,
            NEW.amount,
            NOW(),
            NOW()
        ) ON CONFLICT (pool_id, asset_id) 
        DO UPDATE SET
            balance = pool_assets.balance + NEW.amount,
            updated_at = NOW();

        -- Update user's share balance
        INSERT INTO user_balances (
            user_id,
            asset_id,
            balance,
            created_at,
            updated_at,
            last_transaction_at
        ) VALUES (
            NEW.user_id,
            v_shares_asset_id,
            v_shares_amount,
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id, asset_id)
        DO UPDATE SET
            balance = user_balances.balance + v_shares_amount,
            updated_at = NOW(),
            last_transaction_at = NOW();

        -- Update pool's TVL
        UPDATE pools
        SET 
            total_value_locked = calculate_pool_tvl(v_pool_id),
            updated_at = NOW()
        WHERE id = v_pool_id;

        -- Log completion of staking operation
        PERFORM log_pool_operation(
            'stake_complete',
            v_pool_id,
            CASE 
                WHEN v_asset_symbol = 'BTC' THEN v_btcx_asset_id
                ELSE v_honeyx_asset_id
            END,
            NULL,
            (SELECT balance FROM pool_assets WHERE pool_id = v_pool_id AND asset_id = CASE 
                WHEN v_asset_symbol = 'BTC' THEN v_btcx_asset_id
                ELSE v_honeyx_asset_id
            END),
            0,
            NEW.id,
            jsonb_build_object(
                'final_tvl', (SELECT total_value_locked FROM pools WHERE id = v_pool_id),
                'shares_balance', (SELECT balance FROM pool_assets WHERE pool_id = v_pool_id AND asset_id = v_shares_asset_id)
            )
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error details
        RAISE NOTICE 'Error in update_staking_positions: % %', SQLERRM, SQLSTATE;
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_staking_positions_trigger
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_staking_positions();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_pool_ownership(UUID, UUID) TO authenticated;
GRANT SELECT ON pool_ownership TO authenticated;
GRANT EXECUTE ON FUNCTION update_pool_assets(UUID, UUID, DECIMAL, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_pool_tvl(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_debt_purchase(UUID, UUID, UUID, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION update_staking_positions() TO authenticated;
GRANT EXECUTE ON FUNCTION log_pool_operation(TEXT, UUID, UUID, DECIMAL, DECIMAL, DECIMAL, UUID, JSONB) TO authenticated;

-- Function to process sell transactions
CREATE OR REPLACE FUNCTION process_sell_transaction(
    p_transaction_id UUID,
    p_pool_id UUID,
    p_price_per_token DECIMAL,
    p_pool_reduction DECIMAL,
    p_user_tokens DECIMAL,
    p_usd_value DECIMAL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_transaction RECORD;
    v_user_id UUID;
    v_asset_id UUID;
    v_asset_type TEXT;
    v_payment_asset_id UUID;
    v_main_asset_id UUID;
    v_pool_type TEXT;
    v_initial_pool_balance DECIMAL;
    v_initial_user_balance DECIMAL;
    v_usd_asset_id UUID;
    v_btcx_asset_id UUID;
BEGIN
    -- Get transaction details with asset info
    SELECT 
        t.*,
        a.type as asset_type,
        a.symbol as asset_symbol
    INTO v_transaction
    FROM transactions t
    JOIN assets a ON a.id = t.asset_id
    WHERE t.id = p_transaction_id 
    AND t.status = 'pending'
    FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found or not in pending status';
    END IF;

    -- Log the start of the sell transaction process
    PERFORM log_pool_operation(
        'sell_transaction_start',
        p_pool_id,
        v_transaction.asset_id,
        NULL,
        NULL,
        p_user_tokens,
        p_transaction_id,
        jsonb_build_object(
            'price_per_token', p_price_per_token,
            'pool_reduction', p_pool_reduction,
            'usd_value', p_usd_value
        )
    );

    -- Store values for convenience
    v_user_id := v_transaction.user_id;
    v_asset_id := v_transaction.asset_id;

    -- Get USD asset ID
    SELECT id INTO v_usd_asset_id
    FROM assets
    WHERE symbol = 'USD';

    -- Get BTCX asset ID for pool operations
    SELECT id INTO v_btcx_asset_id
    FROM assets
    WHERE symbol = 'BTCX';

    -- Get pool's main asset ID
    SELECT 
        main_asset_id,
        type
    INTO v_main_asset_id, v_pool_type
    FROM pools
    WHERE id = p_pool_id;

    -- Get initial balances for logging
    SELECT balance INTO v_initial_pool_balance
    FROM pool_assets
    WHERE pool_id = p_pool_id 
    AND asset_id = v_btcx_asset_id;

    SELECT balance INTO v_initial_user_balance
    FROM user_balances
    WHERE user_id = v_user_id
    AND asset_id = v_asset_id;

    -- Verify user has enough balance
    IF v_initial_user_balance < p_user_tokens THEN
        RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', 
            p_user_tokens, v_initial_user_balance;
    END IF;

    -- Update transaction status
    UPDATE transactions
    SET 
        pool_id = p_pool_id,
        price_per_token = p_price_per_token,
        status = 'completed',
        completed_at = NOW(),
        metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{sell_details}',
            jsonb_build_object(
                'pool_reduction', p_pool_reduction,
                'usd_value', p_usd_value,
                'pool_type', v_pool_type
            )
        )
    WHERE id = p_transaction_id
    RETURNING * INTO v_transaction;

    -- Update user's token balance (decrease)
    UPDATE user_balances
    SET 
        balance = balance - p_user_tokens,
        updated_at = NOW(),
        last_transaction_at = NOW()
    WHERE user_id = v_user_id
    AND asset_id = v_asset_id;

    -- Log user balance update
    PERFORM log_pool_operation(
        'user_balance_update',
        NULL,
        v_asset_id,
        v_initial_user_balance,
        v_initial_user_balance - p_user_tokens,
        -p_user_tokens,
        p_transaction_id,
        jsonb_build_object('user_id', v_user_id)
    );

    -- Update user's USD balance (increase)
    INSERT INTO user_balances (
        user_id, 
        asset_id, 
        balance,
        created_at,
        updated_at,
        last_transaction_at
    )
    VALUES (
        v_user_id,
        v_usd_asset_id,
        p_usd_value,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, asset_id)
    DO UPDATE SET 
        balance = user_balances.balance + p_usd_value,
        updated_at = NOW(),
        last_transaction_at = NOW();

    -- Update pool assets
    IF p_pool_reduction > 0 THEN
        -- Decrease pool's BTCX balance
        PERFORM update_pool_assets(
            p_pool_id,
            v_btcx_asset_id,
            p_pool_reduction,
            FALSE,
            'sell_transaction_btcx_reduction'
        );
    END IF;

    -- Add debt tokens to pool
    PERFORM update_pool_assets(
        p_pool_id,
        v_asset_id,
        p_user_tokens,
        TRUE,
        'sell_transaction_debt_asset'
    );

    -- Recalculate pool TVL
    UPDATE pools
    SET total_value_locked = calculate_pool_tvl(p_pool_id)
    WHERE id = p_pool_id;

    -- Log completion of sell transaction
    PERFORM log_pool_operation(
        'sell_transaction_complete',
        p_pool_id,
        v_asset_id,
        NULL,
        NULL,
        p_user_tokens,
        p_transaction_id,
        jsonb_build_object(
            'usd_value', p_usd_value,
            'pool_reduction', p_pool_reduction,
            'btcx_balance_after', (
                SELECT balance 
                FROM pool_assets 
                WHERE pool_id = p_pool_id 
                AND asset_id = v_btcx_asset_id
            )
        )
    );

    RETURN jsonb_build_object(
        'transaction_id', v_transaction.id,
        'status', 'completed',
        'user_tokens_sold', p_user_tokens,
        'usd_value_received', p_usd_value,
        'pool_reduction', p_pool_reduction
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Log error
        PERFORM log_pool_operation(
            'sell_transaction_error',
            p_pool_id,
            v_asset_id,
            NULL,
            NULL,
            NULL,
            p_transaction_id,
            jsonb_build_object(
                'error', SQLERRM,
                'error_detail', SQLSTATE
            )
        );
        RAISE;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION process_sell_transaction(UUID, UUID, DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO authenticated; 