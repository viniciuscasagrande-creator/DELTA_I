-- CreateEnum
CREATE TYPE "ModuleCode" AS ENUM ('DASHBOARD', 'FINANCIAL', 'ACCOUNTING', 'FISCAL', 'HR', 'CRM', 'PURCHASING', 'INVENTORY', 'ASSETS', 'SALES', 'PAYMENTS', 'CONTRACTS', 'SAC', 'MARKETING', 'ANALYTICS', 'DOCUMENTS', 'WORKFLOW', 'EXTERNAL_PORTAL', 'ADMINISTRATION', 'INTEGRATIONS', 'EVENTS');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('INTERNAL', 'EXTERNAL_CLIENT', 'EXTERNAL_SUPPLIER', 'EXTERNAL_PARTNER', 'EXTERNAL_PRODUCER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING_MFA', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "FinancialTitleStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT', 'TRANSFER_IN', 'TRANSFER_OUT', 'FEE_DEDUCTION', 'REVERSAL');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'MATCHED_AUTOMATIC', 'MATCHED_MANUAL', 'DIVERGENT');

-- CreateEnum
CREATE TYPE "AccountNature" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ON_SALE', 'FINISHED', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FiscalDocumentModel" AS ENUM ('NFE', 'NFCE', 'NFSE');

-- CreateEnum
CREATE TYPE "FiscalDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "FiscalDocumentStatus" AS ENUM ('VALIDATED', 'AUTHORIZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('CLT', 'PJ', 'INTERN', 'STATUTORY_DIRECTOR');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ON_VACATION', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('CALCULATED', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('QUOTATION', 'PENDING_APPROVAL', 'APPROVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('INBOUND_PURCHASE', 'OUTBOUND_REQUISITION', 'BRANCH_TRANSFER', 'INVENTORY_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "FixedAssetStatus" AS ENUM ('IN_USE', 'IN_MAINTENANCE', 'FULLY_DEPRECIATED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('CONFIRMED', 'INVOICED_DISPATCHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GatewayPaymentStatus" AS ENUM ('AUTHORIZED', 'CAPTURED_SETTLED', 'CHARGEBACK_DISPUTE', 'REFUNDED');

-- CreateTable
CREATE TABLE "core_tenants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "planTier" VARCHAR(40) NOT NULL DEFAULT 'ENTERPRISE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_companies" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "legalName" VARCHAR(200) NOT NULL,
    "tradeName" VARCHAR(150) NOT NULL,
    "taxId" VARCHAR(20) NOT NULL,
    "stateRegistration" VARCHAR(30),
    "municipalReg" VARCHAR(30),
    "taxRegime" VARCHAR(40) NOT NULL DEFAULT 'LUCRO_REAL',
    "baseCurrency" VARCHAR(3) NOT NULL DEFAULT 'BRL',
    "isHeadquarters" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_branches" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "taxId" VARCHAR(20),
    "city" VARCHAR(100),
    "state" VARCHAR(2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_departments" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_cost_centers" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "parentId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_users" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "email" VARCHAR(180) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "userType" "UserType" NOT NULL DEFAULT 'INTERNAL',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecretEncrypted" VARCHAR(255),
    "externalEntityId" UUID,
    "lastLoginAt" TIMESTAMP(3),
    "lgpdConsentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_roles" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "maxApprovalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_permissions" (
    "id" UUID NOT NULL,
    "moduleCode" "ModuleCode" NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_role_permissions" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_user_company_access" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "allowedCostCenterIds" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_user_company_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_tenant_module_subscriptions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID,
    "moduleCode" "ModuleCode" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "configJson" JSONB,

    CONSTRAINT "core_tenant_module_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_audit_logs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID,
    "userId" UUID,
    "moduleCode" "ModuleCode" NOT NULL,
    "entityName" VARCHAR(100) NOT NULL,
    "entityId" VARCHAR(100) NOT NULL,
    "action" VARCHAR(60) NOT NULL,
    "previousValues" JSONB,
    "newValues" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(255),
    "requestId" VARCHAR(100),
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_workflow_instances" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "moduleCode" "ModuleCode" NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" UUID NOT NULL,
    "referenceAmount" DECIMAL(18,2) NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" UUID NOT NULL,
    "decidedById" UUID,
    "decisionNotes" VARCHAR(500),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_outbox_events" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID,
    "aggregateType" VARCHAR(100) NOT NULL,
    "aggregateId" VARCHAR(100) NOT NULL,
    "eventType" VARCHAR(120) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "core_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_bank_accounts" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "bankCode" VARCHAR(10) NOT NULL,
    "agencyNumber" VARCHAR(20) NOT NULL,
    "accountNumber" VARCHAR(30) NOT NULL,
    "pixKey" VARCHAR(120),
    "initialBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_categories" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "nature" "AccountNature" NOT NULL,
    "chartOfAccountId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_accounts_payable" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID,
    "categoryId" UUID NOT NULL,
    "costCenterId" UUID,
    "supplierName" VARCHAR(180) NOT NULL,
    "supplierTaxId" VARCHAR(20) NOT NULL,
    "documentNumber" VARCHAR(60) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "originModule" "ModuleCode" NOT NULL DEFAULT 'FINANCIAL',
    "originReferenceId" UUID,
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "competenceDate" DATE NOT NULL,
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "interestAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxRetainedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(18,2) NOT NULL,
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "FinancialTitleStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "idempotencyKey" VARCHAR(100) NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_accounts_payable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_accounts_receivable" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID,
    "categoryId" UUID NOT NULL,
    "costCenterId" UUID,
    "customerName" VARCHAR(180) NOT NULL,
    "customerTaxId" VARCHAR(20) NOT NULL,
    "documentNumber" VARCHAR(60) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "originModule" "ModuleCode" NOT NULL DEFAULT 'FINANCIAL',
    "originReferenceId" UUID,
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "competenceDate" DATE NOT NULL,
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "acquirerFeeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(18,2) NOT NULL,
    "receivedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "FinancialTitleStatus" NOT NULL DEFAULT 'APPROVED',
    "idempotencyKey" VARCHAR(100) NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_accounts_receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fin_transactions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "bankAccountId" UUID NOT NULL,
    "payableId" UUID,
    "receivableId" UUID,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" VARCHAR(40) NOT NULL,
    "externalBankRef" VARCHAR(120),
    "reconciliationStatus" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "reconciledAt" TIMESTAMP(3),
    "notes" VARCHAR(255),
    "idempotencyKey" VARCHAR(100) NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acc_chart_of_accounts" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "nature" "AccountNature" NOT NULL,
    "isAnalytical" BOOLEAN NOT NULL DEFAULT true,
    "parentId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acc_chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acc_journal_entries" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "entryNumber" INTEGER NOT NULL,
    "competenceDate" DATE NOT NULL,
    "postingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" VARCHAR(255) NOT NULL,
    "originModule" "ModuleCode" NOT NULL,
    "originReferenceId" UUID,
    "totalDebit" DECIMAL(18,2) NOT NULL,
    "totalCredit" DECIMAL(18,2) NOT NULL,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'POSTED',
    "reversedEntryId" UUID,
    "idempotencyKey" VARCHAR(100) NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acc_journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acc_journal_entry_lines" (
    "id" UUID NOT NULL,
    "journalEntryId" UUID NOT NULL,
    "chartOfAccountId" UUID NOT NULL,
    "costCenterId" UUID,
    "debitAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "creditAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "memo" VARCHAR(255),

    CONSTRAINT "acc_journal_entry_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evt_producers" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "legalName" VARCHAR(200) NOT NULL,
    "tradeName" VARCHAR(150) NOT NULL,
    "taxId" VARCHAR(20) NOT NULL,
    "pixKeyForPayout" VARCHAR(120) NOT NULL,
    "defaultFeePct" DECIMAL(10,4) NOT NULL DEFAULT 10.0000,
    "advanceFeePct" DECIMAL(10,4) NOT NULL DEFAULT 2.5000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evt_producers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evt_events" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "producerId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "venueName" VARCHAR(150) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "serviceFeePct" DECIMAL(10,4) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "grossTicketSales" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalServiceFees" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAcquirerFees" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalChargebacks" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAdvanced" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalPaidOut" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evt_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evt_ticket_batches" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "faceValue" DECIMAL(18,2) NOT NULL,
    "serviceFee" DECIMAL(18,2) NOT NULL,
    "totalQuota" INTEGER NOT NULL,
    "soldQuantity" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evt_ticket_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evt_producer_settlements" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "producerId" UUID NOT NULL,
    "isAdvancePayout" BOOLEAN NOT NULL DEFAULT false,
    "requestedAmount" DECIMAL(18,2) NOT NULL,
    "advanceFeeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netPayoutAmount" DECIMAL(18,2) NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
    "payableId" UUID,
    "requestedById" UUID NOT NULL,
    "approvedById" UUID,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "evt_producer_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_tax_rules" (
    "id" UUID NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fis_tax_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fis_documents" (
    "id" UUID NOT NULL,
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

    CONSTRAINT "fis_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_employees" (
    "id" UUID NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_payroll_runs" (
    "id" UUID NOT NULL,
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

    CONSTRAINT "hr_payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_customers" (
    "id" UUID NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_opportunities" (
    "id" UUID NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pur_suppliers" (
    "id" UUID NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pur_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pur_orders" (
    "id" UUID NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pur_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_items" (
    "id" UUID NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inv_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_movements" (
    "id" UUID NOT NULL,
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

    CONSTRAINT "inv_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ast_fixed_assets" (
    "id" UUID NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ast_fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ast_depreciation_runs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "competenceMonth" VARCHAR(7) NOT NULL,
    "depreciationQuotaAmount" DECIMAL(18,2) NOT NULL,
    "accumulatedAfterRun" DECIMAL(18,2) NOT NULL,
    "netBookValueAfterRun" DECIMAL(18,2) NOT NULL,
    "linkedJournalEntryId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ast_depreciation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sls_orders" (
    "id" UUID NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sls_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_gateway_transactions" (
    "id" UUID NOT NULL,
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

    CONSTRAINT "pay_gateway_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ctr_contracts" (
    "id" UUID NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ctr_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sac_support_tickets" (
    "id" UUID NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sac_support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_campaigns" (
    "id" UUID NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mkt_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc_digital_documents" (
    "id" UUID NOT NULL,
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

    CONSTRAINT "doc_digital_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "core_tenants_slug_key" ON "core_tenants"("slug");

-- CreateIndex
CREATE INDEX "core_companies_tenantId_idx" ON "core_companies"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "core_companies_tenantId_taxId_key" ON "core_companies"("tenantId", "taxId");

-- CreateIndex
CREATE UNIQUE INDEX "core_companies_tenantId_code_key" ON "core_companies"("tenantId", "code");

-- CreateIndex
CREATE INDEX "core_branches_tenantId_companyId_idx" ON "core_branches"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "core_branches_companyId_code_key" ON "core_branches"("companyId", "code");

-- CreateIndex
CREATE INDEX "core_departments_tenantId_companyId_idx" ON "core_departments"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "core_departments_companyId_code_key" ON "core_departments"("companyId", "code");

-- CreateIndex
CREATE INDEX "core_cost_centers_tenantId_companyId_idx" ON "core_cost_centers"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "core_cost_centers_companyId_code_key" ON "core_cost_centers"("companyId", "code");

-- CreateIndex
CREATE INDEX "core_users_tenantId_userType_idx" ON "core_users"("tenantId", "userType");

-- CreateIndex
CREATE UNIQUE INDEX "core_users_tenantId_email_key" ON "core_users"("tenantId", "email");

-- CreateIndex
CREATE INDEX "core_roles_tenantId_idx" ON "core_roles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "core_roles_tenantId_code_key" ON "core_roles"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "core_permissions_code_key" ON "core_permissions"("code");

-- CreateIndex
CREATE INDEX "core_permissions_moduleCode_idx" ON "core_permissions"("moduleCode");

-- CreateIndex
CREATE UNIQUE INDEX "core_role_permissions_roleId_permissionId_key" ON "core_role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "core_user_company_access_tenantId_companyId_idx" ON "core_user_company_access"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "core_user_company_access_userId_companyId_roleId_key" ON "core_user_company_access"("userId", "companyId", "roleId");

-- CreateIndex
CREATE INDEX "core_tenant_module_subscriptions_tenantId_isEnabled_idx" ON "core_tenant_module_subscriptions"("tenantId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "core_tenant_module_subscriptions_tenantId_companyId_moduleC_key" ON "core_tenant_module_subscriptions"("tenantId", "companyId", "moduleCode");

-- CreateIndex
CREATE INDEX "core_audit_logs_tenantId_companyId_moduleCode_occurredAt_idx" ON "core_audit_logs"("tenantId", "companyId", "moduleCode", "occurredAt");

-- CreateIndex
CREATE INDEX "core_audit_logs_tenantId_entityName_entityId_idx" ON "core_audit_logs"("tenantId", "entityName", "entityId");

-- CreateIndex
CREATE INDEX "core_workflow_instances_tenantId_companyId_status_idx" ON "core_workflow_instances"("tenantId", "companyId", "status");

-- CreateIndex
CREATE INDEX "core_workflow_instances_entityType_entityId_idx" ON "core_workflow_instances"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "core_outbox_events_status_occurredAt_idx" ON "core_outbox_events"("status", "occurredAt");

-- CreateIndex
CREATE INDEX "core_outbox_events_tenantId_eventType_idx" ON "core_outbox_events"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "fin_bank_accounts_tenantId_companyId_idx" ON "fin_bank_accounts"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_bank_accounts_companyId_code_key" ON "fin_bank_accounts"("companyId", "code");

-- CreateIndex
CREATE INDEX "fin_categories_tenantId_companyId_idx" ON "fin_categories"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_categories_companyId_code_key" ON "fin_categories"("companyId", "code");

-- CreateIndex
CREATE INDEX "fin_accounts_payable_tenantId_companyId_status_dueDate_idx" ON "fin_accounts_payable"("tenantId", "companyId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "fin_accounts_payable_tenantId_companyId_supplierTaxId_idx" ON "fin_accounts_payable"("tenantId", "companyId", "supplierTaxId");

-- CreateIndex
CREATE UNIQUE INDEX "fin_accounts_payable_tenantId_idempotencyKey_key" ON "fin_accounts_payable"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "fin_accounts_receivable_tenantId_companyId_status_dueDate_idx" ON "fin_accounts_receivable"("tenantId", "companyId", "status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "fin_accounts_receivable_tenantId_idempotencyKey_key" ON "fin_accounts_receivable"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "fin_transactions_tenantId_companyId_bankAccountId_occurredA_idx" ON "fin_transactions"("tenantId", "companyId", "bankAccountId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "fin_transactions_tenantId_idempotencyKey_key" ON "fin_transactions"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "acc_chart_of_accounts_tenantId_companyId_idx" ON "acc_chart_of_accounts"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "acc_chart_of_accounts_companyId_code_key" ON "acc_chart_of_accounts"("companyId", "code");

-- CreateIndex
CREATE INDEX "acc_journal_entries_tenantId_companyId_competenceDate_idx" ON "acc_journal_entries"("tenantId", "companyId", "competenceDate");

-- CreateIndex
CREATE UNIQUE INDEX "acc_journal_entries_tenantId_idempotencyKey_key" ON "acc_journal_entries"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "acc_journal_entries_companyId_entryNumber_key" ON "acc_journal_entries"("companyId", "entryNumber");

-- CreateIndex
CREATE INDEX "acc_journal_entry_lines_journalEntryId_idx" ON "acc_journal_entry_lines"("journalEntryId");

-- CreateIndex
CREATE INDEX "acc_journal_entry_lines_chartOfAccountId_idx" ON "acc_journal_entry_lines"("chartOfAccountId");

-- CreateIndex
CREATE INDEX "evt_producers_tenantId_companyId_idx" ON "evt_producers"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "evt_producers_companyId_taxId_key" ON "evt_producers"("companyId", "taxId");

-- CreateIndex
CREATE INDEX "evt_events_tenantId_companyId_producerId_status_idx" ON "evt_events"("tenantId", "companyId", "producerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "evt_events_companyId_code_key" ON "evt_events"("companyId", "code");

-- CreateIndex
CREATE INDEX "evt_ticket_batches_eventId_idx" ON "evt_ticket_batches"("eventId");

-- CreateIndex
CREATE INDEX "evt_producer_settlements_tenantId_companyId_eventId_status_idx" ON "evt_producer_settlements"("tenantId", "companyId", "eventId", "status");

-- CreateIndex
CREATE INDEX "fis_tax_rules_tenantId_companyId_idx" ON "fis_tax_rules"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "fis_tax_rules_companyId_code_key" ON "fis_tax_rules"("companyId", "code");

-- CreateIndex
CREATE INDEX "fis_documents_tenantId_companyId_direction_competenceDate_idx" ON "fis_documents"("tenantId", "companyId", "direction", "competenceDate");

-- CreateIndex
CREATE UNIQUE INDEX "fis_documents_tenantId_idempotencyKey_key" ON "fis_documents"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "hr_employees_tenantId_companyId_status_idx" ON "hr_employees"("tenantId", "companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "hr_employees_companyId_registrationCode_key" ON "hr_employees"("companyId", "registrationCode");

-- CreateIndex
CREATE UNIQUE INDEX "hr_employees_companyId_taxId_key" ON "hr_employees"("companyId", "taxId");

-- CreateIndex
CREATE INDEX "hr_payroll_runs_tenantId_companyId_competenceMonth_idx" ON "hr_payroll_runs"("tenantId", "companyId", "competenceMonth");

-- CreateIndex
CREATE UNIQUE INDEX "hr_payroll_runs_companyId_employeeId_competenceMonth_key" ON "hr_payroll_runs"("companyId", "employeeId", "competenceMonth");

-- CreateIndex
CREATE INDEX "crm_customers_tenantId_companyId_isActive_idx" ON "crm_customers"("tenantId", "companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "crm_customers_companyId_code_key" ON "crm_customers"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "crm_customers_companyId_taxId_key" ON "crm_customers"("companyId", "taxId");

-- CreateIndex
CREATE INDEX "crm_opportunities_tenantId_companyId_stage_idx" ON "crm_opportunities"("tenantId", "companyId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "crm_opportunities_companyId_code_key" ON "crm_opportunities"("companyId", "code");

-- CreateIndex
CREATE INDEX "pur_suppliers_tenantId_companyId_isHomologated_idx" ON "pur_suppliers"("tenantId", "companyId", "isHomologated");

-- CreateIndex
CREATE UNIQUE INDEX "pur_suppliers_companyId_code_key" ON "pur_suppliers"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "pur_suppliers_companyId_taxId_key" ON "pur_suppliers"("companyId", "taxId");

-- CreateIndex
CREATE INDEX "pur_orders_tenantId_companyId_status_idx" ON "pur_orders"("tenantId", "companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pur_orders_companyId_code_key" ON "pur_orders"("companyId", "code");

-- CreateIndex
CREATE INDEX "inv_items_tenantId_companyId_isActive_idx" ON "inv_items"("tenantId", "companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "inv_items_companyId_sku_key" ON "inv_items"("companyId", "sku");

-- CreateIndex
CREATE INDEX "inv_movements_tenantId_companyId_itemId_occurredAt_idx" ON "inv_movements"("tenantId", "companyId", "itemId", "occurredAt");

-- CreateIndex
CREATE INDEX "ast_fixed_assets_tenantId_companyId_status_idx" ON "ast_fixed_assets"("tenantId", "companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ast_fixed_assets_companyId_assetTag_key" ON "ast_fixed_assets"("companyId", "assetTag");

-- CreateIndex
CREATE INDEX "ast_depreciation_runs_tenantId_companyId_competenceMonth_idx" ON "ast_depreciation_runs"("tenantId", "companyId", "competenceMonth");

-- CreateIndex
CREATE UNIQUE INDEX "ast_depreciation_runs_companyId_assetId_competenceMonth_key" ON "ast_depreciation_runs"("companyId", "assetId", "competenceMonth");

-- CreateIndex
CREATE INDEX "sls_orders_tenantId_companyId_status_idx" ON "sls_orders"("tenantId", "companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sls_orders_companyId_orderNumber_key" ON "sls_orders"("companyId", "orderNumber");

-- CreateIndex
CREATE INDEX "pay_gateway_transactions_tenantId_companyId_status_occurred_idx" ON "pay_gateway_transactions"("tenantId", "companyId", "status", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "pay_gateway_transactions_companyId_externalNsuCode_key" ON "pay_gateway_transactions"("companyId", "externalNsuCode");

-- CreateIndex
CREATE INDEX "ctr_contracts_tenantId_companyId_status_idx" ON "ctr_contracts"("tenantId", "companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ctr_contracts_companyId_contractNumber_key" ON "ctr_contracts"("companyId", "contractNumber");

-- CreateIndex
CREATE INDEX "sac_support_tickets_tenantId_companyId_status_idx" ON "sac_support_tickets"("tenantId", "companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sac_support_tickets_companyId_protocolNumber_key" ON "sac_support_tickets"("companyId", "protocolNumber");

-- CreateIndex
CREATE INDEX "mkt_campaigns_tenantId_companyId_status_idx" ON "mkt_campaigns"("tenantId", "companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mkt_campaigns_companyId_code_key" ON "mkt_campaigns"("companyId", "code");

-- CreateIndex
CREATE INDEX "doc_digital_documents_tenantId_companyId_signatureStatus_idx" ON "doc_digital_documents"("tenantId", "companyId", "signatureStatus");

-- CreateIndex
CREATE UNIQUE INDEX "doc_digital_documents_companyId_documentCode_key" ON "doc_digital_documents"("companyId", "documentCode");

-- AddForeignKey
ALTER TABLE "core_companies" ADD CONSTRAINT "core_companies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_branches" ADD CONSTRAINT "core_branches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_departments" ADD CONSTRAINT "core_departments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_cost_centers" ADD CONSTRAINT "core_cost_centers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_cost_centers" ADD CONSTRAINT "core_cost_centers_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "core_cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_users" ADD CONSTRAINT "core_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_roles" ADD CONSTRAINT "core_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_role_permissions" ADD CONSTRAINT "core_role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "core_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_role_permissions" ADD CONSTRAINT "core_role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "core_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_user_company_access" ADD CONSTRAINT "core_user_company_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "core_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_user_company_access" ADD CONSTRAINT "core_user_company_access_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_user_company_access" ADD CONSTRAINT "core_user_company_access_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "core_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_tenant_module_subscriptions" ADD CONSTRAINT "core_tenant_module_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_audit_logs" ADD CONSTRAINT "core_audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "core_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_audit_logs" ADD CONSTRAINT "core_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "core_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_outbox_events" ADD CONSTRAINT "core_outbox_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "core_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_bank_accounts" ADD CONSTRAINT "fin_bank_accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_categories" ADD CONSTRAINT "fin_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_accounts_payable" ADD CONSTRAINT "fin_accounts_payable_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_accounts_payable" ADD CONSTRAINT "fin_accounts_payable_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "fin_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_accounts_payable" ADD CONSTRAINT "fin_accounts_payable_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "core_cost_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_accounts_receivable" ADD CONSTRAINT "fin_accounts_receivable_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_accounts_receivable" ADD CONSTRAINT "fin_accounts_receivable_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "fin_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_accounts_receivable" ADD CONSTRAINT "fin_accounts_receivable_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "core_cost_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_transactions" ADD CONSTRAINT "fin_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_transactions" ADD CONSTRAINT "fin_transactions_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "fin_bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_transactions" ADD CONSTRAINT "fin_transactions_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "fin_accounts_payable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_transactions" ADD CONSTRAINT "fin_transactions_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "fin_accounts_receivable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acc_chart_of_accounts" ADD CONSTRAINT "acc_chart_of_accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acc_chart_of_accounts" ADD CONSTRAINT "acc_chart_of_accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "acc_chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acc_journal_entries" ADD CONSTRAINT "acc_journal_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acc_journal_entry_lines" ADD CONSTRAINT "acc_journal_entry_lines_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "acc_journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acc_journal_entry_lines" ADD CONSTRAINT "acc_journal_entry_lines_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "acc_chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acc_journal_entry_lines" ADD CONSTRAINT "acc_journal_entry_lines_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "core_cost_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evt_producers" ADD CONSTRAINT "evt_producers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evt_events" ADD CONSTRAINT "evt_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evt_events" ADD CONSTRAINT "evt_events_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "evt_producers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evt_ticket_batches" ADD CONSTRAINT "evt_ticket_batches_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "evt_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evt_producer_settlements" ADD CONSTRAINT "evt_producer_settlements_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "evt_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evt_producer_settlements" ADD CONSTRAINT "evt_producer_settlements_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "evt_producers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_tax_rules" ADD CONSTRAINT "fis_tax_rules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_documents" ADD CONSTRAINT "fis_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fis_documents" ADD CONSTRAINT "fis_documents_taxRuleId_fkey" FOREIGN KEY ("taxRuleId") REFERENCES "fis_tax_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_payroll_runs" ADD CONSTRAINT "hr_payroll_runs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_payroll_runs" ADD CONSTRAINT "hr_payroll_runs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "hr_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_customers" ADD CONSTRAINT "crm_customers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "crm_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pur_suppliers" ADD CONSTRAINT "pur_suppliers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pur_orders" ADD CONSTRAINT "pur_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pur_orders" ADD CONSTRAINT "pur_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "pur_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_items" ADD CONSTRAINT "inv_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_movements" ADD CONSTRAINT "inv_movements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_movements" ADD CONSTRAINT "inv_movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inv_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ast_fixed_assets" ADD CONSTRAINT "ast_fixed_assets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ast_depreciation_runs" ADD CONSTRAINT "ast_depreciation_runs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ast_depreciation_runs" ADD CONSTRAINT "ast_depreciation_runs_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ast_fixed_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sls_orders" ADD CONSTRAINT "sls_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sls_orders" ADD CONSTRAINT "sls_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "crm_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_gateway_transactions" ADD CONSTRAINT "pay_gateway_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ctr_contracts" ADD CONSTRAINT "ctr_contracts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sac_support_tickets" ADD CONSTRAINT "sac_support_tickets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_campaigns" ADD CONSTRAINT "mkt_campaigns_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc_digital_documents" ADD CONSTRAINT "doc_digital_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "core_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row-Level Security (RLS) Estrita por Tenant e Empresa (Unificada com db-migrate.ts)
DO $$
DECLARE
  t text;
BEGIN
  ALTER TABLE core_companies ENABLE ROW LEVEL SECURITY;
  ALTER TABLE core_companies FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS tenant_isolation_rls_policy ON core_companies;
  CREATE POLICY tenant_isolation_rls_policy ON core_companies
    USING (
      current_setting('app.current_tenant_id', true) IS NOT NULL
      AND current_setting('app.current_tenant_id', true) <> ''
      AND "tenantId"::text = current_setting('app.current_tenant_id', true)
    )
    WITH CHECK (
      current_setting('app.current_tenant_id', true) IS NOT NULL
      AND current_setting('app.current_tenant_id', true) <> ''
      AND "tenantId"::text = current_setting('app.current_tenant_id', true)
    );

  FOREACH t IN ARRAY ARRAY[
    'core_branches', 'core_departments', 'core_cost_centers',
    'fin_bank_accounts', 'fin_accounts_payable', 'fin_accounts_receivable', 'fin_transactions',
    'acc_chart_of_accounts', 'acc_journal_entries', 'fis_documents', 'hr_employees',
    'crm_customers', 'crm_opportunities', 'pur_suppliers', 'pur_orders',
    'inv_items', 'inv_movements', 'ast_fixed_assets', 'ast_depreciation_runs',
    'sls_orders', 'pay_gateway_transactions', 'ctr_contracts',
    'sac_support_tickets', 'mkt_campaigns', 'doc_digital_documents'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_rls_policy ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_company_isolation_rls_policy ON %I;', t);
    EXECUTE format(
      'CREATE POLICY tenant_company_isolation_rls_policy ON %I USING (current_setting(''app.current_tenant_id'', true) IS NOT NULL AND current_setting(''app.current_tenant_id'', true) <> '''' AND current_setting(''app.current_company_id'', true) IS NOT NULL AND current_setting(''app.current_company_id'', true) <> '''' AND "tenantId"::text = current_setting(''app.current_tenant_id'', true) AND "companyId"::text = current_setting(''app.current_company_id'', true)) WITH CHECK (current_setting(''app.current_tenant_id'', true) IS NOT NULL AND current_setting(''app.current_tenant_id'', true) <> '''' AND current_setting(''app.current_company_id'', true) IS NOT NULL AND current_setting(''app.current_company_id'', true) <> '''' AND "tenantId"::text = current_setting(''app.current_tenant_id'', true) AND "companyId"::text = current_setting(''app.current_company_id'', true));',
      t
    );
  END LOOP;
END $$;


