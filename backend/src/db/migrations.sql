CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('USER', 'BOOKMAKER', 'SUPERADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE match_status AS ENUM ('PRE_MATCH', 'LIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE market_type AS ENUM ('1X2', 'OVER_UNDER', 'HANDICAP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE bet_status AS ENUM ('PENDING', 'WON', 'LOST', 'VOID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE entry_type AS ENUM ('DEBIT', 'CREDIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_category AS ENUM (
        'DEPOSIT',
        'WITHDRAWAL',
        'WAGER_STAKE',
        'WAGER_PAYOUT',
        'TAX_WITHHOLDING',
        'HOUSE_REVENUE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'USER' NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL,
    date_of_birth DATE NOT NULL,
    kyc_verified BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS ledger_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    asset_type VARCHAR(10) DEFAULT 'KES' NOT NULL,
    account_identifier VARCHAR(100) UNIQUE NOT NULL,
    balance_micro_units BIGINT DEFAULT 0 NOT NULL,
    locked_micro_units BIGINT DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT check_positive_balance CHECK (balance_micro_units >= 0),
    CONSTRAINT check_positive_locked CHECK (locked_micro_units >= 0)
);

CREATE TABLE IF NOT EXISTS transaction_journal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_group_id UUID NOT NULL,
    entry_type entry_type NOT NULL,
    account_id UUID REFERENCES ledger_accounts(id) ON DELETE RESTRICT NOT NULL,
    amount_micro_units BIGINT NOT NULL CHECK (amount_micro_units > 0),
    transaction_category transaction_category NOT NULL,
    reference_id VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS fixtures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_provider_id VARCHAR(100) UNIQUE NOT NULL,
    sport VARCHAR(50) NOT NULL,
    tournament VARCHAR(150) NOT NULL,
    home_team VARCHAR(150) NOT NULL,
    away_team VARCHAR(150) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    match_status match_status DEFAULT 'PRE_MATCH' NOT NULL,
    live_home_score INT DEFAULT 0 NOT NULL,
    live_away_score INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fixture_id UUID REFERENCES fixtures(id) ON DELETE CASCADE NOT NULL,
    market_type market_type NOT NULL,
    outcome_name VARCHAR(50) NOT NULL,
    raw_odds_decimal NUMERIC(8, 3) NOT NULL CHECK (raw_odds_decimal >= 1.01),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_fixture_market_outcome UNIQUE(fixture_id, market_type, outcome_name)
);

CREATE TABLE IF NOT EXISTS bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE RESTRICT NOT NULL,
    total_stake_micro_units BIGINT NOT NULL CHECK (total_stake_micro_units > 0),
    total_odds_decimal NUMERIC(10, 4) NOT NULL CHECK (total_odds_decimal >= 1.01),
    potential_payout_micro_units BIGINT NOT NULL CHECK (potential_payout_micro_units > 0),
    tax_withheld_micro_units BIGINT DEFAULT 0 NOT NULL,
    status bet_status DEFAULT 'PENDING' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    settled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bet_legs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bet_id UUID REFERENCES bets(id) ON DELETE CASCADE NOT NULL,
    market_id UUID REFERENCES markets(id) ON DELETE RESTRICT NOT NULL,
    selected_outcome VARCHAR(50) NOT NULL,
    odds_at_placement NUMERIC(8, 3) NOT NULL,
    status bet_status DEFAULT 'PENDING' NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE RESTRICT NOT NULL,
    direction VARCHAR(10) NOT NULL,
    provider_reference VARCHAR(255) UNIQUE,
    checkout_request_id VARCHAR(255) UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    amount_micro_units BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_journal_group ON transaction_journal(transaction_group_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_status ON fixtures(match_status);
CREATE INDEX IF NOT EXISTS idx_fixtures_start ON fixtures(start_time);
CREATE INDEX IF NOT EXISTS idx_markets_fixture ON markets(fixture_id);
CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);