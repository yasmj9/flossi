-- PostgreSQL Database Schema for Stock Investment Analyzer V2 (Feature 7)

CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(64) PRIMARY KEY,
    ticker VARCHAR(16) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    sector VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS financial_reports (
    id VARCHAR(128) PRIMARY KEY,
    company_id VARCHAR(64) REFERENCES companies(id) ON DELETE CASCADE,
    fiscal_year INT NOT NULL,
    period_type VARCHAR(8) NOT NULL CHECK (period_type IN ('FY', 'H1')),
    period_end_date DATE NOT NULL,
    statement_scope VARCHAR(32) DEFAULT 'CONSOLIDATED',
    published_at DATE,
    source_reference TEXT,
    financial_data JSONB NOT NULL,
    revision_number INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, fiscal_year, period_type)
);

CREATE TABLE IF NOT EXISTS price_observations (
    id VARCHAR(128) PRIMARY KEY,
    company_id VARCHAR(64) REFERENCES companies(id) ON DELETE CASCADE,
    price DECIMAL(12, 2) NOT NULL,
    high_52w DECIMAL(12, 2) NOT NULL,
    low_52w DECIMAL(12, 2) NOT NULL,
    observation_date DATE NOT NULL,
    source VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolio_transactions (
    id VARCHAR(128) PRIMARY KEY,
    ticker VARCHAR(16) NOT NULL,
    transaction_type VARCHAR(16) NOT NULL CHECK (transaction_type IN ('BUY', 'SELL', 'DEPOSIT')),
    shares INT DEFAULT 0,
    price DECIMAL(12, 2) DEFAULT 0,
    fees DECIMAL(12, 2) DEFAULT 0,
    amount DECIMAL(12, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS decision_snapshots (
    id VARCHAR(128) PRIMARY KEY,
    portfolio_id VARCHAR(64) DEFAULT 'default-portfolio',
    evaluation_date DATE NOT NULL,
    company_id VARCHAR(64),
    ticker VARCHAR(16) NOT NULL,
    decision VARCHAR(32) NOT NULL,
    quality_score INT,
    buy_score INT,
    reliability_score INT,
    fair_value DECIMAL(12, 2),
    current_price DECIMAL(12, 2),
    shariah_status VARCHAR(32),
    reasons JSONB,
    portfolio_allocation_snapshot JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
