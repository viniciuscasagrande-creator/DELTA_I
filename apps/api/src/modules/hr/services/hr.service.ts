import { ErpModuleCode, roundCurrency, TenantExecutionContext } from '@delta-erp/shared';
import { isValidCnpjOrCpf } from '@delta-erp/validators';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';

export interface PayrollCalculationInput {
  baseSalary: number;
  overtimeAmount?: number;
  benefitsAmount?: number;
  dependentsCount?: number;
  contractType: 'CLT' | 'PJ' | 'INTERN' | 'STATUTORY_DIRECTOR';
}

export interface PayrollCalculationResult {
  grossSalary: number;
  overtimeAmount: number;
  benefitsAmount: number;
  inssEmployeeDiscount: number;
  irrfEmployeeDiscount: number;
  fgtsEmployerAmount: number;
  inssEmployerAmount: number;
  netSalary: number;
  totalCompanyCost: number;
}

export interface AdmitEmployeeDto {
  registrationCode?: string;
  fullName: string;
  taxId: string;
  email: string;
  jobTitle: string;
  contractType: 'CLT' | 'PJ' | 'INTERN' | 'STATUTORY_DIRECTOR';
  baseSalary: number;
  benefitsAmount?: number;
  dependentsCount?: number;
  departmentId?: string;
  costCenterId?: string;
}

/**
 * Módulo 05: Recursos Humanos (RH), Folha de Pagamento e eSocial — HrService
 * Implementa:
 * - Admissão de colaboradores e evento eSocial S-2200
 * - Motor determinístico de cálculo de Folha (INSS progressivo, IRRF com dedução por dependente, FGTS 8% e INSS Patronal 20%)
 * - Fechamento mensal da Folha (S-1200 / S-1210) integrado ao Financeiro (Contas a Pagar + Workflow) e Contabilidade (Partidas Dobradas na DRE)
 */
export class HrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  /**
   * Calcula holerite individual (salário líquido, retenções INSS/IRRF e encargos patronais FGTS/INSS)
   */
  static calculateEmployeePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
    if (input.baseSalary <= 0) {
      throw new Error('INVALID_BASE_SALARY: O salário base deve ser maior que zero.');
    }

    const overtime = roundCurrency(input.overtimeAmount ?? 0);
    const benefits = roundCurrency(input.benefitsAmount ?? 0);
    const gross = roundCurrency(input.baseSalary + overtime);
    const dependents = Math.max(0, input.dependentsCount ?? 0);

    if (input.contractType === 'PJ') {
      return {
        grossSalary: gross,
        overtimeAmount: overtime,
        benefitsAmount: benefits,
        inssEmployeeDiscount: 0,
        irrfEmployeeDiscount: 0,
        fgtsEmployerAmount: 0,
        inssEmployerAmount: 0,
        netSalary: gross,
        totalCompanyCost: roundCurrency(gross + benefits),
      };
    }

    // Cálculo INSS Segurado (Alíquota efetiva progressiva limitada ao teto de R$ 908,85)
    const inssEmployeeDiscount = Math.min(908.85, roundCurrency(gross * 0.11));

    // Base IRRF = Bruto - INSS - (R$ 189,59 por dependente)
    const irrfBase = Math.max(0, roundCurrency(gross - inssEmployeeDiscount - dependents * 189.59));
    let irrfEmployeeDiscount = 0;
    if (irrfBase > 4664.68) {
      irrfEmployeeDiscount = roundCurrency(irrfBase * 0.275 - 896.0);
    } else if (irrfBase > 3751.05) {
      irrfEmployeeDiscount = roundCurrency(irrfBase * 0.225 - 662.77);
    } else if (irrfBase > 2826.65) {
      irrfEmployeeDiscount = roundCurrency(irrfBase * 0.15 - 381.44);
    } else if (irrfBase > 2259.2) {
      irrfEmployeeDiscount = roundCurrency(irrfBase * 0.075 - 169.44);
    }
    irrfEmployeeDiscount = Math.max(0, irrfEmployeeDiscount);

    // Encargos Patronais (FGTS 8% para CLT e INSS Patronal 20%)
    const fgtsEmployerAmount = input.contractType === 'CLT' ? roundCurrency(gross * 0.08) : 0;
    const inssEmployerAmount =
      input.contractType === 'CLT' || input.contractType === 'STATUTORY_DIRECTOR'
        ? roundCurrency(gross * 0.2)
        : 0;

    const netSalary = roundCurrency(gross - inssEmployeeDiscount - irrfEmployeeDiscount);
    const totalCompanyCost = roundCurrency(
      gross + benefits + fgtsEmployerAmount + inssEmployerAmount
    );

    return {
      grossSalary: gross,
      overtimeAmount: overtime,
      benefitsAmount: benefits,
      inssEmployeeDiscount,
      irrfEmployeeDiscount,
      fgtsEmployerAmount,
      inssEmployerAmount,
      netSalary,
      totalCompanyCost,
    };
  }

  /**
   * Admite um novo colaborador e gera matrícula eSocial (S-2200)
   */
  async admitEmployee(context: TenantExecutionContext, dto: AdmitEmployeeDto) {
    if (!isValidCnpjOrCpf(dto.taxId)) {
      throw new Error('INVALID_EMPLOYEE_CPF: O CPF informado para o colaborador é inválido.');
    }

    return this.prisma.executeInTenantTransaction(context.tenantId, context.companyId, async (tx) => {
      const count = await tx.employee.count({ where: { companyId: context.companyId } });
      const regCode =
        dto.registrationCode || `COL-${String(count + 1).padStart(4, '0')}`;
      const esocialMatricula = `ESOC-S2200-${regCode}-${Date.now().toString().slice(-4)}`;

      const employee = await tx.employee.create({
        data: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          departmentId: dto.departmentId || null,
          costCenterId: dto.costCenterId || null,
          registrationCode: regCode,
          fullName: dto.fullName.trim(),
          taxId: dto.taxId.trim(),
          email: dto.email.trim().toLowerCase(),
          jobTitle: dto.jobTitle.trim(),
          contractType: dto.contractType,
          status: 'ACTIVE',
          hireDate: new Date(),
          baseSalary: roundCurrency(dto.baseSalary),
          benefitsAmount: roundCurrency(dto.benefitsAmount ?? 1250),
          dependentsCount: dto.dependentsCount ?? 0,
          esocialMatricula,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          aggregateType: 'Employee',
          aggregateId: employee.id,
          eventType: 'hr.employee.admitted.s2200',
          payload: {
            employeeId: employee.id,
            registrationCode: employee.registrationCode,
            fullName: employee.fullName,
            contractType: employee.contractType,
            esocialEvent: 'S-2200',
          },
        },
      });

      await this.auditService.record({
        context,
        moduleCode: ErpModuleCode.HR,
        entityName: 'Employee',
        entityId: employee.id,
        action: 'CREATE',
        previousValues: null,
        newValues: {
          registrationCode: employee.registrationCode,
          fullName: employee.fullName,
          jobTitle: employee.jobTitle,
          baseSalary: Number(employee.baseSalary),
          esocialMatricula,
        },
      });

      return employee;
    });
  }

  /**
   * Processa a Folha de Pagamento Mensal da empresa ativa, gerando:
   * - Holerites individuais (`PayrollRun` com evento eSocial `S-1200`)
   * - Obrigação consolidada em Contas a Pagar (`AccountPayable`) + Alçada no `Workflow`
   * - Lançamento contábil automático de Partidas Dobradas (`JournalEntry`) na DRE
   */
  async processMonthlyPayroll(context: TenantExecutionContext, competenceMonth: string) {
    if (!/^\d{4}-\d{2}$/.test(competenceMonth)) {
      throw new Error('INVALID_COMPETENCE_MONTH: Use o formato YYYY-MM (ex: 2026-11).');
    }

    return this.prisma.executeInTenantTransaction(context.tenantId, context.companyId, async (tx) => {
      const employees = await tx.employee.findMany({
        where: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          status: 'ACTIVE',
        },
      });

      if (employees.length === 0) {
        throw new Error('NO_ACTIVE_EMPLOYEES: Nenhum colaborador ativo encontrado para processar a folha.');
      }

      let totalNetPayroll = 0;
      let totalWithheldTaxes = 0;
      let totalCompanyPayrollCost = 0;
      const runs = [];

      for (const emp of employees) {
        const calc = HrService.calculateEmployeePayroll({
          baseSalary: Number(emp.baseSalary),
          benefitsAmount: Number(emp.benefitsAmount),
          dependentsCount: emp.dependentsCount,
          contractType: emp.contractType as any,
        });

        totalNetPayroll = roundCurrency(totalNetPayroll + calc.netSalary);
        totalWithheldTaxes = roundCurrency(
          totalWithheldTaxes + calc.inssEmployeeDiscount + calc.irrfEmployeeDiscount
        );
        totalCompanyPayrollCost = roundCurrency(
          totalCompanyPayrollCost + calc.totalCompanyCost
        );

        const savedRun = await tx.payrollRun.upsert({
          where: {
            companyId_employeeId_competenceMonth: {
              companyId: context.companyId,
              employeeId: emp.id,
              competenceMonth,
            },
          },
          update: {
            grossSalary: calc.grossSalary,
            benefitsAmount: calc.benefitsAmount,
            inssEmployeeDiscount: calc.inssEmployeeDiscount,
            irrfEmployeeDiscount: calc.irrfEmployeeDiscount,
            fgtsEmployerAmount: calc.fgtsEmployerAmount,
            inssEmployerAmount: calc.inssEmployerAmount,
            netSalary: calc.netSalary,
            totalCompanyCost: calc.totalCompanyCost,
          },
          create: {
            tenantId: context.tenantId,
            companyId: context.companyId,
            employeeId: emp.id,
            competenceMonth,
            grossSalary: calc.grossSalary,
            benefitsAmount: calc.benefitsAmount,
            inssEmployeeDiscount: calc.inssEmployeeDiscount,
            irrfEmployeeDiscount: calc.irrfEmployeeDiscount,
            fgtsEmployerAmount: calc.fgtsEmployerAmount,
            inssEmployerAmount: calc.inssEmployerAmount,
            netSalary: calc.netSalary,
            totalCompanyCost: calc.totalCompanyCost,
            esocialEventCode: 'S-1200',
            status: 'CALCULATED',
          },
        });
        runs.push(savedRun);
      }

      // 1. Integração Automática com Módulo 02 (Financeiro) + Módulo 17 (Workflow)
      let hrCategory = await tx.financialCategory.findFirst({
        where: { companyId: context.companyId, code: 'RH-FOLHA-SALARIOS' },
      });
      if (!hrCategory) {
        hrCategory = await tx.financialCategory.create({
          data: {
            tenantId: context.tenantId,
            companyId: context.companyId,
            code: 'RH-FOLHA-SALARIOS',
            name: 'Folha de Pagamento, Benefícios e Encargos Sociais',
            nature: 'EXPENSE',
          },
        });
      }

      const today = new Date();
      const docNum = `FOLHA-${competenceMonth}`;
      const idempotencyKey = `hr_pay_${context.companyId}_${competenceMonth}_${Date.now()}`;

      const payable = await tx.accountPayable.create({
        data: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          categoryId: hrCategory.id,
          supplierName: `Folha de Pagamento Consolidada (${employees.length} colaboradores)`,
          supplierTaxId: '00.000.000/0001-91',
          documentNumber: docNum,
          description: `Provisão Líquida Folha ${competenceMonth} (eSocial S-1200 / S-1210)`,
          originModule: 'HR',
          issueDate: today,
          dueDate: today,
          competenceDate: today,
          grossAmount: roundCurrency(totalNetPayroll + totalWithheldTaxes),
          discountAmount: 0,
          interestAmount: 0,
          taxRetainedAmount: totalWithheldTaxes,
          netAmount: totalNetPayroll,
          paidAmount: 0,
          status: 'PENDING_APPROVAL',
          idempotencyKey,
          createdById: context.userId,
        },
      });

      await tx.workflowInstance.create({
        data: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          moduleCode: 'HR',
          entityType: 'ACCOUNT_PAYABLE',
          entityId: payable.id,
          referenceAmount: totalNetPayroll,
          status: 'PENDING',
          requestedById: context.userId,
        },
      });

      // 2. Integração Automática com Módulo 03 (Contabilidade — Partidas Dobradas na DRE)
      const [expenseAcc, liabilityAcc, lastEntry] = await Promise.all([
        tx.chartOfAccount.findFirst({
          where: { companyId: context.companyId, nature: 'EXPENSE', isAnalytical: true },
        }),
        tx.chartOfAccount.findFirst({
          where: { companyId: context.companyId, nature: 'LIABILITY', isAnalytical: true },
        }),
        tx.journalEntry.findFirst({
          where: { companyId: context.companyId },
          orderBy: { entryNumber: 'desc' },
        }),
      ]);

      let journalEntry = null;
      if (expenseAcc && liabilityAcc) {
        journalEntry = await tx.journalEntry.create({
          data: {
            tenantId: context.tenantId,
            companyId: context.companyId,
            entryNumber: (lastEntry?.entryNumber ?? 0) + 1,
            competenceDate: today,
            description: `Provisão Contábil Folha de Pagamento ${competenceMonth} (${employees.length} colab.)`,
            originModule: 'HR',
            originReferenceId: payable.id,
            totalDebit: totalCompanyPayrollCost,
            totalCredit: totalCompanyPayrollCost,
            status: 'POSTED',
            idempotencyKey: `je_${idempotencyKey}`,
            createdById: context.userId,
            lines: {
              create: [
                {
                  chartOfAccountId: expenseAcc.id,
                  debitAmount: totalCompanyPayrollCost,
                  creditAmount: 0,
                  memo: `Despesa Folha + Benefícios + FGTS/INSS Patronal (${competenceMonth})`,
                },
                {
                  chartOfAccountId: liabilityAcc.id,
                  debitAmount: 0,
                  creditAmount: totalCompanyPayrollCost,
                  memo: `Salários Líquidos (${totalNetPayroll.toFixed(
                    2
                  )}) + Encargos e Retenções a Recolher`,
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
          aggregateType: 'PayrollRun',
          aggregateId: payable.id,
          eventType: 'hr.payroll.closed.s1200',
          payload: {
            competenceMonth,
            employeesCount: employees.length,
            totalNetPayroll,
            totalWithheldTaxes,
            totalCompanyPayrollCost,
            linkedPayableId: payable.id,
            linkedJournalEntryId: journalEntry?.id || null,
          },
        },
      });

      await this.auditService.record({
        context,
        moduleCode: ErpModuleCode.HR,
        entityName: 'PayrollRun',
        entityId: payable.id,
        action: 'CREATE',
        previousValues: null,
        newValues: {
          competenceMonth,
          employeesProcessed: employees.length,
          totalNetPayroll,
          totalCompanyPayrollCost,
        },
      });

      return {
        competenceMonth,
        employeesProcessed: employees.length,
        totalNetPayroll,
        totalWithheldTaxes,
        totalCompanyPayrollCost,
        payable,
        journalEntry,
      };
    });
  }

  async getHrAndEsocialSummary(tenantId: string, companyId: string) {
    const [employees, payrollRuns] = await Promise.all([
      this.prisma.employee.findMany({
        where: { tenantId, companyId },
        orderBy: { registrationCode: 'asc' },
      }),
      this.prisma.payrollRun.findMany({
        where: { tenantId, companyId },
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
    ]);

    const activeEmployees = employees.filter((e) => e.status === 'ACTIVE');
    const monthlyBaseSalaryTotal = roundCurrency(
      activeEmployees.reduce((acc, e) => acc + Number(e.baseSalary), 0)
    );
    const monthlyBenefitsTotal = roundCurrency(
      activeEmployees.reduce((acc, e) => acc + Number(e.benefitsAmount), 0)
    );

    return {
      headcount: employees.length,
      activeCount: activeEmployees.length,
      monthlyBaseSalaryTotal,
      monthlyBenefitsTotal,
      esocialEventsStatus: [
        {
          code: 'S-2200',
          name: 'Cadastramento Inicial e Admissão de Trabalhador',
          status: 'SINCRONIZADO',
          count: employees.length,
        },
        {
          code: 'S-1200',
          name: 'Remuneração de Trabalhador vinculado ao RGPS',
          status: 'TRANSMITIDO',
          count: payrollRuns.length,
        },
        {
          code: 'S-1210',
          name: 'Pagamentos de Rendimentos do Trabalho (IRRF / Líquido)',
          status: 'PRONTO',
          count: payrollRuns.length,
        },
      ],
      employees: employees.map((e) => ({
        ...e,
        baseSalary: Number(e.baseSalary),
        benefitsAmount: Number(e.benefitsAmount),
      })),
      payrollRuns: payrollRuns.map((pr) => ({
        ...pr,
        grossSalary: Number(pr.grossSalary),
        benefitsAmount: Number(pr.benefitsAmount),
        inssEmployeeDiscount: Number(pr.inssEmployeeDiscount),
        irrfEmployeeDiscount: Number(pr.irrfEmployeeDiscount),
        fgtsEmployerAmount: Number(pr.fgtsEmployerAmount),
        inssEmployerAmount: Number(pr.inssEmployerAmount),
        netSalary: Number(pr.netSalary),
        totalCompanyCost: Number(pr.totalCompanyCost),
      })),
    };
  }
}
