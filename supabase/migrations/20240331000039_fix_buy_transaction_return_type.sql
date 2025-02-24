-- Drop existing functions
DROP FUNCTION IF EXISTS public.process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL);

-- Recreate function with proper return type
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
    v_result jsonb;
BEGIN
    -- Get transaction details
    SELECT * INTO v_transaction
    FROM transactions
    WHERE id = p_transaction_id AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Transaction not found or not in pending status'
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

    -- Get pool details if it's a pool transaction
    IF p_pool_id IS NOT NULL THEN
        SELECT * INTO v_pool
        FROM pools
        WHERE id = p_pool_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Pool not found'
            );
        END IF;

        -- Get pool balance
        SELECT * INTO v_pool_balance
        FROM pool_balances
        WHERE pool_id = p_pool_id AND asset_id = v_transaction.asset_id
        FOR UPDATE;

        IF NOT FOUND OR v_pool_balance.balance < v_transaction.amount THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Insufficient pool balance'
            );
        END IF;
    END IF;

    -- Process payment based on payment method
    CASE v_transaction.metadata->>'payment_method'
        WHEN 'usd_balance' THEN
            -- Check and update user's USD balance
            SELECT * INTO v_user_balance
            FROM user_balances
            WHERE user_id = v_transaction.user_id AND asset_id = v_usd_asset.id
            FOR UPDATE;

            IF NOT FOUND OR v_user_balance.balance < (v_transaction.amount * p_price_per_token) THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Insufficient USD balance'
                );
            END IF;

            -- Update user's USD balance
            UPDATE user_balances
            SET balance = balance - (v_transaction.amount * p_price_per_token)
            WHERE user_id = v_transaction.user_id AND asset_id = v_usd_asset.id;

            -- Update or create user's asset balance
            INSERT INTO user_balances (user_id, asset_id, balance)
            VALUES (v_transaction.user_id, v_transaction.asset_id, v_transaction.amount)
            ON CONFLICT (user_id, asset_id)
            DO UPDATE SET balance = user_balances.balance + v_transaction.amount;

            -- If it's a pool transaction, update pool balances
            IF p_pool_id IS NOT NULL THEN
                -- Update pool's asset balance
                UPDATE pool_balances
                SET balance = balance - v_transaction.amount
                WHERE pool_id = p_pool_id AND asset_id = v_transaction.asset_id;

                -- Update pool's USD balance
                INSERT INTO pool_balances (pool_id, asset_id, balance)
                VALUES (p_pool_id, v_usd_asset.id, v_transaction.amount * p_price_per_token)
                ON CONFLICT (pool_id, asset_id)
                DO UPDATE SET balance = pool_balances.balance + (v_transaction.amount * p_price_per_token);

                -- Update pool's TVL
                UPDATE pools
                SET tvl = (
                    SELECT SUM(pb.balance * COALESCE(
                        CASE 
                            WHEN a.symbol = 'USD' THEN 1
                            ELSE p_pool_main_asset_price
                        END, 1))
                    FROM pool_balances pb
                    JOIN assets a ON a.id = pb.asset_id
                    WHERE pb.pool_id = p_pool_id
                )
                WHERE id = p_pool_id;
            END IF;

        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Unsupported payment method'
            );
    END CASE;

    -- Update transaction status
    UPDATE transactions
    SET 
        status = 'completed',
        completed_at = NOW(),
        price_per_token = p_price_per_token,
        total_paid = v_transaction.amount * p_price_per_token
    WHERE id = p_transaction_id;

    -- Build and return success response
    RETURN jsonb_build_object(
        'success', true,
        'transaction', jsonb_build_object(
            'id', v_transaction.id,
            'user_id', v_transaction.user_id,
            'asset_id', v_transaction.asset_id,
            'amount', v_transaction.amount,
            'price_per_token', p_price_per_token,
            'total_paid', v_transaction.amount * p_price_per_token,
            'status', 'completed',
            'completed_at', NOW()
        ),
        'pool_updates', CASE 
            WHEN p_pool_id IS NOT NULL THEN jsonb_build_object(
                'id', v_pool.id,
                'tvl', (
                    SELECT SUM(pb.balance * COALESCE(
                        CASE 
                            WHEN a.symbol = 'USD' THEN 1
                            ELSE p_pool_main_asset_price
                        END, 1))
                    FROM pool_balances pb
                    JOIN assets a ON a.id = pb.asset_id
                    WHERE pb.pool_id = p_pool_id
                )
            )
            ELSE NULL
        END
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL) TO authenticated; 