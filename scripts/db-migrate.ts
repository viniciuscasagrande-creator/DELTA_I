import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function runMigration() {
  const migrationDir = path.resolve(process.cwd(), 'prisma/migrations/20261104165000_initial_foundation');
  const migrationFile = path.join(migrationDir, 'migration.sql');

  fs.mkdirSync(migrationDir, { recursive: true });

  console.log('📐 [1/2] Gerando script DDL atualizado a partir de prisma/schema.prisma...');
  const sqlBuffer = execSync(
    'npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script',
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  const sqlContent = sqlBuffer.toString('utf8');
  fs.writeFileSync(migrationFile, sqlContent, 'utf8');

  const connectionString = process.env.DATABASE_URL || '';
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida no arquivo .env');
  }

  console.log('🚀 [2/2] Sincronizando estruturas no PostgreSQL...');
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    const checkCore = await client.query(`SELECT to_regclass('public.core_tenants') AS exists_flag;`);
    if (!checkCore.rows[0]?.exists_flag) {
      await client.query(sqlContent);
      console.log('✅ Migration inicial aplicada com sucesso!');
    } else {
      // Verifica se as tabelas do Módulo 04 (Fiscal) já foram criadas
      const checkFiscal = await client.query(`SELECT to_regclass('public.fis_tax_rules') AS exists_flag;`);
      if (!checkFiscal.rows[0]?.exists_flag) {
        console.log('📦 Aplicando tabelas do Módulo 04 (Fiscal & Tributário: fis_tax_rules, fis_documents)...');
        await client.query(`
          DO $$ BEGIN
            CREATE TYPE "FiscalDocumentModel" AS ENUM ('NFE', 'NFCE', 'NFSE');
          EXCEPTION WHEN duplicate_object THEN null; END $$;

          DO $$ BEGIN
            CREATE TYPE "FiscalDirection" AS ENUM ('INBOUND', 'OUTBOUND');
          EXCEPTION WHEN duplicate_object THEN null; END $$;

          DO $$ BEGIN
            CREATE TYPE "FiscalDocumentStatus" AS ENUM ('VALIDATED', 'AUTHORIZED', 'CANCELLED');
          EXCEPTION WHEN duplicate_object THEN null; END $$;

          CREATE TABLE IF NOT EXISTS "fis_tax_rules" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "code" VARCHAR(30) NOT NULL,
            "name" VARCHAR(150) NOT NULL,
            "documentModel" "FiscalDocumentModel" NOT NULL DEFAULT 'NFSE',
            "direction" "FiscalDirection" NOT NULL DEFAULT 'INBOUND',
            "cfopOrLc116" VARCHAR(20) NOT NULL,
            "issPct" DECIMAL(10,4) NOT NULL DEFAULT 0,
            "pisPct" DECIMAL(10,4) NOT NULL DEFAULT 0,
            "cofinsPct" DECIMAL(10,4) NOT NULL DEFAULT 0,
            "irrfPct" DECIMAL(10,4) NOT NULL DEFAULT 0,
            "csllPct" DECIMAL(10,4) NOT NULL DEFAULT 0,
            "icmsPct" DECIMAL(10,4) NOT NULL DEFAULT 0,
            "withholdTaxes" BOOLEAN NOT NULL DEFAULT true,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "fis_tax_rules_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "fis_tax_rules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );

          CREATE UNIQUE INDEX IF NOT EXISTS "fis_tax_rules_companyId_code_key" ON "fis_tax_rules"("companyId", "code");
          CREATE INDEX IF NOT EXISTS "fis_tax_rules_tenantId_companyId_idx" ON "fis_tax_rules"("tenantId", "companyId");

          CREATE TABLE IF NOT EXISTS "fis_documents" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "taxRuleId" UUID NOT NULL,
            "model" "FiscalDocumentModel" NOT NULL,
            "direction" "FiscalDirection" NOT NULL,
            "status" "FiscalDocumentStatus" NOT NULL DEFAULT 'AUTHORIZED',
            "documentNumber" VARCHAR(40) NOT NULL,
            "series" VARCHAR(10) NOT NULL DEFAULT '1',
            "accessKey" VARCHAR(60) NOT NULL,
            "counterpartyName" VARCHAR(180) NOT NULL,
            "counterpartyTaxId" VARCHAR(20) NOT NULL,
            "issueDate" DATE NOT NULL,
            "competenceDate" DATE NOT NULL,
            "grossAmount" DECIMAL(18,2) NOT NULL,
            "issAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "pisAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "cofinsAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "icmsAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "irrfRetained" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "pccRetained" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "issRetained" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "totalRetainedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "netInvoiceAmount" DECIMAL(18,2) NOT NULL,
            "linkedPayableId" UUID,
            "linkedReceivableId" UUID,
            "linkedJournalEntryId" UUID,
            "idempotencyKey" VARCHAR(100) NOT NULL,
            "createdById" UUID NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "fis_documents_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "fis_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT "fis_documents_taxRuleId_fkey" FOREIGN KEY ("taxRuleId") REFERENCES "fis_tax_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );

          CREATE UNIQUE INDEX IF NOT EXISTS "fis_documents_tenantId_idempotencyKey_key" ON "fis_documents"("tenantId", "idempotencyKey");
          CREATE INDEX IF NOT EXISTS "fis_documents_tenantId_companyId_direction_competenceDate_idx" ON "fis_documents"("tenantId", "companyId", "direction", "competenceDate");
        `);
        console.log('✅ Tabelas do Módulo 04 (Fiscal) criadas com sucesso!');
      }

      // Verifica se as tabelas do Módulo 05 (RH) já foram criadas
      const checkHr = await client.query(`SELECT to_regclass('public.hr_employees') AS exists_flag;`);
      if (!checkHr.rows[0]?.exists_flag) {
        console.log('👥 Aplicando tabelas do Módulo 05 (RH & Folha: hr_employees, hr_payroll_runs)...');
        await client.query(`
          DO $$ BEGIN
            CREATE TYPE "ContractType" AS ENUM ('CLT', 'PJ', 'INTERN', 'STATUTORY_DIRECTOR');
          EXCEPTION WHEN duplicate_object THEN null; END $$;

          DO $$ BEGIN
            CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ON_VACATION', 'ON_LEAVE', 'TERMINATED');
          EXCEPTION WHEN duplicate_object THEN null; END $$;

          DO $$ BEGIN
            CREATE TYPE "PayrollStatus" AS ENUM ('CALCULATED', 'APPROVED', 'PAID');
          EXCEPTION WHEN duplicate_object THEN null; END $$;

          CREATE TABLE IF NOT EXISTS "hr_employees" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "departmentId" UUID,
            "costCenterId" UUID,
            "registrationCode" VARCHAR(30) NOT NULL,
            "fullName" VARCHAR(160) NOT NULL,
            "taxId" VARCHAR(20) NOT NULL,
            "email" VARCHAR(160) NOT NULL,
            "jobTitle" VARCHAR(120) NOT NULL,
            "contractType" "ContractType" NOT NULL DEFAULT 'CLT',
            "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
            "hireDate" DATE NOT NULL,
            "baseSalary" DECIMAL(18,2) NOT NULL,
            "benefitsAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "dependentsCount" INTEGER NOT NULL DEFAULT 0,
            "esocialMatricula" VARCHAR(40) NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "hr_employees_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "hr_employees_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );

          CREATE UNIQUE INDEX IF NOT EXISTS "hr_employees_companyId_registrationCode_key" ON "hr_employees"("companyId", "registrationCode");
          CREATE UNIQUE INDEX IF NOT EXISTS "hr_employees_companyId_taxId_key" ON "hr_employees"("companyId", "taxId");
          CREATE INDEX IF NOT EXISTS "hr_employees_tenantId_companyId_status_idx" ON "hr_employees"("tenantId", "companyId", "status");

          CREATE TABLE IF NOT EXISTS "hr_payroll_runs" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "employeeId" UUID NOT NULL,
            "competenceMonth" VARCHAR(7) NOT NULL,
            "grossSalary" DECIMAL(18,2) NOT NULL,
            "overtimeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "benefitsAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "inssEmployeeDiscount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "irrfEmployeeDiscount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "fgtsEmployerAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "inssEmployerAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "netSalary" DECIMAL(18,2) NOT NULL,
            "totalCompanyCost" DECIMAL(18,2) NOT NULL,
            "esocialEventCode" VARCHAR(20) NOT NULL DEFAULT 'S-1200',
            "status" "PayrollStatus" NOT NULL DEFAULT 'CALCULATED',
            "linkedPayableId" UUID,
            "linkedJournalEntryId" UUID,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "hr_payroll_runs_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "hr_payroll_runs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT "hr_payroll_runs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );

          CREATE UNIQUE INDEX IF NOT EXISTS "hr_payroll_runs_companyId_employeeId_competenceMonth_key" ON "hr_payroll_runs"("companyId", "employeeId", "competenceMonth");
          CREATE INDEX IF NOT EXISTS "hr_payroll_runs_tenantId_companyId_competenceMonth_idx" ON "hr_payroll_runs"("tenantId", "companyId", "competenceMonth");
        `);
        console.log('✅ Tabelas do Módulo 05 (RH) criadas com sucesso!');
      }

      // Verifica se as tabelas do Módulo 06 (Comercial & CRM: crm_customers e crm_opportunities) já existem
      const crmCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'crm_customers'
        );
      `);
      if (!crmCheck.rows[0]?.exists) {
        console.log('💼 Aplicando tabelas do Módulo 06 (Comercial & CRM: crm_customers, crm_opportunities)...');
        await client.query(`
          DO $$ BEGIN
            CREATE TYPE "OpportunityStage" AS ENUM ('QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');
          EXCEPTION WHEN duplicate_object THEN null; END $$;

          CREATE TABLE IF NOT EXISTS "crm_customers" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "code" VARCHAR(30) NOT NULL,
            "legalName" VARCHAR(200) NOT NULL,
            "tradeName" VARCHAR(150) NOT NULL,
            "taxId" VARCHAR(20) NOT NULL,
            "email" VARCHAR(160) NOT NULL,
            "segment" VARCHAR(60) NOT NULL DEFAULT 'ENTERPRISE',
            "creditLimit" DECIMAL(18,2) NOT NULL DEFAULT 100000,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "crm_customers_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "crm_customers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );

          CREATE UNIQUE INDEX IF NOT EXISTS "crm_customers_companyId_code_key" ON "crm_customers"("companyId", "code");
          CREATE UNIQUE INDEX IF NOT EXISTS "crm_customers_companyId_taxId_key" ON "crm_customers"("companyId", "taxId");
          CREATE INDEX IF NOT EXISTS "crm_customers_tenantId_companyId_isActive_idx" ON "crm_customers"("tenantId", "companyId", "isActive");

          CREATE TABLE IF NOT EXISTS "crm_opportunities" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "customerId" UUID NOT NULL,
            "code" VARCHAR(30) NOT NULL,
            "title" VARCHAR(200) NOT NULL,
            "salespersonName" VARCHAR(140) NOT NULL,
            "stage" "OpportunityStage" NOT NULL DEFAULT 'PROPOSAL',
            "probabilityPct" INTEGER NOT NULL DEFAULT 60,
            "grossAmount" DECIMAL(18,2) NOT NULL,
            "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "netAmount" DECIMAL(18,2) NOT NULL,
            "commissionRatePct" DECIMAL(10,4) NOT NULL DEFAULT 5.0000,
            "commissionAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "expectedCloseDate" DATE NOT NULL,
            "closedAt" TIMESTAMP(3),
            "linkedReceivableId" UUID,
            "linkedPayableId" UUID,
            "linkedJournalEntryId" UUID,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "crm_opportunities_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "crm_opportunities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT "crm_opportunities_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "crm_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );

          CREATE UNIQUE INDEX IF NOT EXISTS "crm_opportunities_companyId_code_key" ON "crm_opportunities"("companyId", "code");
          CREATE INDEX IF NOT EXISTS "crm_opportunities_tenantId_companyId_stage_idx" ON "crm_opportunities"("tenantId", "companyId", "stage");
        `);
        console.log('✅ Tabelas do Módulo 06 (Comercial & CRM) criadas com sucesso!');
      }

      // Verifica se as tabelas do Módulo 07 (Compras: pur_suppliers e pur_orders) já existem
      const purCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'pur_suppliers'
        );
      `);
      if (!purCheck.rows[0]?.exists) {
        console.log('🛒 Aplicando tabelas do Módulo 07 (Compras & Suprimentos: pur_suppliers, pur_orders)...');
        await client.query(`
          DO $$ BEGIN
            CREATE TYPE "PurchaseOrderStatus" AS ENUM ('QUOTATION', 'PENDING_APPROVAL', 'APPROVED', 'RECEIVED', 'CANCELLED');
          EXCEPTION WHEN duplicate_object THEN null; END $$;

          CREATE TABLE IF NOT EXISTS "pur_suppliers" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "code" VARCHAR(30) NOT NULL,
            "legalName" VARCHAR(200) NOT NULL,
            "tradeName" VARCHAR(150) NOT NULL,
            "taxId" VARCHAR(20) NOT NULL,
            "email" VARCHAR(160) NOT NULL,
            "category" VARCHAR(60) NOT NULL DEFAULT 'CLOUD_TECHNOLOGY',
            "ratingScore" DECIMAL(5,2) NOT NULL DEFAULT 9.50,
            "isHomologated" BOOLEAN NOT NULL DEFAULT true,
            "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "pur_suppliers_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "pur_suppliers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );

          CREATE UNIQUE INDEX IF NOT EXISTS "pur_suppliers_companyId_code_key" ON "pur_suppliers"("companyId", "code");
          CREATE UNIQUE INDEX IF NOT EXISTS "pur_suppliers_companyId_taxId_key" ON "pur_suppliers"("companyId", "taxId");
          CREATE INDEX IF NOT EXISTS "pur_suppliers_tenantId_companyId_isHomologated_idx" ON "pur_suppliers"("tenantId", "companyId", "isHomologated");

          CREATE TABLE IF NOT EXISTS "pur_orders" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "supplierId" UUID NOT NULL,
            "costCenterId" UUID,
            "code" VARCHAR(30) NOT NULL,
            "description" VARCHAR(255) NOT NULL,
            "requesterName" VARCHAR(140) NOT NULL,
            "quote1Amount" DECIMAL(18,2) NOT NULL,
            "quote2Amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "quote3Amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "negotiatedSavings" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "freightAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "totalAmount" DECIMAL(18,2) NOT NULL,
            "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
            "expectedDeliveryDate" DATE NOT NULL,
            "receivedAt" TIMESTAMP(3),
            "linkedWorkflowId" UUID,
            "linkedPayableId" UUID,
            "linkedJournalEntryId" UUID,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "pur_orders_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "pur_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT "pur_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "pur_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );

          CREATE UNIQUE INDEX IF NOT EXISTS "pur_orders_companyId_code_key" ON "pur_orders"("companyId", "code");
          CREATE INDEX IF NOT EXISTS "pur_orders_tenantId_companyId_status_idx" ON "pur_orders"("tenantId", "companyId", "status");
        `);
        console.log('✅ Tabelas do Módulo 07 (Compras & Suprimentos) criadas com sucesso!');
      }

      // Verifica se as tabelas do Módulo 08 (Estoque: inv_items e inv_movements) já existem
      const invCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'inv_items'
        );
      `);
      if (!invCheck.rows[0]?.exists) {
        console.log('📦 Aplicando tabelas do Módulo 08 (Estoque & Inventário: inv_items, inv_movements)...');
        await client.query(`
          DO $$ BEGIN
            CREATE TYPE "StockMovementType" AS ENUM ('INBOUND_PURCHASE', 'OUTBOUND_REQUISITION', 'BRANCH_TRANSFER', 'INVENTORY_ADJUSTMENT');
          EXCEPTION WHEN duplicate_object THEN null; END $$;

          CREATE TABLE IF NOT EXISTS "inv_items" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "sku" VARCHAR(40) NOT NULL,
            "name" VARCHAR(180) NOT NULL,
            "category" VARCHAR(60) NOT NULL DEFAULT 'IT_EQUIPMENT',
            "unit" VARCHAR(10) NOT NULL DEFAULT 'UN',
            "warehouseLocation" VARCHAR(80) NOT NULL DEFAULT 'ALM-CENTRAL-SP',
            "quantityOnHand" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "reorderPoint" DECIMAL(18,2) NOT NULL DEFAULT 5,
            "averageUnitCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "totalStockValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "inv_items_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "inv_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );

          CREATE UNIQUE INDEX IF NOT EXISTS "inv_items_companyId_sku_key" ON "inv_items"("companyId", "sku");
          CREATE INDEX IF NOT EXISTS "inv_items_tenantId_companyId_isActive_idx" ON "inv_items"("tenantId", "companyId", "isActive");

          CREATE TABLE IF NOT EXISTS "inv_movements" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "itemId" UUID NOT NULL,
            "movementType" "StockMovementType" NOT NULL,
            "quantity" DECIMAL(18,2) NOT NULL,
            "unitCost" DECIMAL(18,2) NOT NULL,
            "totalMovementValue" DECIMAL(18,2) NOT NULL,
            "resultingQtyOnHand" DECIMAL(18,2) NOT NULL,
            "resultingAvgCost" DECIMAL(18,2) NOT NULL,
            "referenceDocument" VARCHAR(80) NOT NULL,
            "notes" VARCHAR(255),
            "linkedJournalEntryId" UUID,
            "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "inv_movements_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "inv_movements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT "inv_movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inv_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );

          CREATE INDEX IF NOT EXISTS "inv_movements_tenantId_companyId_itemId_occurredAt_idx" ON "inv_movements"("tenantId", "companyId", "itemId", "occurredAt");
        `);
        console.log('✅ Tabelas do Módulo 08 (Estoque & Inventário) criadas com sucesso!');
      }

      // Verifica se as tabelas do Módulo 09 (Patrimônio: ast_fixed_assets e ast_depreciation_runs) já existem
      const astCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'ast_fixed_assets'
        );
      `);
      if (!astCheck.rows[0]?.exists) {
        console.log('🏛️ Aplicando tabelas do Módulo 09 (Patrimônio & Depreciação CPC 27: ast_fixed_assets, ast_depreciation_runs)...');
        await client.query(`
          DO $$ BEGIN
            CREATE TYPE "FixedAssetStatus" AS ENUM ('IN_USE', 'IN_MAINTENANCE', 'FULLY_DEPRECIATED', 'DISPOSED');
          EXCEPTION WHEN duplicate_object THEN null; END $$;

          CREATE TABLE IF NOT EXISTS "ast_fixed_assets" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "assetTag" VARCHAR(40) NOT NULL,
            "name" VARCHAR(180) NOT NULL,
            "category" VARCHAR(60) NOT NULL DEFAULT 'IT_INFRASTRUCTURE',
            "locationName" VARCHAR(120) NOT NULL DEFAULT 'Datacenter Matriz SP',
            "acquisitionDate" DATE NOT NULL,
            "acquisitionValue" DECIMAL(18,2) NOT NULL,
            "residualValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "usefulLifeMonths" INTEGER NOT NULL DEFAULT 60,
            "annualDepreciationRatePct" DECIMAL(10,4) NOT NULL DEFAULT 20.0000,
            "accumulatedDepreciation" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "netBookValue" DECIMAL(18,2) NOT NULL,
            "status" "FixedAssetStatus" NOT NULL DEFAULT 'IN_USE',
            "lastMaintenanceNotes" VARCHAR(255),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ast_fixed_assets_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "ast_fixed_assets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );

          CREATE UNIQUE INDEX IF NOT EXISTS "ast_fixed_assets_companyId_assetTag_key" ON "ast_fixed_assets"("companyId", "assetTag");
          CREATE INDEX IF NOT EXISTS "ast_fixed_assets_tenantId_companyId_status_idx" ON "ast_fixed_assets"("tenantId", "companyId", "status");

          CREATE TABLE IF NOT EXISTS "ast_depreciation_runs" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "assetId" UUID NOT NULL,
            "competenceMonth" VARCHAR(7) NOT NULL,
            "depreciationQuotaAmount" DECIMAL(18,2) NOT NULL,
            "accumulatedAfterRun" DECIMAL(18,2) NOT NULL,
            "netBookValueAfterRun" DECIMAL(18,2) NOT NULL,
            "linkedJournalEntryId" UUID,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ast_depreciation_runs_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "ast_depreciation_runs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT "ast_depreciation_runs_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ast_fixed_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );

          CREATE UNIQUE INDEX IF NOT EXISTS "ast_depreciation_runs_companyId_assetId_competenceMonth_key" ON "ast_depreciation_runs"("companyId", "assetId", "competenceMonth");
          CREATE INDEX IF NOT EXISTS "ast_depreciation_runs_tenantId_companyId_competenceMonth_idx" ON "ast_depreciation_runs"("tenantId", "companyId", "competenceMonth");
        `);
        console.log('✅ Tabelas do Módulo 09 (Patrimônio & Depreciação) criadas com sucesso!');
      }

      // Verifica se as tabelas dos Módulos 10 (Vendas: sls_orders) e 11 (Pagamentos: pay_gateway_transactions) já existem
      const slsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'sls_orders'
        );
      `);
      if (!slsCheck.rows[0]?.exists) {
        console.log('💳 Aplicando tabelas dos Módulos 10 (Vendas: sls_orders) e 11 (Pagamentos & Gateways: pay_gateway_transactions)...');
        await client.query(`
          DO $$ BEGIN
            CREATE TYPE "SalesOrderStatus" AS ENUM ('CONFIRMED', 'INVOICED_DISPATCHED', 'CANCELLED');
          EXCEPTION WHEN duplicate_object THEN null; END $$;

          DO $$ BEGIN
            CREATE TYPE "GatewayPaymentStatus" AS ENUM ('AUTHORIZED', 'CAPTURED_SETTLED', 'CHARGEBACK_DISPUTE', 'REFUNDED');
          EXCEPTION WHEN duplicate_object THEN null; END $$;

          CREATE TABLE IF NOT EXISTS "sls_orders" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "customerId" UUID NOT NULL,
            "inventoryItemId" UUID,
            "orderNumber" VARCHAR(30) NOT NULL,
            "salespersonName" VARCHAR(140) NOT NULL,
            "quantity" DECIMAL(18,2) NOT NULL DEFAULT 1,
            "unitPrice" DECIMAL(18,2) NOT NULL,
            "grossAmount" DECIMAL(18,2) NOT NULL,
            "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "netAmount" DECIMAL(18,2) NOT NULL,
            "cmvAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "commissionAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "status" "SalesOrderStatus" NOT NULL DEFAULT 'CONFIRMED',
            "linkedReceivableId" UUID,
            "linkedStockMoveId" UUID,
            "linkedJournalEntryId" UUID,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "sls_orders_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "sls_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT "sls_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "crm_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );

          CREATE UNIQUE INDEX IF NOT EXISTS "sls_orders_companyId_orderNumber_key" ON "sls_orders"("companyId", "orderNumber");
          CREATE INDEX IF NOT EXISTS "sls_orders_tenantId_companyId_status_idx" ON "sls_orders"("tenantId", "companyId", "status");

          CREATE TABLE IF NOT EXISTS "pay_gateway_transactions" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "receivableId" UUID,
            "gatewayProvider" VARCHAR(60) NOT NULL DEFAULT 'STRIPE_PAGARME_PIX',
            "externalNsuCode" VARCHAR(80) NOT NULL,
            "paymentMethod" VARCHAR(30) NOT NULL,
            "installments" INTEGER NOT NULL DEFAULT 1,
            "grossAmount" DECIMAL(18,2) NOT NULL,
            "mdrRatePct" DECIMAL(10,4) NOT NULL,
            "mdrFeeAmount" DECIMAL(18,2) NOT NULL,
            "netSettledAmount" DECIMAL(18,2) NOT NULL,
            "status" "GatewayPaymentStatus" NOT NULL DEFAULT 'CAPTURED_SETTLED',
            "chargebackReason" VARCHAR(200),
            "linkedBankTxId" UUID,
            "linkedJournalEntryId" UUID,
            "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "pay_gateway_transactions_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "pay_gateway_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );

          CREATE UNIQUE INDEX IF NOT EXISTS "pay_gateway_transactions_companyId_externalNsuCode_key" ON "pay_gateway_transactions"("companyId", "externalNsuCode");
          CREATE INDEX IF NOT EXISTS "pay_gateway_transactions_tenantId_companyId_status_occurredAt_idx" ON "pay_gateway_transactions"("tenantId", "companyId", "status", "occurredAt");
        `);
        console.log('✅ Tabelas dos Módulos 10 (Vendas) e 11 (Pagamentos & Gateways) criadas com sucesso!');
      }

      const ctrCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'ctr_contracts'
        ) as exists;
      `);
      if (!ctrCheck.rows[0]?.exists) {
        console.log('📜 Aplicando tabelas dos Módulos 12 a 16 (Contratos, SAC, Marketing, BI & Documentos ICP-Brasil)...');
        await client.query(`
          CREATE TABLE IF NOT EXISTS "ctr_contracts" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "contractNumber" VARCHAR(40) NOT NULL,
            "title" VARCHAR(180) NOT NULL,
            "counterpartyName" VARCHAR(180) NOT NULL,
            "counterpartyTaxId" VARCHAR(20) NOT NULL,
            "contractNature" VARCHAR(30) NOT NULL DEFAULT 'REVENUE_SAAS',
            "readjustmentIndex" VARCHAR(20) NOT NULL DEFAULT 'IGPM',
            "originalMonthlyVal" DECIMAL(18,2) NOT NULL,
            "currentMonthlyVal" DECIMAL(18,2) NOT NULL,
            "accumulatedReadjPct" DECIMAL(10,4) NOT NULL DEFAULT 0,
            "startDate" DATE NOT NULL,
            "endDate" DATE NOT NULL,
            "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
            "lastReadjustedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ctr_contracts_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "ctr_contracts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );
          CREATE UNIQUE INDEX IF NOT EXISTS "ctr_contracts_companyId_contractNumber_key" ON "ctr_contracts"("companyId", "contractNumber");
          CREATE INDEX IF NOT EXISTS "ctr_contracts_tenantId_companyId_status_idx" ON "ctr_contracts"("tenantId", "companyId", "status");

          CREATE TABLE IF NOT EXISTS "sac_support_tickets" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "protocolNumber" VARCHAR(40) NOT NULL,
            "customerName" VARCHAR(180) NOT NULL,
            "customerTaxId" VARCHAR(20) NOT NULL,
            "subject" VARCHAR(200) NOT NULL,
            "priority" VARCHAR(20) NOT NULL DEFAULT 'HIGH',
            "slaTargetHours" INTEGER NOT NULL DEFAULT 4,
            "elapsedHours" DECIMAL(10,2) NOT NULL DEFAULT 1.5,
            "refundRequested" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "refundApproved" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "status" VARCHAR(30) NOT NULL DEFAULT 'OPEN_IN_SLA',
            "linkedPayableId" UUID,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "sac_support_tickets_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "sac_support_tickets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );
          CREATE UNIQUE INDEX IF NOT EXISTS "sac_support_tickets_companyId_protocolNumber_key" ON "sac_support_tickets"("companyId", "protocolNumber");
          CREATE INDEX IF NOT EXISTS "sac_support_tickets_tenantId_companyId_status_idx" ON "sac_support_tickets"("tenantId", "companyId", "status");

          CREATE TABLE IF NOT EXISTS "mkt_campaigns" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "code" VARCHAR(40) NOT NULL,
            "name" VARCHAR(180) NOT NULL,
            "channel" VARCHAR(50) NOT NULL DEFAULT 'GOOGLE_META_ADS',
            "couponCode" VARCHAR(40) NOT NULL,
            "discountPct" DECIMAL(10,2) NOT NULL DEFAULT 10,
            "budgetSpent" DECIMAL(18,2) NOT NULL,
            "conversionsCount" INTEGER NOT NULL DEFAULT 0,
            "attributedRevenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
            "roasMultiplier" DECIMAL(10,2) NOT NULL DEFAULT 0,
            "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "mkt_campaigns_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "mkt_campaigns_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );
          CREATE UNIQUE INDEX IF NOT EXISTS "mkt_campaigns_companyId_code_key" ON "mkt_campaigns"("companyId", "code");
          CREATE INDEX IF NOT EXISTS "mkt_campaigns_tenantId_companyId_status_idx" ON "mkt_campaigns"("tenantId", "companyId", "status");

          CREATE TABLE IF NOT EXISTS "doc_digital_documents" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenantId" UUID NOT NULL,
            "companyId" UUID NOT NULL,
            "documentCode" VARCHAR(40) NOT NULL,
            "title" VARCHAR(200) NOT NULL,
            "category" VARCHAR(50) NOT NULL DEFAULT 'CONTRACT_ADDENDUM',
            "sha256Hash" VARCHAR(128) NOT NULL,
            "signerName" VARCHAR(160) NOT NULL,
            "signerTaxId" VARCHAR(20) NOT NULL,
            "certificateType" VARCHAR(40) NOT NULL DEFAULT 'ICP_BRASIL_A3',
            "signatureStatus" VARCHAR(30) NOT NULL DEFAULT 'SIGNED_VERIFIED',
            "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "doc_digital_documents_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "doc_digital_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );
          CREATE UNIQUE INDEX IF NOT EXISTS "doc_digital_documents_companyId_documentCode_key" ON "doc_digital_documents"("companyId", "documentCode");
          CREATE INDEX IF NOT EXISTS "doc_digital_documents_tenantId_companyId_signatureStatus_idx" ON "doc_digital_documents"("tenantId", "companyId", "signatureStatus");
        `);
        console.log('✅ Tabelas dos Módulos 12 a 16 criadas com sucesso!');
      } else {
        console.log('ℹ️ Estrutura de banco de dados já está 100% atualizada.');
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error('❌ Erro ao aplicar migration:', err);
  process.exit(1);
});
