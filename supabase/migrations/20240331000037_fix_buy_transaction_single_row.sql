-- Drop existing function
DROP FUNCTION IF EXISTS process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL);

-- Recreate with proper single row return
CREATE OR REPLACE FUNCTION process_buy_transaction(
    p_transaction_id UUID,
    p_pool_id UUID,
    p_price_per_token DECIMAL,
    p_pool_main_asset_price DECIMAL DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_transaction transactions;
    v_user_id UUID;
    v_asset_id UUID;
    v_asset_type TEXT;
    v_payment_method TEXT;
    v_payment_amount DECIMAL;
    v_pool_type TEXT;
    v_pool_asset_id UUID;
BEGIN
    -- Get transaction details with FOR UPDATE to lock the row
    SELECT t.* INTO v_transaction
    FROM transactions t
    WHERE t.id = p_transaction_id
    AND t.status = 'pending'
    FOR UPDATE;

    -- Check if transaction exists and is pending
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Transaction not found or not in pending status',
            'transaction_id', p_transaction_id
        );
    END IF;

    -- Store values for convenience
    v_user_id := v_transaction.user_id;
    v_asset_id := v_transaction.asset_id;
    v_payment_method := v_transaction.metadata->>'payment_method';
    v_payment_amount := (v_transaction.metadata->>'usd_amount')::DECIMAL;

    -- Get asset type and pool type
    SELECT a.type, p.type 
    INTO v_asset_type, v_pool_type
    FROM assets a
    LEFT JOIN pools p ON p.id = p_pool_id
    WHERE a.id = v_asset_id;

    -- Get the correct pool asset ID based on pool type
    SELECT a.id INTO v_pool_asset_id
    FROM assets a
    WHERE a.symbol = CASE 
        WHEN v_pool_type = 'bitcoin' THEN 'BTCX'
        WHEN v_pool_type = 'honey' THEN 'HONEYX'
    END;

    -- Process the transaction based on payment method
    IF v_payment_method = 'usd_balance' THEN
        -- Check USD balance
        IF NOT EXISTS (
            SELECT 1 
            FROM user_balances 
            WHERE user_id = v_user_id 
            AND asset_id = (SELECT id FROM assets WHERE symbol = 'USD')
            AND balance >= v_payment_amount
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Insufficient USD balance',
                'transaction_id', p_transaction_id
            );
        END IF;

        -- Deduct USD balance
        UPDATE user_balances
        SET balance = balance - v_payment_amount,
            updated_at = NOW()
        WHERE user_id = v_user_id
        AND asset_id = (SELECT id FROM assets WHERE symbol = 'USD');
    END IF;

    -- Add tokens to user's balance
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

    -- If this is a pool transaction, update pool balances
    IF p_pool_id IS NOT NULL THEN
        -- Add asset to pool
        INSERT INTO pool_assets (
            pool_id,
            asset_id,
            balance,
            created_at,
            updated_at
        )
        VALUES (
            p_pool_id,
            v_asset_id,
            v_transaction.amount,
            NOW(),
            NOW()
        )
        ON CONFLICT (pool_id, asset_id)
        DO UPDATE SET
            balance = pool_assets.balance + v_transaction.amount,
            updated_at = NOW();

        -- Remove pool asset (BTCX/HONEYX)
        UPDATE pool_assets
        SET 
            balance = balance - v_payment_amount,
            updated_at = NOW()
        WHERE pool_id = p_pool_id
        AND asset_id = v_pool_asset_id;

        -- Recalculate pool TVL
        PERFORM calculate_pool_tvl(p_pool_id);
    END IF;

    -- Update transaction status
    UPDATE transactions
    SET 
        status = 'completed',
        price_per_token = p_price_per_token,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_transaction_id
    RETURNING * INTO v_transaction;

    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'transaction', row_to_json(v_transaction)
    );

EXCEPTION WHEN OTHERS THEN
    -- Return error response
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'transaction_id', p_transaction_id
    );
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL) TO authenticated; 