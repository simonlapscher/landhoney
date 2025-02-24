-- Drop existing function
DROP FUNCTION IF EXISTS public.process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL);

-- Recreate with proper transaction handling
CREATE OR REPLACE FUNCTION public.process_buy_transaction(
    p_transaction_id UUID,
    p_pool_id UUID,
    p_price_per_token DECIMAL,
    p_pool_main_asset_price DECIMAL
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_transaction transactions;
    v_pool pools;
    v_usd_asset assets;
    v_user_balance user_balances;
    v_pool_balance pool_balances;
    v_payment_method TEXT;
    v_total_to_pay DECIMAL;
    v_success BOOLEAN;
    v_error TEXT;
BEGIN
    -- Start an explicit transaction block
    BEGIN
        -- Get transaction details with FOR UPDATE to lock the row
        SELECT * INTO v_transaction
        FROM transactions
        WHERE id = p_transaction_id AND status = 'pending'
        FOR UPDATE NOWAIT;  -- Add NOWAIT to fail fast if locked

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Transaction not found or not in pending status'
            );
        END IF;

        -- Extract payment method
        v_payment_method := v_transaction.metadata->>'payment_method';
        IF v_payment_method IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Payment method not specified'
            );
        END IF;

        -- Get USD asset for balance checks
        SELECT * INTO v_usd_asset
        FROM assets
        WHERE symbol = 'USD';

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'USD asset not found'
            );
        END IF;

        -- Calculate total to pay
        v_total_to_pay := v_transaction.amount * p_price_per_token;

        -- Handle pool transaction if pool_id is provided
        IF p_pool_id IS NOT NULL THEN
            -- Get pool details
            SELECT * INTO v_pool
            FROM pools
            WHERE id = p_pool_id
            FOR UPDATE NOWAIT;  -- Add NOWAIT to fail fast if locked

            IF NOT FOUND THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Pool not found'
                );
            END IF;

            -- Check pool balance
            SELECT * INTO v_pool_balance
            FROM pool_balances
            WHERE pool_id = p_pool_id AND asset_id = v_transaction.asset_id
            FOR UPDATE NOWAIT;  -- Add NOWAIT to fail fast if locked

            IF NOT FOUND OR v_pool_balance.balance < v_transaction.amount THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Insufficient pool balance'
                );
            END IF;
        END IF;

        -- Process based on payment method
        CASE v_payment_method
            WHEN 'usd_balance' THEN
                -- Check user's USD balance
                SELECT * INTO v_user_balance
                FROM user_balances
                WHERE user_id = v_transaction.user_id AND asset_id = v_usd_asset.id
                FOR UPDATE NOWAIT;  -- Add NOWAIT to fail fast if locked

                IF NOT FOUND OR v_user_balance.balance < v_total_to_pay THEN
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
                WHERE user_id = v_transaction.user_id AND asset_id = v_usd_asset.id;

                -- Update or create user's asset balance
                INSERT INTO user_balances (user_id, asset_id, balance, created_at, updated_at)
                VALUES (v_transaction.user_id, v_transaction.asset_id, v_transaction.amount, NOW(), NOW())
                ON CONFLICT (user_id, asset_id)
                DO UPDATE SET 
                    balance = user_balances.balance + v_transaction.amount,
                    updated_at = NOW();

                -- If it's a pool transaction, update pool balances
                IF p_pool_id IS NOT NULL THEN
                    -- Update pool's asset balance
                    UPDATE pool_balances
                    SET balance = balance - v_transaction.amount,
                        updated_at = NOW()
                    WHERE pool_id = p_pool_id AND asset_id = v_transaction.asset_id;

                    -- Update pool's USD balance
                    INSERT INTO pool_balances (pool_id, asset_id, balance, created_at, updated_at)
                    VALUES (p_pool_id, v_usd_asset.id, v_total_to_pay, NOW(), NOW())
                    ON CONFLICT (pool_id, asset_id)
                    DO UPDATE SET 
                        balance = pool_balances.balance + v_total_to_pay,
                        updated_at = NOW();

                    -- Update pool's TVL
                    UPDATE pools
                    SET total_value_locked = (
                        SELECT SUM(pb.balance * COALESCE(
                            CASE 
                                WHEN a.symbol = 'USD' THEN 1
                                ELSE p_pool_main_asset_price
                            END, 1))
                        FROM pool_balances pb
                        JOIN assets a ON a.id = pb.asset_id
                        WHERE pb.pool_id = p_pool_id
                    ),
                    updated_at = NOW()
                    WHERE id = p_pool_id;
                END IF;

            ELSE
                RETURN jsonb_build_object(
                    'success', false,
                    'error', format('Unsupported payment method: %s', v_payment_method)
                );
        END CASE;

        -- Update transaction status LAST, after all other updates are successful
        UPDATE transactions
        SET 
            status = 'completed',
            completed_at = NOW(),
            price_per_token = p_price_per_token,
            total_paid = v_total_to_pay,
            updated_at = NOW()
        WHERE id = p_transaction_id
        RETURNING * INTO v_transaction;

        -- If we got here, everything succeeded
        RETURN jsonb_build_object(
            'success', true,
            'transaction', (
                SELECT row_to_json(t.*)
                FROM (
                    SELECT 
                        v_transaction.id,
                        v_transaction.user_id,
                        v_transaction.asset_id,
                        v_transaction.amount,
                        v_transaction.price_per_token,
                        v_transaction.status,
                        v_transaction.completed_at,
                        v_transaction.total_paid,
                        v_transaction.created_at,
                        v_transaction.updated_at,
                        v_transaction.metadata
                ) t
            )
        );

        -- Commit the transaction
        COMMIT;
    EXCEPTION WHEN OTHERS THEN
        -- If any error occurred, roll back the transaction
        ROLLBACK;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
        );
    END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL) TO authenticated; 