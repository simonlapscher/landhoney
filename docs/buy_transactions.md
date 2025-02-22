# Buy Transaction System Evolution

## Overview
This document outlines the evolution of the buy transaction system, including the challenges faced and the final working solutions. The system handles different types of buy transactions including direct asset purchases (BTC/HONEY), USD balance purchases, and pool-based asset purchases.

## Transaction Types

### 1. Direct Asset Orders (BTC/HONEY)
These are handled by the `approve_direct_asset_order` function for direct purchases of BTC or HONEY.

Key features:
- 0.5% transaction fee
- Immediate balance updates
- Direct USD to asset conversion
- No pool involvement

### 2. USD Balance Orders
Handled by `approve_usd_balance_order` for purchases using USD balance.

Key features:
- Supports both direct debt assets and pool assets
- Automatic fee calculation (0.5%)
- Balance verification before transaction
- Different flows for pool vs non-pool assets

### 3. Pool-Based Transactions
Handled by `process_buy_transaction` for pool-based asset purchases.

Key features:
- Requires pool main asset price
- Pool balance verification
- Complex pool calculations

## Evolution and Challenges

### Initial Challenges

1. **Transaction State Management**
   - Challenge: Maintaining consistent transaction states across different types
   - Solution: Implemented strict status checks and locking mechanisms

2. **Balance Verification**
   - Challenge: Race conditions in balance checks
   - Solution: Added FOR UPDATE locks and NOWAIT clause

3. **Fee Calculation**
   - Challenge: Inconsistent fee calculations across different transaction types
   - Solution: Standardized 0.5% fee calculation

### What Didn't Work

1. **Single Function Approach**
   - Initially tried to handle all transaction types in one function
   - Led to complex conditional logic and maintenance issues
   - Solution: Split into specialized functions for each transaction type

2. **Immediate Balance Updates**
   - Direct balance updates caused race conditions
   - Solution: Implemented transaction locking and atomic updates

3. **Pool Asset Handling**
   - Initial pool calculations didn't account for price impact
   - Solution: Added pool main asset price and impact calculations

## Final Working Solutions

### Direct Asset Order Function
```sql
DECLARE
  v_transaction transactions;
  v_usd_asset_id UUID;
  v_total_to_pay NUMERIC;
  v_fee NUMERIC;
BEGIN
  -- Get USD asset ID
  SELECT id INTO v_usd_asset_id
  FROM assets
  WHERE symbol = 'USD';

  -- Start transaction
  BEGIN
    -- Get and lock the transaction record
    SELECT * INTO v_transaction
    FROM transactions
    WHERE id = p_transaction_id
    AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Transaction not found or not in pending status';
    END IF;

    -- Calculate fee (0.5%) and total amount to pay
    v_fee := v_transaction.amount * p_price_per_token * 0.005;
    v_total_to_pay := (v_transaction.amount * p_price_per_token) + v_fee;

    -- Verify sufficient USD balance
    IF NOT EXISTS (
      SELECT 1 
      FROM user_balances 
      WHERE user_id = v_transaction.user_id 
      AND asset_id = v_usd_asset_id 
      AND balance >= v_total_to_pay
    ) THEN
      RAISE EXCEPTION 'Insufficient USD balance';
    END IF;

    -- Decrease USD balance
    UPDATE user_balances
    SET 
      balance = balance - v_total_to_pay,
      updated_at = NOW(),
      last_transaction_at = NOW()
    WHERE user_id = v_transaction.user_id 
    AND asset_id = v_usd_asset_id;

    -- Increase asset balance
    INSERT INTO user_balances (
      user_id, 
      asset_id, 
      balance,
      created_at,
      updated_at,
      last_transaction_at
    )
    VALUES (
      v_transaction.user_id, 
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

    -- Update transaction status
    UPDATE transactions
    SET 
      status = 'completed',
      completed_at = NOW(),
      price_per_token = p_price_per_token,
      metadata = jsonb_set(
        jsonb_set(
          metadata,
          '{fee_usd}',
          to_jsonb(v_fee)
        ),
        '{total_paid}',
        to_jsonb(v_total_to_pay)
      )
    WHERE id = p_transaction_id
    RETURNING * INTO v_transaction;

    RETURN v_transaction;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to process direct asset order: %', SQLERRM;
  END;
END;
```

### USD Balance Order Function
```sql
DECLARE
  v_transaction transactions;
  v_usd_asset_id UUID;
  v_total_to_pay NUMERIC;
BEGIN
  -- Get USD asset ID
  SELECT id INTO v_usd_asset_id
  FROM assets
  WHERE symbol = 'USD';

  -- Start transaction
  BEGIN
    -- Get and lock the transaction record
    SELECT * INTO v_transaction
    FROM transactions
    WHERE id = p_transaction_id
    FOR UPDATE;

    -- Calculate total amount to pay (amount + fee)
    v_total_to_pay := v_transaction.amount * v_transaction.price_per_token + 
                      (v_transaction.amount * v_transaction.price_per_token * 0.005); -- 0.5% fee

    -- Decrease USD balance
    UPDATE user_balances
    SET balance = balance - v_total_to_pay
    WHERE user_id = v_transaction.user_id 
    AND asset_id = v_usd_asset_id;

    -- Increase asset balance
    INSERT INTO user_balances (user_id, asset_id, balance)
    VALUES (v_transaction.user_id, v_transaction.asset_id, v_transaction.amount)
    ON CONFLICT (user_id, asset_id)
    DO UPDATE SET balance = user_balances.balance + v_transaction.amount;

    -- Update transaction status
    UPDATE transactions
    SET 
      status = 'completed',
      completed_at = NOW()
    WHERE id = p_transaction_id
    RETURNING * INTO v_transaction;

    RETURN v_transaction;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to process USD balance order: %', SQLERRM;
  END;
END;
```

## Best Practices Implemented

1. **Transaction Locking**
   - All functions use FOR UPDATE to prevent race conditions
   - NOWAIT clause added to fail fast on conflicts

2. **Error Handling**
   - Comprehensive error messages
   - Transaction rollback on failures
   - Detailed logging for debugging

3. **Balance Management**
   - Atomic balance updates
   - Pre-transaction balance verification
   - Consistent fee calculation

4. **Code Organization**
   - Specialized functions for each transaction type
   - Clear separation of concerns
   - Consistent metadata structure

## Frontend Integration

The frontend handles transaction approval through the `PendingTransactions` component, which:
1. Displays pending transactions
2. Allows admin price setting
3. Handles different transaction types appropriately
4. Provides feedback on transaction status

## Future Improvements

1. Consider implementing transaction queuing for high-load scenarios
2. Add more detailed transaction logging
3. Implement automated testing for edge cases
4. Consider adding transaction rate limiting
5. Enhance monitoring and alerting system 