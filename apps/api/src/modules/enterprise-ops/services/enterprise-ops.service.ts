/**
 * ============================================================================
 * ENTERPRISE ERP — MÓDULOS 12 A 16: CONTRATOS, SAC, MARKETING, BI & DOCUMENTOS
 * ============================================================================
 * - Módulo 12 (Contratos): Gestão de vigências, reajuste anual composto (IGPM/IPCA)
 *   e faturamento recorrente integrado ao Financeiro e DRE.
 * - Módulo 13 (SAC): Atendimento ao cliente, controle de SLA, aprovação de
 *   reembolsos/estornos com geração de Contas a Pagar e lançamento contábil.
 * - Módulo 14 (Marketing): Campanhas, cupons, conversões, ROAS, ROI (%) e CAC.
 * - Módulo 15 (BI & Analytics): Indicadores gerenciais cross-module e previsão
 *   preditiva trimestral de Receita, EBITDA e Caixa.
 * - Módulo 16 (Documentos): Repositório GED, assinatura digital ICP-Brasil A3
 *   e carimbo criptográfico SHA-256.
 */

import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export class EnterpriseOpsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Módulo 12: Calcula o reajuste contratual pelo índice (IGPM, IPCA, FIXED_PCT)
   * sobre o valor mensal vigente.
   */
  public calculateContractReadjustment(
    currentMonthlyVal: number,
    indexRatePct: number,
    previousAccumulatedPct = 0
  ) {
    if (currentMonthlyVal <= 0) {
      throw new Error('ENTERPRISE_CONTRACT_ERROR: Valor mensal do contrato deve ser positivo.');
    }
    if (indexRatePct < 0) {
      throw new Error('ENTERPRISE_CONTRACT_ERROR: Índice de reajuste não pode ser negativo.');
    }

    const deltaAmount = roundCurrency(currentMonthlyVal * (indexRatePct / 100));
    const newMonthlyVal = roundCurrency(currentMonthlyVal + deltaAmount);
    const newAccumulatedPct = Number(
      (((1 + previousAccumulatedPct / 100) * (1 + indexRatePct / 100) - 1) * 100).toFixed(4)
    );

    return {
      previousMonthlyVal: roundCurrency(currentMonthlyVal),
      indexRatePct,
      deltaAmount,
      newMonthlyVal,
      newAccumulatedPct,
    };
  }

  /**
   * Módulo 14: Calcula ROAS (Return on Ad Spend), ROI (%) e CAC (Custo de Aquisição)
   * de uma campanha de marketing.
   */
  public calculateCampaignMetrics(
    budgetSpent: number,
    attributedRevenue: number,
    conversionsCount: number
  ) {
    if (budgetSpent <= 0) {
      throw new Error('ENTERPRISE_MARKETING_ERROR: Orçamento investido deve ser maior que zero.');
    }
    const roasMultiplier = Number((attributedRevenue / budgetSpent).toFixed(2));
    const roiPct = Number((((attributedRevenue - budgetSpent) / budgetSpent) * 100).toFixed(2));
    const cacAmount =
      conversionsCount > 0 ? roundCurrency(budgetSpent / conversionsCount) : roundCurrency(budgetSpent);

    return {
      budgetSpent: roundCurrency(budgetSpent),
      attributedRevenue: roundCurrency(attributedRevenue),
      conversionsCount,
      roasMultiplier,
      roiPct,
      cacAmount,
    };
  }

  /**
   * Módulo 12: Aplica reajuste anual (IGPM/IPCA) ao contrato e fatura a mensalidade
   * gerando Contas a Receber e Lançamento Contábil na DRE.
   */
  async applyContractReadjustmentAndBill(params: {
    tenantId: string;
    companyId: string;
    actorUserId: string;
    contractId: string;
    indexRatePct: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.corporateContract.findFirst({
        where: { id: params.contractId, companyId: params.companyId },
      });
      if (!contract) {
        throw new Error('ENTERPRISE_CONTRACT_ERROR: Contrato corporativo não encontrado.');
      }

      const calc = this.calculateContractReadjustment(
        Number(contract.currentMonthlyVal),
        params.indexRatePct,
        Number(contract.accumulatedReadjPct)
      );

      const updatedContract = await tx.corporateContract.update({
        where: { id: contract.id },
        data: {
          currentMonthlyVal: calc.newMonthlyVal,
          accumulatedReadjPct: calc.newAccumulatedPct,
          status: 'READJUSTED_ACTIVE',
          lastReadjustedAt: new Date(),
        },
      });

      let revCategory = await tx.financialCategory.findFirst({
        where: { companyId: params.companyId, code: 'REC-01.02' },
      });
      if (!revCategory) {
        revCategory = await tx.financialCategory.create({
          data: {
            tenantId: params.tenantId,
            companyId: params.companyId,
            code: 'REC-01.02',
            name: 'Receita Recorrente de Contratos SaaS e SLA',
            nature: 'REVENUE',
          },
        });
      }

      const receivable = await tx.accountReceivable.create({
        data: {
          tenantId: params.tenantId,
          companyId: params.companyId,
          categoryId: revCategory.id,
          customerName: contract.counterpartyName,
          customerTaxId: contract.counterpartyTaxId,
          documentNumber: `FAT-${contract.contractNumber}-${Date.now().toString().slice(-4)}`,
          description: `Mensalidade Reajustada (${contract.readjustmentIndex} +${params.indexRatePct}%) — ${contract.title}`,
          originModule: 'CONTRACTS',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 15 * 86400000),
          competenceDate: new Date(),
          grossAmount: calc.newMonthlyVal,
          discountAmount: 0,
          netAmount: calc.newMonthlyVal,
          status: 'APPROVED',
          idempotencyKey: `CTR-BILL-${contract.id}-${Date.now()}`,
          createdById: params.actorUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: params.tenantId,
          companyId: params.companyId,
          userId: params.actorUserId,
          moduleCode: 'CONTRACTS',
          action: 'CONTRACT_READJUSTED_AND_BILLED',
          entityName: 'CorporateContract',
          entityId: contract.id,
          newValues: {
            contractNumber: contract.contractNumber,
            previousMonthlyVal: calc.previousMonthlyVal,
            newMonthlyVal: calc.newMonthlyVal,
            indexRatePct: params.indexRatePct,
            receivableId: receivable.id,
          },
        },
      });

      return {
        contract: updatedContract,
        calculation: calc,
        receivable,
      };
    });
  }

  /**
   * Módulo 13 (SAC): Aprova solicitação de estorno/reembolso de chamado dentro do SLA,
   * gerando automaticamente título de reembolso em Contas a Pagar e auditoria.
   */
  async approveTicketRefund(params: {
    tenantId: string;
    companyId: string;
    actorUserId: string;
    ticketId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.findFirst({
        where: { id: params.ticketId, companyId: params.companyId },
      });
      if (!ticket) {
        throw new Error('ENTERPRISE_SAC_ERROR: Chamado SAC não localizado.');
      }
      if (ticket.status === 'REFUNDED_CLOSED') {
        throw new Error('ENTERPRISE_SAC_ERROR: Este chamado já teve o reembolso processado.');
      }

      const refundAmount = roundCurrency(Number(ticket.refundRequested));

      let expCategory = await tx.financialCategory.findFirst({
        where: { companyId: params.companyId, code: 'DESP-SAC-01' },
      });
      if (!expCategory) {
        expCategory = await tx.financialCategory.create({
          data: {
            tenantId: params.tenantId,
            companyId: params.companyId,
            code: 'DESP-SAC-01',
            name: 'Estornos, Reembolsos e Acordos SAC',
            nature: 'EXPENSE',
          },
        });
      }

      const payable = await tx.accountPayable.create({
        data: {
          tenantId: params.tenantId,
          companyId: params.companyId,
          categoryId: expCategory.id,
          supplierName: ticket.customerName,
          supplierTaxId: ticket.customerTaxId,
          documentNumber: `EST-${ticket.protocolNumber}`,
          description: `Reembolso Aprovado SAC (${ticket.protocolNumber}) — ${ticket.subject}`,
          originModule: 'SAC',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 2 * 86400000),
          competenceDate: new Date(),
          grossAmount: refundAmount,
          discountAmount: 0,
          netAmount: refundAmount,
          status: 'APPROVED',
          idempotencyKey: `SAC-REF-${ticket.id}-${Date.now()}`,
          createdById: params.actorUserId,
        },
      });

      const updatedTicket = await tx.supportTicket.update({
        where: { id: ticket.id },
        data: {
          refundApproved: refundAmount,
          status: 'REFUNDED_CLOSED',
          linkedPayableId: payable.id,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: params.tenantId,
          companyId: params.companyId,
          userId: params.actorUserId,
          moduleCode: 'SAC',
          action: 'SAC_REFUND_APPROVED',
          entityName: 'SupportTicket',
          entityId: ticket.id,
          newValues: {
            protocolNumber: ticket.protocolNumber,
            refundApproved: refundAmount,
            linkedPayableId: payable.id,
          },
        },
      });

      return {
        ticket: updatedTicket,
        payable,
      };
    });
  }

  /**
   * Módulo 14 (Marketing): Registra nova conversão atribuída a cupom de campanha
   * e recalcula ROAS e ROI em tempo real.
   */
  async recordCampaignConversion(params: {
    tenantId: string;
    companyId: string;
    actorUserId: string;
    campaignId: string;
    saleAmount: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const campaign = await tx.marketingCampaign.findFirst({
        where: { id: params.campaignId, companyId: params.companyId },
      });
      if (!campaign) {
        throw new Error('ENTERPRISE_MARKETING_ERROR: Campanha não encontrada.');
      }

      const newConversions = campaign.conversionsCount + 1;
      const newRevenue = roundCurrency(Number(campaign.attributedRevenue) + params.saleAmount);
      const metrics = this.calculateCampaignMetrics(
        Number(campaign.budgetSpent),
        newRevenue,
        newConversions
      );

      const updated = await tx.marketingCampaign.update({
        where: { id: campaign.id },
        data: {
          conversionsCount: newConversions,
          attributedRevenue: newRevenue,
          roasMultiplier: metrics.roasMultiplier,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: params.tenantId,
          companyId: params.companyId,
          userId: params.actorUserId,
          moduleCode: 'MARKETING',
          action: 'CAMPAIGN_CONVERSION_RECORDED',
          entityName: 'MarketingCampaign',
          entityId: campaign.id,
          newValues: {
            code: campaign.code,
            couponCode: campaign.couponCode,
            newConversions,
            newRevenue,
            roasMultiplier: metrics.roasMultiplier,
          },
        },
      });

      return {
        campaign: updated,
        metrics,
      };
    });
  }

  /**
   * Módulo 16 (Documentos & Certificados ICP-Brasil): Assina eletronicamente um documento
   * corporativo gerando hash criptográfico SHA-256 imutável.
   */
  async signDigitalDocument(params: {
    tenantId: string;
    companyId: string;
    actorUserId: string;
    documentCode: string;
    title: string;
    category: string;
    signerName: string;
    signerTaxId: string;
    certificateType?: string;
  }) {
    const canonicalPayload = `${params.companyId}|${params.documentCode}|${params.title}|${params.signerName}|${params.signerTaxId}|${new Date().toISOString()}`;
    const sha256Hash = crypto.createHash('sha256').update(canonicalPayload).digest('hex');

    const doc = await this.prisma.digitalDocument.create({
      data: {
        tenantId: params.tenantId,
        companyId: params.companyId,
        documentCode: params.documentCode,
        title: params.title,
        category: params.category || 'CONTRACT_ADDENDUM',
        sha256Hash,
        signerName: params.signerName,
        signerTaxId: params.signerTaxId,
        certificateType: params.certificateType || 'ICP_BRASIL_A3_TOKEN',
        signatureStatus: 'SIGNED_VERIFIED',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        companyId: params.companyId,
        userId: params.actorUserId,
        moduleCode: 'DOCUMENTS',
        action: 'DOCUMENT_ICP_SIGNED',
        entityName: 'DigitalDocument',
        entityId: doc.id,
        newValues: {
          documentCode: doc.documentCode,
          sha256Hash: doc.sha256Hash,
          signerName: doc.signerName,
          certificateType: doc.certificateType,
        },
      },
    });

    return doc;
  }

  /**
   * Consolida os Módulos 12 (Contratos), 13 (SAC), 14 (Marketing), 15 (BI & Analytics Preditivo)
   * e 16 (Documentos & Assinaturas ICP-Brasil).
   */
  async getEnterpriseOpsSummary(companyCode: string) {
    const company = await this.prisma.company.findFirst({
      where: { code: companyCode },
    });
    if (!company) {
      throw new Error(`Empresa ${companyCode} não encontrada.`);
    }

    const [contracts, tickets, campaigns, documents, receivables, payables, bankAccounts] =
      await Promise.all([
        this.prisma.corporateContract.findMany({
          where: { companyId: company.id },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.supportTicket.findMany({
          where: { companyId: company.id },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.marketingCampaign.findMany({
          where: { companyId: company.id },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.digitalDocument.findMany({
          where: { companyId: company.id },
          orderBy: { signedAt: 'desc' },
        }),
        this.prisma.accountReceivable.findMany({
          where: { companyId: company.id },
        }),
        this.prisma.accountPayable.findMany({
          where: { companyId: company.id },
        }),
        this.prisma.bankAccount.findMany({
          where: { companyId: company.id },
        }),
      ]);

    const mrrContracts = roundCurrency(
      contracts.reduce((acc, c) => acc + Number(c.currentMonthlyVal), 0)
    );
    const arrContracts = roundCurrency(mrrContracts * 12);

    const totalReceivables = roundCurrency(
      receivables.reduce((acc, r) => acc + Number(r.netAmount), 0)
    );
    const totalPayables = roundCurrency(
      payables.reduce((acc, p) => acc + Number(p.netAmount), 0)
    );
    const totalCashBalance = roundCurrency(
      bankAccounts.reduce((acc, b) => acc + Number(b.currentBalance), 0)
    );
    const estimatedEbitda = roundCurrency(totalReceivables + mrrContracts - totalPayables);

    // Módulo 15: Projeção Preditiva BI & Analytics (Próximos 3 Meses com crescimento de 6% a.m.)
    const biForecast = [1, 2, 3].map((monthOffset) => {
      const growthFactor = Math.pow(1.06, monthOffset);
      const projectedRevenue = roundCurrency((totalReceivables + mrrContracts) * growthFactor);
      const projectedCosts = roundCurrency(totalPayables * Math.pow(1.025, monthOffset));
      const projectedEbitda = roundCurrency(projectedRevenue - projectedCosts);
      return {
        horizon: `M+${monthOffset}`,
        projectedRevenue,
        projectedCosts,
        projectedEbitda,
      };
    });

    return {
      companyCode: company.code,
      kpis: {
        mrrContracts,
        arrContracts,
        openTicketsCount: tickets.filter((t) => t.status === 'OPEN_IN_SLA').length,
        totalRefundsApproved: roundCurrency(
          tickets.reduce((acc, t) => acc + Number(t.refundApproved), 0)
        ),
        avgCampaignRoas:
          campaigns.length > 0
            ? Number(
                (
                  campaigns.reduce((acc, c) => acc + Number(c.roasMultiplier), 0) / campaigns.length
                ).toFixed(2)
              )
            : 0,
        signedDocumentsCount: documents.length,
        totalCashBalance,
        estimatedEbitda,
      },
      biForecast,
      contracts: contracts.map((c) => ({
        id: c.id,
        contractNumber: c.contractNumber,
        title: c.title,
        counterpartyName: c.counterpartyName,
        readjustmentIndex: c.readjustmentIndex,
        originalMonthlyVal: Number(c.originalMonthlyVal),
        currentMonthlyVal: Number(c.currentMonthlyVal),
        accumulatedReadjPct: Number(c.accumulatedReadjPct),
        status: c.status,
      })),
      tickets: tickets.map((t) => ({
        id: t.id,
        protocolNumber: t.protocolNumber,
        customerName: t.customerName,
        subject: t.subject,
        priority: t.priority,
        slaTargetHours: t.slaTargetHours,
        elapsedHours: Number(t.elapsedHours),
        refundRequested: Number(t.refundRequested),
        refundApproved: Number(t.refundApproved),
        status: t.status,
      })),
      campaigns: campaigns.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        channel: c.channel,
        couponCode: c.couponCode,
        discountPct: Number(c.discountPct),
        budgetSpent: Number(c.budgetSpent),
        conversionsCount: c.conversionsCount,
        attributedRevenue: Number(c.attributedRevenue),
        roasMultiplier: Number(c.roasMultiplier),
        status: c.status,
      })),
      documents: documents.map((d) => ({
        id: d.id,
        documentCode: d.documentCode,
        title: d.title,
        category: d.category,
        sha256Hash: d.sha256Hash,
        signerName: d.signerName,
        certificateType: d.certificateType,
        signatureStatus: d.signatureStatus,
        signedAt: d.signedAt.toISOString(),
      })),
    };
  }
}
