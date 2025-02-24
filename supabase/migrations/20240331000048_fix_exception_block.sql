-- Drop the existing function
DROP FUNCTION IF EXISTS process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL);

-- Recreate the function with proper exception handling
CREATE OR REPLACE FUNCTION process_buy_transaction(
    p_transaction_id UUID,
    p_pool_id UUID,
    p_price_per_token DECIMAL,
    p_pool_main_asset_price DECIMAL DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_transaction transactions;
    v_asset assets;
    v_pool pools;
    v_pool_asset RECORD;
    v_user_balance user_balances;
    v_usd_asset assets;
    v_payment_method TEXT;
    v_total_to_pay DECIMAL;
    v_user_id UUID;
BEGIN
    RAISE LOG 'Starting process_buy_transaction for transaction: %', p_transaction_id;

    -- Set statement timeout for lock acquisition (5 seconds)
    SET LOCAL statement_timeout = '5s';

    -- First, lock and get the transaction
    SELECT *
    INTO v_transaction
    FROM transactions
    WHERE id = p_transaction_id AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        BEGIN
            -- Check if transaction exists but isn't pending
            SELECT status 
            INTO STRICT v_transaction
            FROM transactions 
            WHERE id = p_transaction_id;
            
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Transaction is not in pending status. Current status: %s',
                    v_transaction.status)
            );
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Transaction not found'
                );
        END;
    END IF;

    -- Store user_id for convenience
    v_user_id := v_transaction.user_id;

    -- Get asset details
    SELECT *
    INTO v_asset
    FROM assets
    WHERE id = v_transaction.asset_id;

    RAISE LOG 'Processing transaction for asset: % (type: %)', v_asset.symbol, v_asset.type;

    -- Get payment method from metadata
    v_payment_method := v_transaction.metadata->>'payment_method';
    
    -- Get USD asset for balance checks
    SELECT * INTO v_usd_asset
    FROM assets
    WHERE symbol = 'USD';

    -- Calculate total payment including fee
    v_total_to_pay := v_transaction.amount * p_price_per_token + 
        COALESCE((v_transaction.metadata->>'fee_usd')::DECIMAL, 0);

    -- If this is a pool transaction, verify pool exists and has sufficient balance
    IF p_pool_id IS NOT NULL THEN
        RAISE LOG 'Processing pool transaction for pool_id: %', p_pool_id;
        
        -- Get and lock pool
        SELECT *
        INTO v_pool
        FROM pools
        WHERE id = p_pool_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE LOG 'Pool not found: %', p_pool_id;
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Pool not found'
            );
        END IF;

        -- Check pool balance
        SELECT *
        INTO v_pool_asset
        FROM pool_assets
        WHERE pool_id = p_pool_id 
        AND asset_id = v_transaction.asset_id
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

        RAISE LOG 'Pool balance check passed. Available: %, Required: %',
            v_pool_asset.balance, v_transaction.amount;
    END IF;

    -- Process based on payment method
    CASE v_payment_method
        WHEN 'usd_balance' THEN
            RAISE LOG 'Processing USD balance payment';
            
            -- Get and lock user's USD balance
            SELECT *
            INTO v_user_balance
            FROM user_balances
            WHERE user_id = v_user_id 
            AND asset_id = v_usd_asset.id
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

            -- Update user's USD balance
            UPDATE user_balances
            SET balance = balance - v_total_to_pay,
                updated_at = NOW()
            WHERE user_id = v_user_id 
            AND asset_id = v_usd_asset.id;

            -- Update or create user's asset balance
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
                v_transaction.asset_id,
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

            -- If it's a pool transaction, update pool balances
            IF p_pool_id IS NOT NULL THEN
                -- Update pool's asset balance
                UPDATE pool_assets
                SET balance = balance - v_transaction.amount,
                    updated_at = NOW()
                WHERE pool_id = p_pool_id 
                AND asset_id = v_transaction.asset_id;

                -- Update pool's USD balance
                INSERT INTO pool_assets (
                    pool_id,
                    asset_id,
                    balance,
                    created_at,
                    updated_at
                )
                VALUES (
                    p_pool_id,
                    v_usd_asset.id,
                    v_total_to_pay,
                    NOW(),
                    NOW()
                )
                ON CONFLICT (pool_id, asset_id)
                DO UPDATE SET 
                    balance = pool_assets.balance + v_total_to_pay,
                    updated_at = NOW();

                -- Update pool's TVL
                WITH pool_values AS (
                    SELECT 
                        SUM(
                            pa.balance * 
                            CASE 
                                WHEN a.symbol = 'USD' THEN 1
                                WHEN a.id = v_pool.main_asset_id THEN COALESCE(p_pool_main_asset_price, a.price_per_token)
                                ELSE a.price_per_token
                            END
                        ) as total_value
                    FROM pool_assets pa
                    JOIN assets a ON a.id = pa.asset_id
                    WHERE pa.pool_id = p_pool_id
                )
                UPDATE pools
                SET 
                    total_value_locked = pool_values.total_value,
                    updated_at = NOW()
                FROM pool_values
                WHERE id = p_pool_id;
            END IF;

        ELSE
            RAISE LOG 'Unsupported payment method: %', v_payment_method;
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Unsupported payment method: %s', v_payment_method)
            );
    END CASE;

    -- Update transaction status LAST
    UPDATE transactions
    SET 
        status = 'completed',
        completed_at = NOW(),
        price_per_token = p_price_per_token,
        total_paid = v_total_to_pay,
        updated_at = NOW()
    WHERE id = p_transaction_id
    RETURNING * INTO v_transaction;

    RAISE LOG 'Transaction completed successfully: %', v_transaction.id;

    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'transaction', row_to_json(v_transaction)
    );

EXCEPTION 
    WHEN SQLSTATE '57014' THEN -- statement_timeout
        RAISE LOG 'Statement timeout for transaction %: % %', p_transaction_id, SQLERRM, SQLSTATE;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Transaction is currently being processed by another request. Please try again.'
        );
    WHEN OTHERS THEN
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