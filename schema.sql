-- wallet_mappings table
CREATE TABLE IF NOT EXISTS user_wallets (
  evm_address TEXT NOT NULL,
  coin TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  PRIMARY KEY (evm_address, coin)
);

-- user_balances table
CREATE TABLE IF NOT EXISTS user_balances (
  evm_address TEXT,
  coin TEXT,
  amount TEXT,
  PRIMARY KEY (evm_address, coin)
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id SERIAL PRIMARY KEY,
  evm_address TEXT NOT NULL,
  coin TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  destination TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS non_evm_fees (
  coin TEXT PRIMARY KEY,
  withdrawal_fee NUMERIC DEFAULT 0, -- in %
  bridge_fee NUMERIC DEFAULT 0      -- in %
);

CREATE TABLE IF NOT EXISTS non_evm_collected_fees (
  coin TEXT PRIMARY KEY,
  total_amount NUMERIC DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_user_balances_evm ON user_balances (evm_address);
CREATE INDEX IF NOT EXISTS idx_user_balances_coin ON user_balances (coin);

-- Optional: useful if you later filter by both
CREATE INDEX IF NOT EXISTS idx_user_balances_address_coin ON user_balances (evm_address, coin);

-- Wallet lookups by user or coin
CREATE INDEX IF NOT EXISTS idx_wallets_address ON user_wallets (evm_address);
CREATE INDEX IF NOT EXISTS idx_wallets_coin ON user_wallets (coin);

-- Withdrawal filters
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals (evm_address);
CREATE INDEX IF NOT EXISTS idx_withdrawals_coin ON withdrawals (coin);
ALTER TABLE user_balances ADD COLUMN IF NOT EXISTS locked DECIMAL DEFAULT 0;


DROP TABLE IF EXISTS user_wallets;




 
​
