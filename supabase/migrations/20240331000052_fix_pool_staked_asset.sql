-- Drop existing function
DROP FUNCTION IF EXISTS process_buy_transaction(UUID, UUID, DECIMAL, DECIMAL);

-- Recreate with correct staked asset handling
CREATE OR REPLACE FUNCTION process_buy_transaction(
    p_transaction_id UUID,
    p_pool_id UUID,
    p_price_per_token DECIMAL,
    p_pool_main_asset_price DECIMAL DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_transaction transactions;
    v_asset assets;
    v_user_id UUID;
    v_asset_id UUID;
    v_payment_method TEXT;
    v_total_to_pay DECIMAL;
    v_usd_asset_id UUID;
    v_user_balance RECORD;
    v_pool_asset RECORD;
    v_pool_type TEXT;
    v_staked_asset_id UUID;
    v_staked_amount DECIMAL;
BEGIN
    -- Set statement timeout for lock acquisition
    SET LOCAL statement_timeout = '5s';
    
    -- First lock just the transaction row
    SELECT * INTO v_transaction
    FROM transactions
    WHERE id = p_transaction_id 
    AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE LOG 'Transaction not found or not pending: %', p_transaction_id;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Transaction not found or not in pending status'
        );
    END IF;

    -- Then get asset details separately (no locking needed)
    SELECT * INTO v_asset
    FROM assets
    WHERE id = v_transaction.asset_id;

    IF NOT FOUND THEN
        RAISE LOG 'Asset not found for transaction: %', p_transaction_id;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Asset not found'
        );
    END IF;

    -- Store commonly used values
    v_user_id := v_transaction.user_id;
    v_asset_id := v_transaction.asset_id;
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
        -- Lock and check user's USD balance
        SELECT * INTO v_user_balance
        FROM user_balances
        WHERE user_id = v_user_id 
        AND asset_id = v_usd_asset_id
        FOR UPDATE;

        IF NOT FOUND OR v_user_balance.balance < v_total_to_pay THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Insufficient USD balance',
                'required', v_total_to_pay,
                'available', COALESCE(v_user_balance.balance, 0)
            );
        END IF;

        -- Deduct USD balance
        UPDATE user_balances
        SET balance = balance - v_total_to_pay,
            updated_at = NOW()
        WHERE user_id = v_user_id 
        AND asset_id = v_usd_asset_id;
    END IF;

    -- For pool assets, check pool balance and handle staked asset update
    IF p_pool_id IS NOT NULL THEN
        -- Get pool type and find corresponding staked asset
        SELECT type::text INTO v_pool_type
        FROM pools
        WHERE id = p_pool_id;

        -- Get the staked asset ID based on pool type
        SELECT id INTO v_staked_asset_id
        FROM assets
        WHERE symbol = CASE v_pool_type
            WHEN 'bitcoin' THEN 'BTCX'
            WHEN 'honey' THEN 'HONEYX'
        END;

        IF v_staked_asset_id IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Staked asset not found for pool type: ' || v_pool_type
            );
        END IF;

        IF p_pool_main_asset_price IS NULL OR p_pool_main_asset_price <= 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Invalid pool main asset price'
            );
        END IF;

        -- Calculate how much staked asset to add to pool
        -- Total USD value / staked asset price = staked amount
        v_staked_amount := v_total_to_pay / p_pool_main_asset_price;

        RAISE LOG 'Pool transaction details: total_to_pay=%, staked_price=%, staked_amount=%, pool_type=%, staked_asset=%',
            v_total_to_pay, p_pool_main_asset_price, v_staked_amount, v_pool_type, 
            CASE v_pool_type WHEN 'bitcoin' THEN 'BTCX' WHEN 'honey' THEN 'HONEYX' END;

        -- Lock and check pool balance for the asset being purchased
        SELECT * INTO v_pool_asset
        FROM pool_assets
        WHERE pool_id = p_pool_id 
        AND asset_id = v_asset_id
        FOR UPDATE;

        IF NOT FOUND OR v_pool_asset.balance < v_transaction.amount THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Insufficient pool balance',
                'required', v_transaction.amount,
                'available', COALESCE(v_pool_asset.balance, 0)
            );
        END IF;

        -- Update pool balance: remove the purchased asset
        UPDATE pool_assets
        SET balance = balance - v_transaction.amount,
            updated_at = NOW()
        WHERE pool_id = p_pool_id 
        AND asset_id = v_asset_id;

        -- Add staked asset to pool
        INSERT INTO pool_assets (pool_id, asset_id, balance)
        VALUES (p_pool_id, v_staked_asset_id, v_staked_amount)
        ON CONFLICT (pool_id, asset_id) 
        DO UPDATE SET 
            balance = pool_assets.balance + v_staked_amount,
            updated_at = NOW();

        -- Add purchased asset to user's balance
        INSERT INTO user_balances (user_id, asset_id, balance)
        VALUES (v_user_id, v_asset_id, v_transaction.amount)
        ON CONFLICT (user_id, asset_id) 
        DO UPDATE SET 
            balance = user_balances.balance + v_transaction.amount,
            updated_at = NOW();
    ELSE
        -- Direct asset purchase
        INSERT INTO user_balances (user_id, asset_id, balance)
        VALUES (v_user_id, v_asset_id, v_transaction.amount)
        ON CONFLICT (user_id, asset_id) 
        DO UPDATE SET 
            balance = user_balances.balance + v_transaction.amount,
            updated_at = NOW();
    END IF;

    -- Update transaction status
    UPDATE transactions
    SET status = 'completed',
        completed_at = NOW(),
        price_per_token = p_price_per_token,
        updated_at = NOW()
    WHERE id = p_transaction_id
    RETURNING * INTO v_transaction;

    RETURN jsonb_build_object(
        'success', true,
        'transaction', row_to_json(v_transaction)
    );

EXCEPTION
    WHEN lock_not_available OR deadlock_detected OR SQLSTATE '57014' THEN
        RAISE LOG 'Lock timeout or deadlock for transaction %: % %', p_transaction_id, SQLERRM, SQLSTATE;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Transaction is currently being processed by another request. Please try again.'
        );
    WHEN OTHERS THEN
        RAISE LOG 'Error processing transaction %: % %', p_transaction_id, SQLERRM, SQLSTATE;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 