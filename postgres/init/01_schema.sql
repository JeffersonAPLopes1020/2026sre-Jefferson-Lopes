CREATE TABLE IF NOT EXISTS olist_orders (
    order_id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    order_status VARCHAR(20) NOT NULL,
    order_purchase_timestamp TIMESTAMP NOT NULL,
    order_approved_at TIMESTAMP,
    order_delivered_carrier_date TIMESTAMP,
    order_delivered_customer_date TIMESTAMP,
    order_estimated_delivery_date TIMESTAMP,
    processed_at TIMESTAMP DEFAULT NOW(),
    source_file VARCHAR(255) NOT NULL,
    batch_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS pipeline_executions (
    execution_id UUID PRIMARY KEY,
    source_file VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMP,
    records_read INT DEFAULT 0,
    records_loaded INT DEFAULT 0,
    error_details TEXT
);

CREATE TABLE IF NOT EXISTS pipeline_checkpoints (
    execution_id UUID NOT NULL,
    offset INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (execution_id, offset)
);

-- Read-only user for Grafana dashboards
CREATE USER IF NOT EXISTS dashboard WITH PASSWORD 'dashboard';
GRANT CONNECT ON DATABASE olist_analytics TO dashboard;
GRANT USAGE ON SCHEMA public TO dashboard;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO dashboard;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO dashboard;
