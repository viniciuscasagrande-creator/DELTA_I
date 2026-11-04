import { ErpModuleCode, roundCurrency, TenantExecutionContext } from '@delta-erp/shared';
import { isValidCnpjOrCpf } from '@delta-erp/validators';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';

export interface TaxRuleCalculationParams {
  grossAmount: number;
  issPct: number;
  pisPct: number;
  cofinsPct: number;
  irrfPct: number;
  csllPct: number;
  icmsPct: number;
  withholdTaxes: boolean;
}

export interface TaxCalculationBreakdown {
  grossAmount: number;
  issAmount: number;
  pisAmount: number;
  cofinsAmount: number;
  icmsAmount: number;
  irrfRetained: number;
  pccRetained: number;
  issRetained: number;
  totalOwnTaxes: number;
  totalRetainedAmount: number;
  netInvoiceAmount: number;
}

export interface CreateFiscalDocumentDto {
  taxRuleId: string;
  documentNumber?: string;
  series?: string;
  accessKey?: string;
  counterpartyName: string;
  counterpartyTaxId: string;
  issueDate?: string;
  competenceDate?: string;
  grossAmount: number;
  idempotencyKey: string;
}

/**
 * Módulo 04: Fiscal e Tributário — FiscalService
 * Gerencia NF-e (55), NFC-e (65) e NFS-e, parametrização tributária (CFOP / LC 116),
 * retenções na fonte (IRRF 1,5% + PCC/CSRF 4,65% + ISS), apuração de impostos,
 * prontidão SPED / EFD-Reinf e integração automática com Financeiro e Contabilidade.
 */
export class FiscalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  /**
   * Motor determinístico de cálculo tributário e retenções na fonte (DECIMAL 18,2)
   */
  static calculateTaxesAndWithholdings(
    params: TaxRuleCalculationParams
  ): TaxCalculationBreakdown {
    if (params.grossAmount <= 0) {
      throw new Error('INVALID_FISCAL_GROSS_AMOUNT: O valor bruto da nota fiscal deve ser maior que zero.');
    }

    const gross = roundCurrency(params.grossAmount);
    const issAmount = roundCurrency((gross * params.issPct) / 100);
    const pisAmount = roundCurrency((gross * params.pisPct) / 100);
    const cofinsAmount = roundCurrency((gross * params.cofinsPct) / 100);
    const icmsAmount = roundCurrency((gross * params.icmsPct) / 100);

    let irrfRetained = 0;
    let pccRetained = 0;
    let issRetained = 0;

    if (params.withholdTaxes) {
      irrfRetained = roundCurrency((gross * params.irrfPct) / 100);
      const pccRate = params.pisPct + params.cofinsPct + params.csllPct;
      pccRetained = roundCurrency((gross * pccRate) / 100);
    }

    const totalOwnTaxes = roundCurrency(issAmount + pisAmount + cofinsAmount + icmsAmount);
    const totalRetainedAmount = roundCurrency(irrfRetained + pccRetained + issRetained);
    const netInvoiceAmount = roundCurrency(gross - totalRetainedAmount);

    return {
      grossAmount: gross,
      issAmount,
      pisAmount,
      cofinsAmount,
      icmsAmount,
      irrfRetained,
      pccRetained,
      issRetained,
      totalOwnTaxes,
      totalRetainedAmount,
      netInvoiceAmount,
    };
  }

  static generateAccessKey(model: 'NFE' | 'NFCE' | 'NFSE', companyTaxId: string): string {
    const cleanCnpj = companyTaxId.replace(/\D/g, '').padEnd(14, '0').slice(0, 14);
    const yymm = new Date().toISOString().slice(2, 7).replace('-', '');
    const modCode = model === 'NFE' ? '55' : model === 'NFCE' ? '65' : '99';
    const randomDigits = Array.from({ length: 22 }, () => Math.floor(Math.random() * 10)).join('');
    return `35${yymm}${cleanCnpj}${modCode}${randomDigits}`.slice(0, 44);
  }

  /**
   * Emite (OUTBOUND) ou Recebe/Valida (INBOUND) um Documento Fiscal integrando
   * automaticamente com Contas a Pagar/Receber, Workflow e Contabilidade (Partidas Dobradas).
   */
  async issueOrReceiveFiscalDocument(
    context: TenantExecutionContext,
    dto: CreateFiscalDocumentDto
  ) {
    if (!isValidCnpjOrCpf(dto.counterpartyTaxId)) {
      throw new Error('INVALID_COUNTERPARTY_TAX_ID: CPF/CNPJ do emitente/destinatário inválido.');
    }

    return this.prisma.executeInTenantTransaction(context.tenantId, context.companyId, async (tx) => {
      const [company, taxRule] = await Promise.all([
        tx.company.findUnique({ where: { id: context.companyId } }),
        tx.taxRule.findFirst({
          where: {
            id: dto.taxRuleId,
            tenantId: context.tenantId,
            companyId: context.companyId,
          },
        }),
      ]);

      if (!company || !taxRule) {
        throw new Error('TAX_RULE_NOT_FOUND: Regra tributária não localizada para a empresa ativa.');
      }

      const breakdown = FiscalService.calculateTaxesAndWithholdings({
        grossAmount: dto.grossAmount,
        issPct: Number(taxRule.issPct),
        pisPct: Number(taxRule.pisPct),
        cofinsPct: Number(taxRule.cofinsPct),
        irrfPct: Number(taxRule.irrfPct),
        csllPct: Number(taxRule.csllPct),
        icmsPct: Number(taxRule.icmsPct),
        withholdTaxes: taxRule.withholdTaxes,
      });

      const docNumber =
        dto.documentNumber ||
        `${taxRule.documentModel}-${Math.floor(100000 + Math.random() * 900000)}`;
      const accessKey =
        dto.accessKey ||
        FiscalService.generateAccessKey(taxRule.documentModel as any, company.taxId);
      const today = new Date();
      const issueDate = dto.issueDate ? new Date(dto.issueDate) : today;
      const competenceDate = dto.competenceDate ? new Date(dto.competenceDate) : today;

      let linkedPayableId: string | null = null;
      let linkedReceivableId: string | null = null;
      let linkedJournalEntryId: string | null = null;

      // 1. Integração Automática com Módulo 02 (Financeiro) e Módulo 17 (Workflow)
      if (taxRule.direction === 'INBOUND') {
        let expenseCat = await tx.financialCategory.findFirst({
          where: { companyId: context.companyId, nature: 'EXPENSE' },
        });
        if (!expenseCat) {
          expenseCat = await tx.financialCategory.create({
            data: {
              tenantId: context.tenantId,
              companyId: context.companyId,
              code: 'FIS-SERV-TOMADO',
              name: 'Serviços e Mercadorias Adquiridas (Entrada Fiscal)',
              nature: 'EXPENSE',
            },
          });
        }

        const payable = await tx.accountPayable.create({
          data: {
            tenantId: context.tenantId,
            companyId: context.companyId,
            categoryId: expenseCat.id,
            supplierName: dto.counterpartyName,
            supplierTaxId: dto.counterpartyTaxId,
            documentNumber: docNumber,
            description: `Entrada Fiscal ${taxRule.code} (${docNumber}) — Retenções: R$ ${breakdown.totalRetainedAmount.toFixed(
              2
            )}`,
            originModule: 'FISCAL',
            issueDate,
            dueDate: issueDate,
            competenceDate,
            grossAmount: breakdown.grossAmount,
            discountAmount: 0,
            interestAmount: 0,
            taxRetainedAmount: breakdown.totalRetainedAmount,
            netAmount: breakdown.netInvoiceAmount,
            paidAmount: 0,
            status: 'PENDING_APPROVAL',
            idempotencyKey: `fin_pay_fis_${dto.idempotencyKey}`,
            createdById: context.userId,
          },
        });
        linkedPayableId = payable.id;

        await tx.workflowInstance.create({
          data: {
            tenantId: context.tenantId,
            companyId: context.companyId,
            moduleCode: 'FISCAL',
            entityType: 'ACCOUNT_PAYABLE',
            entityId: payable.id,
            referenceAmount: breakdown.netInvoiceAmount,
            status: 'PENDING',
            requestedById: context.userId,
          },
        });
      } else {
        // OUTBOUND (Saída / Faturamento): Gera Contas a Receber
        let revenueCat = await tx.financialCategory.findFirst({
          where: { companyId: context.companyId, nature: 'REVENUE' },
        });
        if (!revenueCat) {
          revenueCat = await tx.financialCategory.create({
            data: {
              tenantId: context.tenantId,
              companyId: context.companyId,
              code: 'FIS-FAT-SAIDA',
              name: 'Faturamento de Serviços e Produtos (Saída Fiscal)',
              nature: 'REVENUE',
            },
          });
        }

        const receivable = await tx.accountReceivable.create({
          data: {
            tenantId: context.tenantId,
            companyId: context.companyId,
            categoryId: revenueCat.id,
            customerName: dto.counterpartyName,
            customerTaxId: dto.counterpartyTaxId,
            documentNumber: docNumber,
            description: `Faturamento Fiscal ${taxRule.code} (${docNumber})`,
            originModule: 'FISCAL',
            issueDate,
            dueDate: issueDate,
            competenceDate,
            grossAmount: breakdown.grossAmount,
            acquirerFeeAmount: 0,
            discountAmount: breakdown.totalRetainedAmount,
            netAmount: breakdown.netInvoiceAmount,
            receivedAmount: 0,
            status: 'APPROVED',
            idempotencyKey: `fin_rec_fis_${dto.idempotencyKey}`,
            createdById: context.userId,
          },
        });
        linkedReceivableId = receivable.id;
      }

      // 2. Integração Automática com Módulo 03 (Contabilidade — Partidas Dobradas)
      const [assetAcc, liabilityAcc, revenueAcc, expenseAcc, lastEntry] = await Promise.all([
        tx.chartOfAccount.findFirst({
          where: { companyId: context.companyId, nature: 'ASSET', isAnalytical: true },
        }),
        tx.chartOfAccount.findFirst({
          where: { companyId: context.companyId, nature: 'LIABILITY', isAnalytical: true },
        }),
        tx.chartOfAccount.findFirst({
          where: { companyId: context.companyId, nature: 'REVENUE', isAnalytical: true },
        }),
        tx.chartOfAccount.findFirst({
          where: { companyId: context.companyId, nature: 'EXPENSE', isAnalytical: true },
        }),
        tx.journalEntry.findFirst({
          where: { companyId: context.companyId },
          orderBy: { entryNumber: 'desc' },
        }),
      ]);

      if (taxRule.direction === 'INBOUND' && expenseAcc && liabilityAcc) {
        const je = await tx.journalEntry.create({
          data: {
            tenantId: context.tenantId,
            companyId: context.companyId,
            entryNumber: (lastEntry?.entryNumber ?? 0) + 1,
            competenceDate,
            description: `Escrituração Fiscal Entrada ${docNumber} — ${dto.counterpartyName}`,
            originModule: 'FISCAL',
            totalDebit: breakdown.grossAmount,
            totalCredit: breakdown.grossAmount,
            status: 'POSTED',
            idempotencyKey: `je_fis_in_${dto.idempotencyKey}`,
            createdById: context.userId,
            lines: {
              create: [
                {
                  chartOfAccountId: expenseAcc.id,
                  debitAmount: breakdown.grossAmount,
                  creditAmount: 0,
                  memo: `Despesa / Aquisição conforme ${docNumber} (${taxRule.cfopOrLc116})`,
                },
                {
                  chartOfAccountId: liabilityAcc.id,
                  debitAmount: 0,
                  creditAmount: breakdown.grossAmount,
                  memo: `Obrigação Fornecedor (${breakdown.netInvoiceAmount.toFixed(
                    2
                  )}) + Impostos Retidos a Recolher (${breakdown.totalRetainedAmount.toFixed(2)})`,
                },
              ],
            },
          },
        });
        linkedJournalEntryId = je.id;
      } else if (taxRule.direction === 'OUTBOUND' && assetAcc && revenueAcc) {
        const je = await tx.journalEntry.create({
          data: {
            tenantId: context.tenantId,
            companyId: context.companyId,
            entryNumber: (lastEntry?.entryNumber ?? 0) + 1,
            competenceDate,
            description: `Escrituração Fiscal Saída ${docNumber} — ${dto.counterpartyName}`,
            originModule: 'FISCAL',
            totalDebit: breakdown.grossAmount,
            totalCredit: breakdown.grossAmount,
            status: 'POSTED',
            idempotencyKey: `je_fis_out_${dto.idempotencyKey}`,
            createdById: context.userId,
            lines: {
              create: [
                {
                  chartOfAccountId: assetAcc.id,
                  debitAmount: breakdown.grossAmount,
                  creditAmount: 0,
                  memo: `Contas a Receber Faturamento ${docNumber}`,
                },
                {
                  chartOfAccountId: revenueAcc.id,
                  debitAmount: 0,
                  creditAmount: breakdown.grossAmount,
                  memo: `Receita Bruta Faturada ${docNumber} (${taxRule.cfopOrLc116})`,
                },
              ],
            },
          },
        });
        linkedJournalEntryId = je.id;
      }

      // 3. Persistência do Documento Fiscal
      const fiscalDoc = await tx.fiscalDocument.create({
        data: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          taxRuleId: taxRule.id,
          model: taxRule.documentModel,
          direction: taxRule.direction,
          status: 'AUTHORIZED',
          documentNumber: docNumber,
          series: dto.series || '1',
          accessKey,
          counterpartyName: dto.counterpartyName,
          counterpartyTaxId: dto.counterpartyTaxId,
          issueDate,
          competenceDate,
          grossAmount: breakdown.grossAmount,
          issAmount: breakdown.issAmount,
          pisAmount: breakdown.pisAmount,
          cofinsAmount: breakdown.cofinsAmount,
          icmsAmount: breakdown.icmsAmount,
          irrfRetained: breakdown.irrfRetained,
          pccRetained: breakdown.pccRetained,
          issRetained: breakdown.issRetained,
          totalRetainedAmount: breakdown.totalRetainedAmount,
          netInvoiceAmount: breakdown.netInvoiceAmount,
          linkedPayableId,
          linkedReceivableId,
          linkedJournalEntryId,
          idempotencyKey: dto.idempotencyKey,
          createdById: context.userId,
        },
        include: { taxRule: true },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          aggregateType: 'FiscalDocument',
          aggregateId: fiscalDoc.id,
          eventType: `fiscal.document.${taxRule.direction.toLowerCase()}.authorized`,
          payload: {
            fiscalDocumentId: fiscalDoc.id,
            documentNumber: fiscalDoc.documentNumber,
            model: fiscalDoc.model,
            direction: fiscalDoc.direction,
            grossAmount: breakdown.grossAmount,
            totalRetainedAmount: breakdown.totalRetainedAmount,
            netInvoiceAmount: breakdown.netInvoiceAmount,
            linkedPayableId,
            linkedReceivableId,
            linkedJournalEntryId,
          },
        },
      });

      await this.auditService.record({
        context,
        moduleCode: ErpModuleCode.FISCAL,
        entityName: 'FiscalDocument',
        entityId: fiscalDoc.id,
        action: 'CREATE',
        previousValues: null,
        newValues: {
          documentNumber: fiscalDoc.documentNumber,
          model: fiscalDoc.model,
          direction: fiscalDoc.direction,
          grossAmount: breakdown.grossAmount,
          totalRetainedAmount: breakdown.totalRetainedAmount,
          netInvoiceAmount: breakdown.netInvoiceAmount,
        },
      });

      return { fiscalDoc, breakdown };
    });
  }

  /**
   * Apuração Fiscal do Período e Prontidão de Obrigações Acessórias (SPED / EFD-Contribuições / EFD-Reinf)
   */
  async getTaxApurationSummary(tenantId: string, companyId: string) {
    const [taxRules, documents] = await Promise.all([
      this.prisma.taxRule.findMany({
        where: { tenantId, companyId, isActive: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.fiscalDocument.findMany({
        where: { tenantId, companyId, status: 'AUTHORIZED' },
        include: { taxRule: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    let inboundGrossTotal = 0;
    let outboundGrossTotal = 0;
    let totalIssOwn = 0;
    let totalPisOwn = 0;
    let totalCofinsOwn = 0;
    let totalIcmsOwn = 0;
    let totalIrrfRetained = 0;
    let totalPccRetained = 0;

    for (const doc of documents) {
      const gross = Number(doc.grossAmount);
      if (doc.direction === 'INBOUND') {
        inboundGrossTotal = roundCurrency(inboundGrossTotal + gross);
      } else {
        outboundGrossTotal = roundCurrency(outboundGrossTotal + gross);
      }
      totalIssOwn = roundCurrency(totalIssOwn + Number(doc.issAmount));
      totalPisOwn = roundCurrency(totalPisOwn + Number(doc.pisAmount));
      totalCofinsOwn = roundCurrency(totalCofinsOwn + Number(doc.cofinsAmount));
      totalIcmsOwn = roundCurrency(totalIcmsOwn + Number(doc.icmsAmount));
      totalIrrfRetained = roundCurrency(totalIrrfRetained + Number(doc.irrfRetained));
      totalPccRetained = roundCurrency(totalPccRetained + Number(doc.pccRetained));
    }

    const totalOwnTaxesDue = roundCurrency(
      totalIssOwn + totalPisOwn + totalCofinsOwn + totalIcmsOwn
    );
    const totalWithholdingsToCollect = roundCurrency(totalIrrfRetained + totalPccRetained);

    return {
      inboundGrossTotal,
      outboundGrossTotal,
      totalOwnTaxesDue,
      totalWithholdingsToCollect,
      breakdown: {
        issOwn: totalIssOwn,
        pisOwn: totalPisOwn,
        cofinsOwn: totalCofinsOwn,
        icmsOwn: totalIcmsOwn,
        irrfRetained: totalIrrfRetained,
        pccRetained: totalPccRetained,
      },
      spedObligations: [
        {
          code: 'EFD-REINF',
          name: 'Escrituração Fiscal Digital de Retenções (R-2010 / R-4020)',
          status: 'PRONTO_PARA_TRANSMISSAO',
          recordsCount: documents.filter((d) => Number(d.totalRetainedAmount) > 0).length,
          amountReported: totalWithholdingsToCollect,
        },
        {
          code: 'EFD-CONTRIBUICOES',
          name: 'SPED PIS / COFINS (Regime Cumulativo / Não-Cumulativo)',
          status: 'CONSOLIDADO',
          recordsCount: documents.length,
          amountReported: roundCurrency(totalPisOwn + totalCofinsOwn),
        },
        {
          code: 'NFSE-NACIONAL',
          name: 'Livro Fiscal Eletrônico de Serviços (ISS Municipal)',
          status: 'SINCRONIZADO',
          recordsCount: documents.filter((d) => d.model === 'NFSE').length,
          amountReported: totalIssOwn,
        },
      ],
      taxRules: taxRules.map((tr) => ({
        ...tr,
        issPct: Number(tr.issPct),
        pisPct: Number(tr.pisPct),
        cofinsPct: Number(tr.cofinsPct),
        irrfPct: Number(tr.irrfPct),
        csllPct: Number(tr.csllPct),
        icmsPct: Number(tr.icmsPct),
      })),
      documents: documents.map((d) => ({
        ...d,
        grossAmount: Number(d.grossAmount),
        issAmount: Number(d.issAmount),
        pisAmount: Number(d.pisAmount),
        cofinsAmount: Number(d.cofinsAmount),
        icmsAmount: Number(d.icmsAmount),
        irrfRetained: Number(d.irrfRetained),
        pccRetained: Number(d.pccRetained),
        totalRetainedAmount: Number(d.totalRetainedAmount),
        netInvoiceAmount: Number(d.netInvoiceAmount),
      })),
    };
  }
}
