-- Table for users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  profile_image TEXT,
  blocked BOOLEAN DEFAULT false,
  role VARCHAR DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for individual chats
CREATE TABLE IF NOT EXISTS chats (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  chat_partner VARCHAR NOT NULL,
  last_message TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  type VARCHAR DEFAULT 'single'
);

-- Table for group chats
CREATE TABLE IF NOT EXISTS groups (
  id VARCHAR PRIMARY KEY,
  group_name VARCHAR NOT NULL,
  group_icon TEXT,
  admin_id VARCHAR NOT NULL,
  member_ids JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP


);
  ALTER TABLE groups ADD COLUMN admin_ids JSONB DEFAULT '[]';
  ALTER TABLE groups ADD COLUMN only_admin_can_message BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN subscription_expiry TIMESTAMP;
ALTER TABLE users ADD COLUMN current_plan TEXT DEFAULT 'free';

CREATE TABLE IF NOT EXISTS user_usage (
  user_id UUID PRIMARY KEY,
  tx_count INT DEFAULT 0,
  msg_count INT DEFAULT 0
);

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  plan_key TEXT PRIMARY KEY,
  name TEXT,
  max_transactions INT,
  max_messages INT,
  price_usd DECIMAL,
  duration INTERVAL
);
ALTER TABLE subscription_plans
ADD COLUMN country_prices JSONB;

-- Payments
CREATE TABLE IF NOT EXISTS user_payments (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  plan_key TEXT,
  amount DECIMAL,
  provider TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE user_payments
ADD COLUMN currency_used TEXT,
ADD COLUMN country TEXT

CREATE TABLE IF NOT EXISTS user_transactions (
  id SERIAL PRIMARY KEY,
  user_address TEXT NOT NULL,
  type TEXT NOT NULL, -- ETH / BTC / USDT / MoonPay / etc
  direction TEXT CHECK (direction IN ('deposit', 'withdraw', 'transfer')),
  token TEXT,
  amount DECIMAL,
  tx_hash TEXT,
  status TEXT,
  source TEXT, -- moonpay, manual, transak etc.
  ip TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS user_delayed_transfers (
  id SERIAL PRIMARY KEY,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  token TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'executed', 'retrieved'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execute_at TIMESTAMP NOT NULL,
  direction TEXT DEFAULT 'transfer',
  is_evm BOOLEAN DEFAULT false
);
CREATE EXTENSION IF NOT EXISTS pgcrypto;

