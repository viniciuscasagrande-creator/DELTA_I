import { ErpModuleCode, roundCurrency, TenantExecutionContext } from '@delta-erp/shared';
import { assertBalancedJournalLines } from '@delta-erp/validators';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';
import { CoreSecurityPolicy } from '../../../core/permissions/permission.guard';

export interface CreateJournalEntryLineInput {
  chartOfAccountId: string;
  costCenterId?: string;
  debitAmount: number;
  creditAmount: number;
  memo?: string;
}

export interface CreateJournalEntryDto {
  competenceDate: string;
  description: string;
  originModule?: ErpModuleCode;
  originReferenceId?: string;
  idempotencyKey: string;
  lines: CreateJournalEntryLineInput[];
}

/**
 * Módulo 03: Contabilidade — AccountingService
 * Implementa escrituração por partidas dobradas (soma Débitos == soma Créditos),
 * Livro Diário, Razão, Balancete de Verificação e DRE (Demonstração do Resultado do Exercício).
 */
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async postJournalEntry(context: TenantExecutionContext, dto: CreateJournalEntryDto) {
    CoreSecurityPolicy.assertPermissionAndScope(context, 'accounting:journal:post');
    assertBalancedJournalLines(dto.lines);

    const totalDebit = roundCurrency(dto.lines.reduce((acc, l) => acc + l.debitAmount, 0));
    const totalCredit = roundCurrency(dto.lines.reduce((acc, l) => acc + l.creditAmount, 0));

    return this.prisma.executeInTenantTransaction(context.tenantId, context.companyId, async (tx) => {
      // Verifica se todas as contas informadas pertencem à empresa ativa e são analíticas
      const accountIds = dto.lines.map((l) => l.chartOfAccountId);
      const accounts = await tx.chartOfAccount.findMany({
        where: {
          id: { in: accountIds },
          tenantId: context.tenantId,
          companyId: context.companyId,
        },
      });

      if (accounts.length !== new Set(accountIds).size) {
        throw new Error(
          'INVALID_CHART_OF_ACCOUNT: Uma ou mais contas contábeis não pertencem à empresa ativa.'
        );
      }

      for (const acc of accounts) {
        if (!acc.isAnalytical) {
          throw new Error(
            `SYNTHETIC_ACCOUNT_FORBIDDEN: A conta "${acc.code} - ${acc.name}" é sintética e não pode receber lançamentos diretos.`
          );
        }
      }

      const lastEntry = await tx.journalEntry.findFirst({
        where: { companyId: context.companyId },
        orderBy: { entryNumber: 'desc' },
      });
      const nextEntryNumber = (lastEntry?.entryNumber ?? 0) + 1;

      const entry = await tx.journalEntry.create({
        data: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          entryNumber: nextEntryNumber,
          competenceDate: new Date(dto.competenceDate),
          description: dto.description.trim(),
          originModule: (dto.originModule ?? ErpModuleCode.ACCOUNTING) as any,
          originReferenceId: dto.originReferenceId,
          totalDebit,
          totalCredit,
          status: 'POSTED',
          idempotencyKey: dto.idempotencyKey,
          createdById: context.userId,
          lines: {
            create: dto.lines.map((line) => ({
              chartOfAccountId: line.chartOfAccountId,
              costCenterId: line.costCenterId || null,
              debitAmount: roundCurrency(line.debitAmount),
              creditAmount: roundCurrency(line.creditAmount),
              memo: line.memo || dto.description.trim(),
            })),
          },
        },
        include: {
          lines: {
            include: { chartOfAccount: true, costCenter: true },
          },
        },
      });

      await this.auditService.record({
        context,
        moduleCode: ErpModuleCode.ACCOUNTING,
        entityName: 'JournalEntry',
        entityId: entry.id,
        action: 'CREATE',
        previousValues: null,
        newValues: {
          entryNumber: entry.entryNumber,
          totalDebit,
          totalCredit,
          originModule: entry.originModule,
          linesCount: dto.lines.length,
        },
      });

      return entry;
    });
  }

  /**
   * Apura o Balancete de Verificação e a DRE (Demonstração do Resultado do Exercício)
   * em tempo real para a empresa ativa.
   */
  async getTrialBalanceAndDre(tenantId: string, companyId: string) {
    const [accounts, lines] = await Promise.all([
      this.prisma.chartOfAccount.findMany({
        where: { tenantId, companyId },
        orderBy: { code: 'asc' },
      }),
      this.prisma.journalEntryLine.findMany({
        where: {
          journalEntry: {
            tenantId,
            companyId,
            status: 'POSTED',
          },
        },
        include: {
          chartOfAccount: true,
        },
      }),
    ]);

    const totalsByAccount = new Map<string, { debit: number; credit: number }>();
    for (const acc of accounts) {
      totalsByAccount.set(acc.id, { debit: 0, credit: 0 });
    }

    for (const line of lines) {
      const current = totalsByAccount.get(line.chartOfAccountId) || { debit: 0, credit: 0 };
      current.debit = roundCurrency(current.debit + Number(line.debitAmount));
      current.credit = roundCurrency(current.credit + Number(line.creditAmount));
      totalsByAccount.set(line.chartOfAccountId, current);
    }

    const trialBalance = accounts.map((acc) => {
      const mov = totalsByAccount.get(acc.id) || { debit: 0, credit: 0 };
      // Contas de Ativo e Despesa têm saldo devedor (Débito - Crédito); Passivo, PL e Receita têm saldo credor (Crédito - Débito)
      const isDebitNature = acc.nature === 'ASSET' || acc.nature === 'EXPENSE';
      const netBalance = isDebitNature
        ? roundCurrency(mov.debit - mov.credit)
        : roundCurrency(mov.credit - mov.debit);

      return {
        accountId: acc.id,
        code: acc.code,
        name: acc.name,
        nature: acc.nature,
        totalDebit: mov.debit,
        totalCredit: mov.credit,
        netBalance,
      };
    });

    const totalRevenues = roundCurrency(
      trialBalance
        .filter((r) => r.nature === 'REVENUE')
        .reduce((sum, r) => sum + r.netBalance, 0)
    );

    const totalExpenses = roundCurrency(
      trialBalance
        .filter((r) => r.nature === 'EXPENSE')
        .reduce((sum, r) => sum + r.netBalance, 0)
    );

    const totalAssets = roundCurrency(
      trialBalance.filter((r) => r.nature === 'ASSET').reduce((sum, r) => sum + r.netBalance, 0)
    );

    const totalLiabilities = roundCurrency(
      trialBalance
        .filter((r) => r.nature === 'LIABILITY')
        .reduce((sum, r) => sum + r.netBalance, 0)
    );

    const netIncome = roundCurrency(totalRevenues - totalExpenses);

    return {
      trialBalance,
      dre: {
        grossRevenue: totalRevenues,
        operatingExpenses: totalExpenses,
        netIncome,
        marginPct: totalRevenues > 0 ? roundCurrency((netIncome / totalRevenues) * 100) : 0,
      },
      balanceSheetSummary: {
        totalAssets,
        totalLiabilities,
        retainedEarnings: netIncome,
      },
    };
  }
}
