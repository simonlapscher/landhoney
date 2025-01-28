create or replace function update_user_balance(
  p_user_id uuid,
  p_asset_id uuid,
  p_amount numeric
) returns void as $$
begin
  insert into user_balances (user_id, asset_id, amount)
  values (p_user_id, p_asset_id, p_amount)
  on conflict (user_id, asset_id)
  do update set
    amount = user_balances.amount + p_amount,
    updated_at = now();
end;
$$ language plpgsql security definer; 