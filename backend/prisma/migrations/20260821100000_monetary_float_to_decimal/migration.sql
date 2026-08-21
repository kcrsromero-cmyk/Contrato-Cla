ALTER TABLE contracts
  ALTER COLUMN contract_value TYPE NUMERIC(20,2) USING contract_value::NUMERIC,
  ALTER COLUMN advance_payment_value TYPE NUMERIC(20,2) USING advance_payment_value::NUMERIC,
  ALTER COLUMN invoiced_value TYPE NUMERIC(20,2) USING invoiced_value::NUMERIC,
  ALTER COLUMN paid_value TYPE NUMERIC(20,2) USING paid_value::NUMERIC,
  ALTER COLUMN pending_payment_value TYPE NUMERIC(20,2) USING pending_payment_value::NUMERIC,
  ALTER COLUMN pending_execution_value TYPE NUMERIC(20,2) USING pending_execution_value::NUMERIC,
  ALTER COLUMN cdp_balance TYPE NUMERIC(20,2) USING cdp_balance::NUMERIC;
