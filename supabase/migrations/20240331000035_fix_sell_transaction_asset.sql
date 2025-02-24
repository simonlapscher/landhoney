-- Drop the existing function
DROP FUNCTION IF EXISTS process_sell_transaction(UUID, UUID, DECIMAL, DECIMAL, DECIMAL, DECIMAL);

-- Recreate with proper pool asset handling
CREATE OR REPLACE FUNCTION process_sell_transaction(
    p_transaction_id UUID,
    p_pool_id UUID,
    p_price_per_token DECIMAL,
    p_pool_reduction DECIMAL,
    p_user_tokens DECIMAL,
    p_usd_value DECIMAL
)
RETURNS jsonb AS $$
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
    v_pool_asset_id UUID;
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

    -- Get pool's type and main asset
    SELECT 
        main_asset_id,
        type
    INTO v_main_asset_id, v_pool_type
    FROM pools
    WHERE id = p_pool_id;

    -- Get the correct pool asset ID based on pool type
    SELECT id INTO v_pool_asset_id
    FROM assets
    WHERE symbol = CASE 
        WHEN v_pool_type = 'bitcoin' THEN 'BTCX'
        WHEN v_pool_type = 'honey' THEN 'HONEYX'
    END;

    IF v_pool_asset_id IS NULL THEN
        RAISE EXCEPTION 'Pool asset not found for pool type: %', v_pool_type;
    END IF;

    -- Get initial balances for logging
    SELECT balance INTO v_initial_pool_balance
    FROM pool_assets
    WHERE pool_id = p_pool_id 
    AND asset_id = v_pool_asset_id;

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
                'pool_type', v_pool_type,
                'pool_asset', CASE 
                    WHEN v_pool_type = 'bitcoin' THEN 'BTCX'
                    WHEN v_pool_type = 'honey' THEN 'HONEYX'
                END
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
        -- Decrease pool's asset balance (BTCX or HONEYX)
        PERFORM update_pool_assets(
            p_pool_id,
            v_pool_asset_id,
            p_pool_reduction,
            FALSE,
            'sell_transaction_pool_asset_reduction'
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
            'pool_asset_balance_after', (
                SELECT balance 
                FROM pool_assets 
                WHERE pool_id = p_pool_id 
                AND asset_id = v_pool_asset_id
            ),
            'pool_asset_type', CASE 
                WHEN v_pool_type = 'bitcoin' THEN 'BTCX'
                WHEN v_pool_type = 'honey' THEN 'HONEYX'
            END
        )
    );

    RETURN jsonb_build_object(
        'transaction_id', v_transaction.id,
        'status', 'completed',
        'user_tokens_sold', p_user_tokens,
        'usd_value_received', p_usd_value,
        'pool_reduction', p_pool_reduction,
        'pool_asset', CASE 
            WHEN v_pool_type = 'bitcoin' THEN 'BTCX'
            WHEN v_pool_type = 'honey' THEN 'HONEYX'
        END
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
                'state', SQLSTATE,
                'pool_type', v_pool_type
            )
        );
        RAISE;
END;
$$ LANGUAGE plpgsql; 