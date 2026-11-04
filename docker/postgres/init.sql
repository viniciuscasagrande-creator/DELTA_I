-- ============================================================================
-- DELTA ERP ENTERPRISE — POSTGRESQL INITIALIZATION & RLS HELPERS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Funções auxiliares para Row-Level Security (RLS) por Organização (Tenant) e Empresa (Company)
CREATE OR REPLACE FUNCTION current_app_tenant_id() RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '');
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION current_app_company_id() RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_company_id', true), '');
$$ LANGUAGE SQL STABLE;
