-- ==============================================================================
-- FINANCES - DATABASE SCHEMA (PostgreSQL / Supabase)
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ------------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE category_type AS ENUM ('INCOME', 'EXPENSE', 'FIXED_EXPENSE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM (
        'SALARY',
        'EXTRA_INCOME',
        'EXPENSE',
        'FIXED_EXPENSE',
        'INVESTMENT_OUTFLOW',
        'INCOME'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Garante suporte ao tipo INCOME caso o enum já exista
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'INCOME';

DO $$ BEGIN
    CREATE TYPE loan_status AS ENUM ('PENDING', 'PAID', 'OVERDUE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('CASH', 'CREDIT');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('OPEN', 'PAID', 'OVERDUE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TRIGGER FUNCTION FOR updated_at
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. TABLES DEFINITION
-- ------------------------------------------------------------------------------

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type category_type NOT NULL,
    color_hex VARCHAR(7) NOT NULL DEFAULT '#64748B',
    icon VARCHAR(50) NOT NULL DEFAULT 'tag',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MONTHS SUMMARY (Consolidado e saldo inicial/sobra do mês anterior)
CREATE TABLE IF NOT EXISTS months_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    starting_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_months_summary_year_month UNIQUE (year, month)
);

-- CREDIT CARDS (Cartões de Crédito)
CREATE TABLE IF NOT EXISTS credit_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    limit_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
    due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
    color_hex VARCHAR(7) NOT NULL DEFAULT '#8B5CF6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    type transaction_type NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    purchase_date DATE NULL,
    billing_month VARCHAR(7) NULL,
    month_summary_id UUID REFERENCES months_summary(id) ON DELETE CASCADE,
    installment_group_id UUID NULL,
    installment_number INTEGER NULL CHECK (installment_number IS NULL OR installment_number > 0),
    total_installments INTEGER NULL CHECK (total_installments IS NULL OR total_installments > 0),
    payment_method payment_method NOT NULL DEFAULT 'CASH',
    credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garante que colunas de parcelamento existam em tabelas já migradas
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS purchase_date DATE NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS billing_month VARCHAR(7) NULL;

-- CREDIT CARD INVOICES (Faturas de Cartão de Crédito)
CREATE TABLE IF NOT EXISTS credit_card_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
    status invoice_status NOT NULL DEFAULT 'OPEN',
    paid_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_card_invoice_month UNIQUE (credit_card_id, year, month)
);

-- LOANS RECEIVABLE (A Receber / Empréstimos)
CREATE TABLE IF NOT EXISTS loans_receivable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debtor_name VARCHAR(150) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    status loan_status NOT NULL DEFAULT 'PENDING',
    reminder_date DATE NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INVESTMENTS (Carteira de Investimentos)
CREATE TABLE IF NOT EXISTS investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_name VARCHAR(100) NOT NULL,
    asset_name VARCHAR(150) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    total_invested NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INVESTMENT YIELD HISTORY (Histórico Mensal de Rendimentos)
CREATE TABLE IF NOT EXISTS investment_yield_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL, -- Ex: '2026-09'
    yield_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    yield_percentage NUMERIC(8, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_investment_yield_month UNIQUE (investment_id, month_year)
);

-- ------------------------------------------------------------------------------
-- 4. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_months_summary_year_month ON months_summary(year, month);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_month_summary_id ON transactions(month_summary_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_installment_group ON transactions(installment_group_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_transactions_credit_card_id ON transactions(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_invoices_status ON credit_card_invoices(status);
CREATE INDEX IF NOT EXISTS idx_credit_card_invoices_card_year_month ON credit_card_invoices(credit_card_id, year, month);
CREATE INDEX IF NOT EXISTS idx_loans_receivable_status ON loans_receivable(status);
CREATE INDEX IF NOT EXISTS idx_loans_receivable_due_date ON loans_receivable(due_date);
CREATE INDEX IF NOT EXISTS idx_investments_asset_type ON investments(asset_type);
CREATE INDEX IF NOT EXISTS idx_investment_yield_investment_id ON investment_yield_history(investment_id);

-- ------------------------------------------------------------------------------
-- 5. AUTO-UPDATE TRIGGERS
-- ------------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_months_summary_updated_at ON months_summary;
CREATE TRIGGER trg_months_summary_updated_at
    BEFORE UPDATE ON months_summary
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_credit_cards_updated_at ON credit_cards;
CREATE TRIGGER trg_credit_cards_updated_at
    BEFORE UPDATE ON credit_cards
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_credit_card_invoices_updated_at ON credit_card_invoices;
CREATE TRIGGER trg_credit_card_invoices_updated_at
    BEFORE UPDATE ON credit_card_invoices
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_loans_receivable_updated_at ON loans_receivable;
CREATE TRIGGER trg_loans_receivable_updated_at
    BEFORE UPDATE ON loans_receivable
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_investments_updated_at ON investments;
CREATE TRIGGER trg_investments_updated_at
    BEFORE UPDATE ON investments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE months_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_yield_history ENABLE ROW LEVEL SECURITY;

-- Permissive policies for anon and authenticated roles (standard client access)
DO $$ BEGIN
    CREATE POLICY "Allow anon all categories" ON categories FOR ALL TO anon USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated all categories" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow anon all months_summary" ON months_summary FOR ALL TO anon USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated all months_summary" ON months_summary FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow anon all credit_cards" ON credit_cards FOR ALL TO anon USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated all credit_cards" ON credit_cards FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow anon all transactions" ON transactions FOR ALL TO anon USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated all transactions" ON transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow anon all credit_card_invoices" ON credit_card_invoices FOR ALL TO anon USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated all credit_card_invoices" ON credit_card_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow anon all loans_receivable" ON loans_receivable FOR ALL TO anon USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated all loans_receivable" ON loans_receivable FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow anon all investments" ON investments FOR ALL TO anon USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated all investments" ON investments FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow anon all investment_yield_history" ON investment_yield_history FOR ALL TO anon USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated all investment_yield_history" ON investment_yield_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------------------------
-- 7. INITIAL SEED CATEGORIES (Opcional - Categorias Padrão)
-- ------------------------------------------------------------------------------

INSERT INTO categories (name, type, color_hex, icon)
VALUES
    ('Salário', 'INCOME', '#10B981', 'briefcase'),
    ('Renda Extra', 'INCOME', '#059669', 'trending-up'),
    ('Rendimentos', 'INCOME', '#34D399', 'coins'),
    ('Moradia / Aluguel', 'FIXED_EXPENSE', '#3B82F6', 'home'),
    ('Contas de Consumo (Água/Luz/Net)', 'FIXED_EXPENSE', '#60A5FA', 'zap'),
    ('Assinaturas & Serviços', 'FIXED_EXPENSE', '#818CF8', 'tv'),
    ('Alimentação & Mercado', 'EXPENSE', '#F59E0B', 'shopping-cart'),
    ('Transporte & Combustível', 'EXPENSE', '#EF4444', 'car'),
    ('Saúde & Farmácia', 'EXPENSE', '#EC4899', 'activity'),
    ('Lazer & Restaurantes', 'EXPENSE', '#8B5CF6', 'coffee'),
    ('Educação & Cursos', 'EXPENSE', '#06B6D4', 'book-open'),
    ('Aporte de Investimento', 'EXPENSE', '#14B8A6', 'pie-chart')
ON CONFLICT DO NOTHING;
