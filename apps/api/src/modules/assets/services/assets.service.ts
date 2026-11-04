import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { roundCurrency } from '@delta-erp/shared';

export interface DepreciationQuotaInput {
  acquisitionValue: number;
  residualValue: number;
  usefulLifeMonths: number;
  accumulatedDepreciation: number;
}

export interface DepreciationQuotaResult {
  acquisitionValue: number;
  residualValue: number;
  depreciableBase: number;
  usefulLifeMonths: number;
  annualRatePct: number;
  standardMonthlyQuota: number;
  appliedQuota: number;
  accumulatedAfterRun: number;
  netBookValueAfterRun: number;
  isFullyDepreciated: boolean;
}

export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Motor de Cálculo de Depreciação Linear Mensal (CPC 27 / NBC TG 27 — Ativo Imobilizado):
   * - Base Depreciável = Valor de Aquisição - Valor Residual;
   * - Quota Mensal = Base Depreciável / Vida Útil em Meses;
   * - Respeita o limite do Valor Residual (nunca deprecia abaixo do valor residual).
   */
  static calculateMonthlyDepreciationQuota(input: DepreciationQuotaInput): DepreciationQuotaResult {
    const acquisitionValue = roundCurrency(input.acquisitionValue);
    const residualValue = roundCurrency(input.residualValue || 0);
    const usefulLifeMonths = Math.max(1, Math.round(input.usefulLifeMonths));
    const accumulatedDepreciation = roundCurrency(input.accumulatedDepreciation || 0);

    if (acquisitionValue <= 0) {
      throw new Error('O valor de aquisição do bem imobilizado deve ser maior que zero.');
    }
    if (residualValue < 0 || residualValue >= acquisitionValue) {
      throw new Error('O valor residual deve ser menor que o valor de aquisição.');
    }

    const depreciableBase = roundCurrency(acquisitionValue - residualValue);
    const annualRatePct = roundCurrency((12 / usefulLifeMonths) * 100);
    const standardMonthlyQuota = roundCurrency(depreciableBase / usefulLifeMonths);

    const remainingDepreciable = roundCurrency(
      Math.max(0, depreciableBase - accumulatedDepreciation)
    );
    const appliedQuota = roundCurrency(Math.min(standardMonthlyQuota, remainingDepreciable));
    const accumulatedAfterRun = roundCurrency(accumulatedDepreciation + appliedQuota);
    const netBookValueAfterRun = roundCurrency(acquisitionValue - accumulatedAfterRun);
    const isFullyDepreciated = netBookValueAfterRun <= residualValue;

    return {
      acquisitionValue,
      residualValue,
      depreciableBase,
      usefulLifeMonths,
      annualRatePct,
      standardMonthlyQuota,
      appliedQuota,
      accumulatedAfterRun,
      netBookValueAfterRun,
      isFullyDepreciated,
    };
  }

  /**
   * Registra Tombamento / Plaquetamento de Bem do Ativo Imobilizado.
   */
  async registerFixedAsset(input: {
    companyCode: string;
    assetTag: string;
    name: string;
    category?: string;
    locationName?: string;
    acquisitionValue: number;
    residualValue?: number;
    usefulLifeMonths?: number;
  }) {
    const company = await this.prisma.company.findFirst({
      where: { code: input.companyCode },
    });
    if (!company) {
      throw new Error(`Empresa ${input.companyCode} não localizada.`);
    }

    const calc = AssetsService.calculateMonthlyDepreciationQuota({
      acquisitionValue: input.acquisitionValue,
      residualValue: input.residualValue || 0,
      usefulLifeMonths: input.usefulLifeMonths || 60,
      accumulatedDepreciation: 0,
    });

    const actor = await this.prisma.user.findFirst({
      where: { tenantId: company.tenantId },
      orderBy: { createdAt: 'asc' },
    });

    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.fixedAsset.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          assetTag: input.assetTag.trim().toUpperCase(),
          name: input.name.trim(),
          category: input.category || 'IT_INFRASTRUCTURE',
          locationName: input.locationName || 'Datacenter Matriz SP',
          acquisitionDate: new Date(),
          acquisitionValue: calc.acquisitionValue,
          residualValue: calc.residualValue,
          usefulLifeMonths: calc.usefulLifeMonths,
          annualDepreciationRatePct: calc.annualRatePct,
          accumulatedDepreciation: 0,
          netBookValue: calc.acquisitionValue,
          status: 'IN_USE',
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          userId: actor?.id,
          moduleCode: 'ASSETS',
          action: 'REGISTER_FIXED_ASSET',
          entityName: 'FixedAsset',
          entityId: asset.id,
          newValues: {
            assetTag: asset.assetTag,
            name: asset.name,
            acquisitionValue: calc.acquisitionValue,
            residualValue: calc.residualValue,
            usefulLifeMonths: calc.usefulLifeMonths,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          aggregateType: 'FixedAsset',
          aggregateId: asset.id,
          eventType: 'assets.fixed_asset.registered',
          payload: {
            assetId: asset.id,
            assetTag: asset.assetTag,
            acquisitionValue: calc.acquisitionValue,
            monthlyQuota: calc.standardMonthlyQuota,
          },
          status: 'PUBLISHED',
          processedAt: new Date(),
        },
      });

      return { asset, quotaPreview: calc };
    });
  }

  /**
   * Processa a Depreciação Linear Mensal (CPC 27) de todos os bens ativos na competência
   * e contabiliza automaticamente a Despesa de Depreciação na DRE (Partidas Dobradas).
   */
  async runMonthlyDepreciation(input: {
    companyCode: string;
    competenceMonth: string;
  }) {
    const company = await this.prisma.company.findFirst({
      where: { code: input.companyCode },
    });
    if (!company) {
      throw new Error(`Empresa ${input.companyCode} não localizada.`);
    }

    const existingRuns = await this.prisma.assetDepreciationRun.count({
      where: { companyId: company.id, competenceMonth: input.competenceMonth },
    });
    if (existingRuns > 0) {
      throw new Error(
        `A depreciação patrimonial da competência ${input.competenceMonth} já foi processada e contabilizada para a empresa ${company.code}.`
      );
    }

    const activeAssets = await this.prisma.fixedAsset.findMany({
      where: {
        companyId: company.id,
        status: { in: ['IN_USE', 'IN_MAINTENANCE'] },
      },
      orderBy: { assetTag: 'asc' },
    });

    if (activeAssets.length === 0) {
      throw new Error('Não há bens imobilizados ativos para depreciar nesta empresa.');
    }

    const actor = await this.prisma.user.findFirst({
      where: { tenantId: company.tenantId },
      orderBy: { createdAt: 'asc' },
    });
    if (!actor) {
      throw new Error('Usuário operador não localizado.');
    }

    let depExpenseAccount = await this.prisma.chartOfAccount.findFirst({
      where: { companyId: company.id, nature: 'EXPENSE', isAnalytical: true },
    });
    if (!depExpenseAccount) {
      depExpenseAccount = await this.prisma.chartOfAccount.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          code: '3.1.04.001',
          name: 'Despesa com Depreciação de Bens do Imobilizado (CPC 27)',
          nature: 'EXPENSE',
          isAnalytical: true,
        },
      });
    }

    let accumDepAccount = await this.prisma.chartOfAccount.findFirst({
      where: { companyId: company.id, nature: 'ASSET', isAnalytical: true },
    });
    if (!accumDepAccount) {
      accumDepAccount = await this.prisma.chartOfAccount.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          code: '1.2.03.099',
          name: '(-) Depreciação Acumulada do Ativo Imobilizado',
          nature: 'ASSET',
          isAnalytical: true,
        },
      });
    }

    const assetCalculations = activeAssets
      .map((asset) => ({
        asset,
        calc: AssetsService.calculateMonthlyDepreciationQuota({
          acquisitionValue: Number(asset.acquisitionValue),
          residualValue: Number(asset.residualValue),
          usefulLifeMonths: asset.usefulLifeMonths,
          accumulatedDepreciation: Number(asset.accumulatedDepreciation),
        }),
      }))
      .filter((item) => item.calc.appliedQuota > 0);

    const totalDepreciationExpense = roundCurrency(
      assetCalculations.reduce((acc, item) => acc + item.calc.appliedQuota, 0)
    );

    const today = new Date();

    return this.prisma.$transaction(async (tx) => {
      // 1. Contabiliza a Despesa de Depreciação Mensal no Livro Diário / DRE
      const lastEntry = await tx.journalEntry.findFirst({
        where: { companyId: company.id },
        orderBy: { entryNumber: 'desc' },
      });
      const nextEntryNumber = (lastEntry?.entryNumber ?? 1000) + 1;

      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          entryNumber: nextEntryNumber,
          competenceDate: today,
          postingDate: today,
          originModule: 'ASSETS',
          description: `Depreciação Linear Mensal CPC 27 (${input.competenceMonth}) — ${assetCalculations.length} Bens Imobilizados`,
          status: 'POSTED',
          totalDebit: totalDepreciationExpense,
          totalCredit: totalDepreciationExpense,
          idempotencyKey: `AST-DEP-${company.code}-${input.competenceMonth}`,
          createdById: actor.id,
          lines: {
            create: [
              {
                chartOfAccountId: depExpenseAccount.id,
                memo: `Quota Mensal de Depreciação Imobilizado (${input.competenceMonth})`,
                debitAmount: totalDepreciationExpense,
                creditAmount: 0,
              },
              {
                chartOfAccountId: accumDepAccount.id,
                memo: `Provisão de Depreciação Acumulada (${input.competenceMonth})`,
                debitAmount: 0,
                creditAmount: totalDepreciationExpense,
              },
            ],
          },
        },
      });

      // 2. Registra as Quotas de Depreciação e Atualiza o Valor Contábil Líquido de cada Bem
      const runs = [];
      for (const { asset, calc } of assetCalculations) {
        const run = await tx.assetDepreciationRun.create({
          data: {
            tenantId: company.tenantId,
            companyId: company.id,
            assetId: asset.id,
            competenceMonth: input.competenceMonth,
            depreciationQuotaAmount: calc.appliedQuota,
            accumulatedAfterRun: calc.accumulatedAfterRun,
            netBookValueAfterRun: calc.netBookValueAfterRun,
            linkedJournalEntryId: journalEntry.id,
          },
        });
        runs.push(run);

        await tx.fixedAsset.update({
          where: { id: asset.id },
          data: {
            accumulatedDepreciation: calc.accumulatedAfterRun,
            netBookValue: calc.netBookValueAfterRun,
            status: calc.isFullyDepreciated ? 'FULLY_DEPRECIATED' : asset.status,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          userId: actor.id,
          moduleCode: 'ASSETS',
          action: 'RUN_MONTHLY_DEPRECIATION',
          entityName: 'AssetDepreciationRun',
          entityId: journalEntry.id,
          newValues: {
            competenceMonth: input.competenceMonth,
            assetsDepreciatedCount: runs.length,
            totalDepreciationExpense,
            journalEntryNumber: journalEntry.entryNumber,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          aggregateType: 'AssetDepreciationBatch',
          aggregateId: journalEntry.id,
          eventType: 'assets.depreciation.processed',
          payload: {
            companyCode: company.code,
            competenceMonth: input.competenceMonth,
            assetsCount: runs.length,
            totalDepreciationExpense,
            journalEntryId: journalEntry.id,
          },
          status: 'PUBLISHED',
          processedAt: new Date(),
        },
      });

      return {
        competenceMonth: input.competenceMonth,
        assetsDepreciatedCount: runs.length,
        totalDepreciationExpense,
        journalEntry,
      };
    });
  }

  /**
   * Retorna resumo consolidado do Módulo 09 (Patrimônio & Depreciação CPC 27).
   */
  async getAssetsSummary(companyCode: string) {
    const company = await this.prisma.company.findFirst({
      where: { code: companyCode },
    });
    if (!company) {
      throw new Error(`Empresa ${companyCode} não localizada.`);
    }

    const [assets, runs] = await Promise.all([
      this.prisma.fixedAsset.findMany({
        where: { companyId: company.id },
        orderBy: { assetTag: 'asc' },
      }),
      this.prisma.assetDepreciationRun.findMany({
        where: { companyId: company.id },
        include: { asset: true },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    const totalAcquisitionValue = roundCurrency(
      assets.reduce((acc, a) => acc + Number(a.acquisitionValue), 0)
    );
    const totalAccumulatedDepreciation = roundCurrency(
      assets.reduce((acc, a) => acc + Number(a.accumulatedDepreciation), 0)
    );
    const totalNetBookValue = roundCurrency(
      assets.reduce((acc, a) => acc + Number(a.netBookValue), 0)
    );
    const estimatedMonthlyDepreciation = roundCurrency(
      assets.reduce((acc, a) => {
        const q = AssetsService.calculateMonthlyDepreciationQuota({
          acquisitionValue: Number(a.acquisitionValue),
          residualValue: Number(a.residualValue),
          usefulLifeMonths: a.usefulLifeMonths,
          accumulatedDepreciation: Number(a.accumulatedDepreciation),
        });
        return acc + q.appliedQuota;
      }, 0)
    );

    return {
      kpis: {
        assetsCount: assets.length,
        totalAcquisitionValue,
        totalAccumulatedDepreciation,
        totalNetBookValue,
        estimatedMonthlyDepreciation,
      },
      assets: assets.map((a) => {
        const q = AssetsService.calculateMonthlyDepreciationQuota({
          acquisitionValue: Number(a.acquisitionValue),
          residualValue: Number(a.residualValue),
          usefulLifeMonths: a.usefulLifeMonths,
          accumulatedDepreciation: Number(a.accumulatedDepreciation),
        });
        return {
          id: a.id,
          assetTag: a.assetTag,
          name: a.name,
          category: a.category,
          locationName: a.locationName,
          acquisitionDate: a.acquisitionDate,
          acquisitionValue: Number(a.acquisitionValue),
          residualValue: Number(a.residualValue),
          usefulLifeMonths: a.usefulLifeMonths,
          annualDepreciationRatePct: Number(a.annualDepreciationRatePct),
          monthlyQuota: q.appliedQuota,
          accumulatedDepreciation: Number(a.accumulatedDepreciation),
          netBookValue: Number(a.netBookValue),
          status: a.status,
        };
      }),
      depreciationRuns: runs.map((r) => ({
        id: r.id,
        competenceMonth: r.competenceMonth,
        assetTag: r.asset.assetTag,
        assetName: r.asset.name,
        depreciationQuotaAmount: Number(r.depreciationQuotaAmount),
        accumulatedAfterRun: Number(r.accumulatedAfterRun),
        netBookValueAfterRun: Number(r.netBookValueAfterRun),
      })),
    };
  }
}
