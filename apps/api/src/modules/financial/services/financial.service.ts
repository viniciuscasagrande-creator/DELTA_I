import { ErpModuleCode, roundCurrency, TenantExecutionContext } from '@delta-erp/shared';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';
import { CoreSecurityPolicy } from '../../../core/permissions/permission.guard';
import { CreateAccountPayableDto, SettleAccountPayableDto } from '../dto/account-payable.dto';
import { AccountPayableEntity } from '../entities/account-payable.entity';
import { FinancialApprovalPolicy } from '../policies/financial-approval.policy';
import { FinancialPayableValidator } from '../validators/financial-payable.validator';

export interface CreateAccountReceivableDto {
  categoryId: string;
  costCenterId?: string;
  customerName: string;
  customerTaxId: string;
  documentNumber: string;
  description: string;
  originModule?: ErpModuleCode;
  originReferenceId?: string;
  issueDate: string;
  dueDate: string;
  competenceDate: string;
  grossAmount: number;
  acquirerFeeAmount?: number;
  discountAmount?: number;
  idempotencyKey: string;
}

/**
 * Módulo 02: Financeiro e Tesouraria — FinancialService Completo
 * - Contas a Pagar e Receber
 * - Gestão de Contas Bancárias e Saldos
 * - Baixa/Liquidação Atômica com Geração Automática de Partidas Dobradas (Módulo 03 Contabilidade)
 * - Conciliação Bancária Automática e Manual
 * - Fluxo de Caixa Realizado e Projetado
 */
export class FinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async createPayable(context: TenantExecutionContext, dto: CreateAccountPayableDto) {
    CoreSecurityPolicy.assertPermissionAndScope(context, 'financial:payable:create', dto.costCenterId);
    FinancialPayableValidator.validateCreateDto(dto);

    const discount = dto.discountAmount ?? 0;
    const interest = dto.interestAmount ?? 0;
    const taxRetained = dto.taxRetainedAmount ?? 0;

    const domainEntity = new AccountPayableEntity({
      id: 'new',
      tenantId: context.tenantId,
      companyId: context.companyId,
      categoryId: dto.categoryId,
      costCenterId: dto.costCenterId,
      supplierName: dto.supplierName,
      supplierTaxId: dto.supplierTaxId,
      documentNumber: dto.documentNumber,
      description: dto.description,
      grossAmount: dto.grossAmount,
      discountAmount: discount,
      interestAmount: interest,
      taxRetainedAmount: taxRetained,
      paidAmount: 0,
      status: 'PENDING_APPROVAL',
    });

    return this.prisma.executeInTenantTransaction(context.tenantId, context.companyId, async (tx) => {
      const created = await tx.accountPayable.create({
        data: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          branchId: context.branchId,
          categoryId: dto.categoryId,
          costCenterId: dto.costCenterId,
          supplierName: dto.supplierName,
          supplierTaxId: dto.supplierTaxId,
          documentNumber: dto.documentNumber,
          description: dto.description,
          originModule: (dto.originModule ?? ErpModuleCode.FINANCIAL) as any,
          originReferenceId: dto.originReferenceId,
          issueDate: new Date(dto.issueDate),
          dueDate: new Date(dto.dueDate),
          competenceDate: new Date(dto.competenceDate),
          grossAmount: dto.grossAmount,
          discountAmount: discount,
          interestAmount: interest,
          taxRetainedAmount: taxRetained,
          netAmount: domainEntity.netAmount,
          paidAmount: 0,
          status: 'PENDING_APPROVAL',
          idempotencyKey: dto.idempotencyKey,
          createdById: context.userId,
        },
      });

      await tx.workflowInstance.create({
        data: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          moduleCode: 'FINANCIAL',
          entityType: 'ACCOUNT_PAYABLE',
          entityId: created.id,
          referenceAmount: domainEntity.netAmount,
          status: 'PENDING',
          requestedById: context.userId,
        },
      });

      await this.auditService.record(
        {
          context,
          moduleCode: ErpModuleCode.FINANCIAL,
          entityName: 'AccountPayable',
          entityId: created.id,
          action: 'CREATE',
          previousValues: null,
          newValues: {
            documentNumber: created.documentNumber,
            netAmount: Number(created.netAmount),
            status: created.status,
          },
        },
        tx
      );

      return created;
    });
  }

  async createReceivable(context: TenantExecutionContext, dto: CreateAccountReceivableDto) {
    const acquirerFee = dto.acquirerFeeAmount ?? 0;
    const discount = dto.discountAmount ?? 0;
    const netAmount = roundCurrency(dto.grossAmount - acquirerFee - discount);

    return this.prisma.executeInTenantTransaction(context.tenantId, context.companyId, async (tx) => {
      const created = await tx.accountReceivable.create({
        data: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          branchId: context.branchId,
          categoryId: dto.categoryId,
          costCenterId: dto.costCenterId,
          customerName: dto.customerName,
          customerTaxId: dto.customerTaxId,
          documentNumber: dto.documentNumber,
          description: dto.description,
          originModule: (dto.originModule ?? ErpModuleCode.FINANCIAL) as any,
          originReferenceId: dto.originReferenceId,
          issueDate: new Date(dto.issueDate),
          dueDate: new Date(dto.dueDate),
          competenceDate: new Date(dto.competenceDate),
          grossAmount: dto.grossAmount,
          acquirerFeeAmount: acquirerFee,
          discountAmount: discount,
          netAmount,
          receivedAmount: 0,
          status: 'APPROVED',
          idempotencyKey: dto.idempotencyKey,
          createdById: context.userId,
        },
      });

      await this.auditService.record(
        {
          context,
          moduleCode: ErpModuleCode.FINANCIAL,
          entityName: 'AccountReceivable',
          entityId: created.id,
          action: 'CREATE',
          previousValues: null,
          newValues: {
            documentNumber: created.documentNumber,
            grossAmount: dto.grossAmount,
            netAmount,
          },
        },
        tx
      );

      return created;
    });
  }

  async approvePayable(context: TenantExecutionContext, payableId: string) {
    return this.prisma.executeInTenantTransaction(context.tenantId, context.companyId, async (tx) => {
      const payable = await tx.accountPayable.findFirst({
        where: { id: payableId, tenantId: context.tenantId, companyId: context.companyId },
      });

      if (!payable) {
        throw new Error('PAYABLE_NOT_FOUND_OR_CROSS_COMPANY: Título não encontrado na empresa ativa.');
      }

      const netAmount = Number(payable.netAmount);
      FinancialApprovalPolicy.assertCanApprovePayable(context, netAmount, payable.costCenterId);

      const updated = await tx.accountPayable.update({
        where: { id: payable.id },
        data: {
          status: 'APPROVED',
          approvedById: context.userId,
          approvedAt: new Date(),
        },
      });

      // Atualiza também eventual workflow pendente vinculado
      await tx.workflowInstance.updateMany({
        where: {
          entityType: 'ACCOUNT_PAYABLE',
          entityId: payable.id,
          status: 'PENDING',
        },
        data: {
          status: 'APPROVED',
          decidedById: context.userId,
          decisionNotes: 'Aprovado diretamente na alçada financeira',
          decidedAt: new Date(),
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          aggregateType: 'AccountPayable',
          aggregateId: payable.id,
          eventType: 'financial.payable.approved',
          payload: {
            payableId: payable.id,
            netAmount,
            approvedById: context.userId,
          },
        },
      });

      return updated;
    });
  }

  async settlePayable(context: TenantExecutionContext, dto: SettleAccountPayableDto) {
    CoreSecurityPolicy.assertPermissionAndScope(context, 'financial:settlement:execute');

    return this.prisma.executeInTenantTransaction(context.tenantId, context.companyId, async (tx) => {
      const payable = await tx.accountPayable.findFirst({
        where: { id: dto.payableId, tenantId: context.tenantId, companyId: context.companyId },
      });

      if (!payable) {
        throw new Error('PAYABLE_NOT_FOUND: Título a pagar não encontrado na empresa ativa.');
      }

      const entity = new AccountPayableEntity({
        id: payable.id,
        tenantId: payable.tenantId,
        companyId: payable.companyId,
        categoryId: payable.categoryId,
        costCenterId: payable.costCenterId,
        supplierName: payable.supplierName,
        supplierTaxId: payable.supplierTaxId,
        documentNumber: payable.documentNumber,
        description: payable.description,
        grossAmount: Number(payable.grossAmount),
        discountAmount: Number(payable.discountAmount),
        interestAmount: Number(payable.interestAmount),
        taxRetainedAmount: Number(payable.taxRetainedAmount),
        paidAmount: Number(payable.paidAmount),
        status: payable.status as any,
      });

      if (!entity.canBeSettled(dto.amount)) {
        throw new Error(
          `INVALID_SETTLEMENT_STATE: Título com status "${payable.status}" (exige APPROVED) ou valor superior ao saldo em aberto (R$ ${entity.remainingBalance.toFixed(
            2
          )}).`
        );
      }

      const newPaidAmount = roundCurrency(Number(payable.paidAmount) + dto.amount);
      const newStatus = newPaidAmount >= entity.netAmount ? 'PAID' : 'PARTIALLY_PAID';

      const transaction = await tx.financialTransaction.create({
        data: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          bankAccountId: dto.bankAccountId,
          payableId: payable.id,
          type: 'DEBIT',
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          externalBankRef: dto.externalBankRef || `PIX_E2E_${Date.now()}`,
          reconciliationStatus: 'MATCHED_AUTOMATIC',
          reconciledAt: new Date(),
          notes: dto.notes || `Liquidação ref. ${payable.documentNumber}`,
          idempotencyKey: dto.idempotencyKey,
          createdById: context.userId,
        },
      });

      await tx.bankAccount.update({
        where: { id: dto.bankAccountId },
        data: {
          currentBalance: {
            decrement: dto.amount,
          },
        },
      });

      const updatedPayable = await tx.accountPayable.update({
        where: { id: payable.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });

      // INTEGRAÇÃO AUTOMÁTICA FINANCEIRO -> CONTABILIDADE (Partidas Dobradas)
      const [bankChartAcc, expenseOrLiabilityAcc, lastEntry] = await Promise.all([
        tx.chartOfAccount.findFirst({
          where: { companyId: context.companyId, nature: 'ASSET', isAnalytical: true },
        }),
        tx.chartOfAccount.findFirst({
          where: {
            companyId: context.companyId,
            nature: { in: ['EXPENSE', 'LIABILITY'] },
            isAnalytical: true,
          },
          orderBy: { code: 'desc' },
        }),
        tx.journalEntry.findFirst({
          where: { companyId: context.companyId },
          orderBy: { entryNumber: 'desc' },
        }),
      ]);

      let journalEntry = null;
      if (bankChartAcc && expenseOrLiabilityAcc) {
        journalEntry = await tx.journalEntry.create({
          data: {
            tenantId: context.tenantId,
            companyId: context.companyId,
            entryNumber: (lastEntry?.entryNumber ?? 0) + 1,
            competenceDate: payable.competenceDate,
            description: `Baixa Financeira ${payable.documentNumber} — ${payable.supplierName}`,
            originModule: 'FINANCIAL',
            originReferenceId: transaction.id,
            totalDebit: dto.amount,
            totalCredit: dto.amount,
            status: 'POSTED',
            idempotencyKey: `je_settle_${dto.idempotencyKey}`,
            createdById: context.userId,
            lines: {
              create: [
                {
                  chartOfAccountId: expenseOrLiabilityAcc.id,
                  costCenterId: payable.costCenterId,
                  debitAmount: dto.amount,
                  creditAmount: 0,
                  memo: `Débito liquidação ${payable.documentNumber}`,
                },
                {
                  chartOfAccountId: bankChartAcc.id,
                  costCenterId: payable.costCenterId,
                  debitAmount: 0,
                  creditAmount: dto.amount,
                  memo: `Saída bancária (${dto.paymentMethod}) ref. ${payable.documentNumber}`,
                },
              ],
            },
          },
        });
      }

      await tx.outboxEvent.create({
        data: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          aggregateType: 'AccountPayable',
          aggregateId: payable.id,
          eventType: 'financial.payable.settled',
          payload: {
            payableId: payable.id,
            transactionId: transaction.id,
            journalEntryId: journalEntry?.id || null,
            bankAccountId: dto.bankAccountId,
            settledAmount: dto.amount,
            newStatus,
          },
        },
      });

      await this.auditService.record(
        {
          context,
          moduleCode: ErpModuleCode.FINANCIAL,
          entityName: 'AccountPayable',
          entityId: payable.id,
          action: 'SETTLE',
          previousValues: { status: payable.status, paidAmount: Number(payable.paidAmount) },
          newValues: {
            status: newStatus,
            paidAmount: newPaidAmount,
            transactionId: transaction.id,
            journalEntryNumber: journalEntry?.entryNumber,
          },
        },
        tx
      );

      return { payable: updatedPayable, transaction, journalEntry };
    });
  }

  /**
   * Calcula o Fluxo de Caixa Realizado e Projetado da empresa ativa
   */
  async getCashFlowSummary(tenantId: string, companyId: string) {
    const [bankAccounts, payables, receivables, transactions] = await Promise.all([
      this.prisma.bankAccount.findMany({ where: { tenantId, companyId, isActive: true } }),
      this.prisma.accountPayable.findMany({ where: { tenantId, companyId } }),
      this.prisma.accountReceivable.findMany({ where: { tenantId, companyId } }),
      this.prisma.financialTransaction.findMany({
        where: { tenantId, companyId },
        include: { bankAccount: true },
        orderBy: { occurredAt: 'desc' },
        take: 20,
      }),
    ]);

    const currentBankBalance = roundCurrency(
      bankAccounts.reduce((acc, b) => acc + Number(b.currentBalance), 0)
    );

    const openPayablesTotal = roundCurrency(
      payables
        .filter((p) => p.status === 'PENDING_APPROVAL' || p.status === 'APPROVED' || p.status === 'PARTIALLY_PAID')
        .reduce((acc, p) => acc + (Number(p.netAmount) - Number(p.paidAmount)), 0)
    );

    const openReceivablesTotal = roundCurrency(
      receivables
        .filter((r) => r.status === 'APPROVED' || r.status === 'PARTIALLY_PAID')
        .reduce((acc, r) => acc + (Number(r.netAmount) - Number(r.receivedAmount)), 0)
    );

    const projectedBalance = roundCurrency(
      currentBankBalance + openReceivablesTotal - openPayablesTotal
    );

    return {
      currentBankBalance,
      openReceivablesTotal,
      openPayablesTotal,
      projectedBalance,
      bankAccounts: bankAccounts.map((b) => ({
        ...b,
        initialBalance: Number(b.initialBalance),
        currentBalance: Number(b.currentBalance),
      })),
      recentTransactions: transactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
      })),
    };
  }
}
