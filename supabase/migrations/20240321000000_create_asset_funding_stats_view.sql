-- Create or replace the asset funding stats view
create or replace view asset_funding_stats as
select 
    a.id as asset_id,
    a.symbol,
    da.loan_amount::numeric as loan_amount,
    coalesce(sum(ub.balance), 0)::numeric as total_funded_amount,
    (da.loan_amount - coalesce(sum(ub.balance), 0))::numeric as remaining_amount,
    round((coalesce(sum(ub.balance), 0) / da.loan_amount * 100)::numeric, 2) as percent_funded
from assets a
join debt_assets da on da.asset_id = a.id
left join user_balances ub on ub.asset_id = a.id
group by a.id, a.symbol, da.loan_amount;

-- Grant access to the view
grant select on asset_funding_stats to authenticated;
grant select on asset_funding_stats to anon; 