-- ─────────────────────────────────────────────────────────────────────────────
-- BANK TRANSFER SETTINGS SEED
-- ─────────────────────────────────────────────────────────────────────────────
-- Seeds the four `bank_transfer_*` keys into system_settings so the admin
-- Settings page (Payment & Banking group) renders editable inputs for them.
-- The vendor Billing "Pay" panel reads these exact keys, so whatever the admin
-- saves here is what vendors see in their bank-transfer payment instructions.
--
-- Safe to run multiple times: `on conflict (key) do nothing` preserves any
-- values the admin has already set.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.system_settings (key, value, description) values
  ('bank_transfer_bank',           'CIB Egypt',             'Bank name shown to vendors for bank-transfer payments'),
  ('bank_transfer_account_name',   'Garage Egypt Platform', 'Account holder name shown to vendors for bank-transfer payments'),
  ('bank_transfer_account_number', '1234 5678 9012 3456',   'Account number shown to vendors for bank-transfer payments'),
  ('bank_transfer_iban',           '',                      'IBAN shown to vendors for bank-transfer payments (optional)')
on conflict (key) do nothing;
