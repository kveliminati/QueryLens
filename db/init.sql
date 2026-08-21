-- QueryLens Database Initialization Script
-- Creates table, indexes, loads data, and sets up read-only role

-- Create the main table
CREATE TABLE IF NOT EXISTS query_lens (
    invoice_no    VARCHAR(20)     NOT NULL,
    stock_code    VARCHAR(20)     NOT NULL,
    description   TEXT,
    quantity      INTEGER         NOT NULL,
    invoice_date  TIMESTAMP       NOT NULL,
    unit_price    NUMERIC(10, 2)  NOT NULL,
    customer_id   INTEGER,
    country       VARCHAR(100)    NOT NULL
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_query_lens_invoice_date ON query_lens (invoice_date);
CREATE INDEX IF NOT EXISTS idx_query_lens_customer_id  ON query_lens (customer_id);
CREATE INDEX IF NOT EXISTS idx_query_lens_country      ON query_lens (country);
CREATE INDEX IF NOT EXISTS idx_query_lens_stock_code   ON query_lens (stock_code);

-- Load data from CSV
-- The CSV is mounted into the container at /docker-entrypoint-initdb.d/data.csv
COPY query_lens (invoice_no, stock_code, description, quantity, invoice_date, unit_price, customer_id, country)
FROM '/docker-entrypoint-initdb.d/data.csv'
WITH (FORMAT csv, HEADER true, NULL '');

-- Create read-only role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly_user') THEN
        CREATE ROLE readonly_user WITH LOGIN PASSWORD 'readonly_pass';
    END IF;
END
$$;

-- Grant read-only access
GRANT CONNECT ON DATABASE querylens TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- Ensure future tables also get SELECT for the read-only role
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_user;
