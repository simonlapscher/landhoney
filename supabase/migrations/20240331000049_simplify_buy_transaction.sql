-- Drop existing function
DROP FUNCTION IF EXISTS process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL);

-- Recreate with simplified flow
CREATE OR REPLACE FUNCTION process_buy_transaction(
    p_transaction_id UUID,
    p_pool_id UUID,
    p_price_per_token DECIMAL,
    p_pool_main_asset_price DECIMAL DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_transaction RECORD;
    v_user_id UUID;
    v_asset_id UUID;
    v_asset_type TEXT;
    v_payment_method TEXT;
    v_total_to_pay DECIMAL;
    v_usd_asset_id UUID;
    v_user_balance RECORD;
    v_pool_asset RECORD;
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
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE LOG 'Transaction not found or not pending: %', p_transaction_id;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Transaction not found or not in pending status'
        );
    END IF;

    -- Store commonly used values
    v_user_id := v_transaction.user_id;
    v_asset_id := v_transaction.asset_id;
    v_asset_type := v_transaction.asset_type;
    v_payment_method := v_transaction.metadata->>'payment_method';

    -- Calculate total payment including fee
    v_total_to_pay := v_transaction.amount * p_price_per_token + 
        COALESCE((v_transaction.metadata->>'fee_usd')::DECIMAL, 0);

    -- Get USD asset ID
    SELECT id INTO v_usd_asset_id
    FROM assets
    WHERE symbol = 'USD';

    -- Handle USD balance payment
    IF v_payment_method = 'usd_balance' THEN
        -- Check user's USD balance
        SELECT *
        INTO v_user_balance
        FROM user_balances
        WHERE user_id = v_user_id 
        AND asset_id = v_usd_asset_id
        FOR UPDATE;

        IF NOT FOUND OR v_user_balance.balance < v_total_to_pay THEN
            RAISE LOG 'Insufficient USD balance. Required: %, Available: %',
                v_total_to_pay,
                COALESCE(v_user_balance.balance, 0);
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Insufficient USD balance. Required: %s, Available: %s',
                    v_total_to_pay::text,
                    COALESCE(v_user_balance.balance, 0)::text)
            );
        END IF;

        -- Deduct USD from user's balance
        UPDATE user_balances
        SET balance = balance - v_total_to_pay,
            updated_at = NOW()
        WHERE user_id = v_user_id 
        AND asset_id = v_usd_asset_id;
    END IF;

    -- If this is a pool transaction, handle pool balance
    IF p_pool_id IS NOT NULL THEN
        -- Check pool balance
        SELECT *
        INTO v_pool_asset
        FROM pool_assets
        WHERE pool_id = p_pool_id 
        AND asset_id = v_asset_id
        FOR UPDATE;

        IF NOT FOUND OR v_pool_asset.balance < v_transaction.amount THEN
            RAISE LOG 'Insufficient pool balance. Required: %, Available: %',
                v_transaction.amount,
                COALESCE(v_pool_asset.balance, 0);
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Insufficient pool balance. Required: %s, Available: %s',
                    v_transaction.amount::text,
                    COALESCE(v_pool_asset.balance, 0)::text)
            );
        END IF;

        -- Update pool's asset balance
        UPDATE pool_assets
        SET balance = balance - v_transaction.amount,
            updated_at = NOW()
        WHERE pool_id = p_pool_id 
        AND asset_id = v_asset_id;

        -- Add USD to pool balance
        INSERT INTO pool_assets (
            pool_id,
            asset_id,
            balance,
            created_at,
            updated_at
        )
        VALUES (
            p_pool_id,
            v_usd_asset_id,
            v_total_to_pay,
            NOW(),
            NOW()
        )
        ON CONFLICT (pool_id, asset_id)
        DO UPDATE SET 
            balance = pool_assets.balance + v_total_to_pay,
            updated_at = NOW();
    END IF;

    -- Add asset to user's balance
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
        v_asset_id,
        v_transaction.amount,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, asset_id)
    DO UPDATE SET
        balance = user_balances.balance + v_transaction.amount,
        updated_at = NOW(),
        last_transaction_at = NOW();

    -- Update transaction status
    UPDATE transactions
    SET 
        status = 'completed',
        completed_at = NOW(),
        price_per_token = p_price_per_token,
        total_paid = v_total_to_pay,
        updated_at = NOW()
    WHERE id = p_transaction_id
    RETURNING * INTO v_transaction;

    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'transaction', row_to_json(v_transaction)
    );

EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in process_buy_transaction: % %', SQLERRM, SQLSTATE;
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL) TO authenticated; 