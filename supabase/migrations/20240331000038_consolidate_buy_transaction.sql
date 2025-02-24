-- Drop both existing functions
DROP FUNCTION IF EXISTS process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL, DECIMAL);

-- Create single, comprehensive function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION process_buy_transaction(
    p_transaction_id UUID,
    p_pool_id UUID,
    p_price_per_token DECIMAL,
    p_pool_main_asset_price DECIMAL DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_transaction RECORD;
    v_pool RECORD;
    v_asset RECORD;
    v_usd_asset_id UUID;
    v_pool_main_asset_amount DECIMAL;
    v_total_to_pay DECIMAL;
    v_fee DECIMAL;
    v_payment_method TEXT;
    v_user_balance DECIMAL;
    v_initial_pool_balance DECIMAL;
    v_is_pool_asset BOOLEAN;
    v_error_details jsonb;
BEGIN
    -- Get transaction details with asset info
    SELECT 
        t.*,
        a.symbol AS asset_symbol,
        a.type AS asset_type
    INTO v_transaction
    FROM transactions t
    JOIN assets a ON a.id = t.asset_id
    WHERE t.id = p_transaction_id 
    AND t.status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Transaction not found or not in pending status',
            'transaction_id', p_transaction_id
        );
    END IF;

    -- Check if asset is in a pool
    v_is_pool_asset := EXISTS (
        SELECT 1 
        FROM pool_assets pa
        WHERE pa.asset_id = v_transaction.asset_id
        AND pa.balance > 0
    );

    -- For pool assets, pool_id and pool_main_asset_price are required
    IF v_is_pool_asset AND (p_pool_id IS NULL OR p_pool_main_asset_price IS NULL) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Pool ID and pool main asset price are required for pool asset transactions',
            'transaction_id', p_transaction_id
        );
    END IF;

    -- Get USD asset ID for balance checks
    SELECT id INTO v_usd_asset_id
    FROM assets
    WHERE symbol = 'USD';
    
    IF v_usd_asset_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'USD asset not found',
            'transaction_id', p_transaction_id
        );
    END IF;

    -- Get payment method from metadata
    v_payment_method := v_transaction.metadata->>'payment_method';
    IF v_payment_method IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Payment method not specified in transaction metadata',
            'transaction_id', p_transaction_id
        );
    END IF;

    -- Calculate fee (0.5%)
    v_fee := v_transaction.amount * p_price_per_token * 0.005;
    v_total_to_pay := (v_transaction.amount * p_price_per_token) + v_fee;

    -- Handle different payment methods
    CASE v_payment_method
        WHEN 'usd_balance' THEN
            -- Check USD balance
            SELECT balance INTO v_user_balance
            FROM user_balances
            WHERE user_id = v_transaction.user_id
            AND asset_id = v_usd_asset_id;

            IF v_user_balance IS NULL OR v_user_balance < v_total_to_pay THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', format('Insufficient USD balance. Required: %s, Available: %s', v_total_to_pay, COALESCE(v_user_balance, 0)),
                    'transaction_id', p_transaction_id
                );
            END IF;

            -- Update USD balance
            UPDATE user_balances
            SET 
                balance = balance - v_total_to_pay,
                updated_at = NOW(),
                last_transaction_at = NOW()
            WHERE user_id = v_transaction.user_id
            AND asset_id = v_usd_asset_id;

        WHEN 'bank_account' THEN
            -- For bank account purchases, we proceed without additional checks
            NULL;

        WHEN 'usdc' THEN
            -- For USDC, verify the transfer has been confirmed
            IF NOT EXISTS (
                SELECT 1 FROM transactions 
                WHERE id = p_transaction_id 
                AND metadata->>'usdc_transfer_confirmed' = 'true'
            ) THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'USDC transfer not confirmed for transaction',
                    'transaction_id', p_transaction_id
                );
            END IF;

        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Unsupported payment method: %s', v_payment_method),
                'transaction_id', p_transaction_id
            );
    END CASE;

    -- Handle pool transactions
    IF p_pool_id IS NOT NULL THEN
        -- Get pool details
        SELECT p.*, ma.price_per_token as main_asset_price 
        INTO v_pool
        FROM pools p
        JOIN assets ma ON ma.id = p.main_asset_id
        WHERE p.id = p_pool_id;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Pool not found',
                'transaction_id', p_transaction_id
            );
        END IF;

        -- Get current pool balance
        SELECT balance INTO v_initial_pool_balance
        FROM pool_assets
        WHERE pool_id = p_pool_id
        AND asset_id = v_transaction.asset_id;

        IF v_initial_pool_balance < v_transaction.amount THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Insufficient pool balance',
                'transaction_id', p_transaction_id
            );
        END IF;

        -- Calculate main asset amount
        v_pool_main_asset_amount := v_total_to_pay / p_pool_main_asset_price;

        -- Update pool balances
        UPDATE pool_assets
        SET balance = balance - v_transaction.amount
        WHERE pool_id = p_pool_id 
        AND asset_id = v_transaction.asset_id;

        -- Add main asset to pool
        INSERT INTO pool_assets (pool_id, asset_id, balance)
        VALUES (p_pool_id, v_pool.main_asset_id, v_pool_main_asset_amount)
        ON CONFLICT (pool_id, asset_id)
        DO UPDATE SET balance = pool_assets.balance + v_pool_main_asset_amount;

        -- Update pool's TVL
        UPDATE pools
        SET 
            total_value_locked = total_value_locked + v_total_to_pay,
            updated_at = NOW()
        WHERE id = p_pool_id;
    END IF;

    -- Add tokens to user's balance
    INSERT INTO user_balances (
        user_id,
        asset_id,
        balance,
        created_at,
        updated_at,
        last_transaction_at
    ) VALUES (
        v_transaction.user_id,
        v_transaction.asset_id,
        v_transaction.amount,
        NOW(),
        NOW(),
        NOW()
    ) ON CONFLICT (user_id, asset_id) DO UPDATE
    SET 
        balance = user_balances.balance + v_transaction.amount,
        updated_at = NOW(),
        last_transaction_at = NOW();

    -- For debt assets, update funded amount
    IF v_transaction.asset_type = 'debt' THEN
        UPDATE debt_assets
        SET 
            funded_amount = funded_amount + v_transaction.amount,
            updated_at = NOW()
        WHERE asset_id = v_transaction.asset_id;
    END IF;

    -- Update transaction status
    UPDATE transactions
    SET 
        status = 'completed',
        completed_at = NOW(),
        price_per_token = p_price_per_token,
        amount = v_transaction.amount,
        metadata = jsonb_set(
            jsonb_set(
                jsonb_set(
                    metadata,
                    '{final_amount}',
                    to_jsonb(v_transaction.amount)
                ),
                '{final_price}',
                to_jsonb(p_price_per_token)
            ),
            '{final_total_paid}',
            to_jsonb(v_total_to_pay)
        ),
        updated_at = NOW()
    WHERE id = p_transaction_id
    RETURNING * INTO v_transaction;

    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'transaction', jsonb_build_object(
            'id', v_transaction.id,
            'user_id', v_transaction.user_id,
            'asset_id', v_transaction.asset_id,
            'type', v_transaction.type,
            'amount', v_transaction.amount,
            'price_per_token', v_transaction.price_per_token,
            'total_paid', v_total_to_pay,
            'fee', v_fee,
            'is_pool_asset', v_is_pool_asset,
            'pool_updates', CASE 
                WHEN p_pool_id IS NOT NULL THEN 
                    jsonb_build_object(
                        'pool_id', p_pool_id,
                        'asset_removed', v_transaction.amount,
                        'main_asset_added', v_pool_main_asset_amount
                    )
                ELSE NULL
            END
        )
    );

EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_details = PG_EXCEPTION_CONTEXT;
    
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE,
        'transaction_id', p_transaction_id,
        'context', v_error_details
    );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL) TO authenticated; 