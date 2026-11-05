import 'dotenv/config';
import crypto from 'node:crypto';
import { ModuleCode, UserType, AccountNature } from '@prisma/client';
import { PrismaService } from '../../apps/api/src/infrastructure/database/prisma.service';
import { IdentityService } from '../../apps/api/src/core/auth/identity.service';

const prisma = new PrismaService();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error(
      'SEED_BLOCKED_IN_PRODUCTION: A carga demonstrativa (seed) está bloqueada em produção. Defina ALLOW_PRODUCTION_SEED=true explicitamente se desejar inicializar um ambiente homologado.'
    );
  }
  console.log('🌱 Iniciando seed da Fundação + Entrega 2 (Core Identity, RBAC/ABAC, Multiempresa & Workflow)...');

  // 1. Organização (Tenant) Principal
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'delta-holding' },
    update: {},
    create: {
      name: 'DELTA Holding Empresarial S.A.',
      slug: 'delta-holding',
      planTier: 'ENTERPRISE',
    },
  });

  // 2. Duas Empresas no mesmo Grupo (Matriz Operacional + Operadora de Eventos & Pagamentos)
  const hqCompany = await prisma.company.upsert({
    where: {
      tenantId_code: { tenantId: tenant.id, code: 'EMP-01' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'EMP-01',
      legalName: 'DELTA Tecnologia e Gestão Corporativa Ltda',
      tradeName: 'DELTA Matriz',
      taxId: '12.345.678/0001-90',
      taxRegime: 'LUCRO_REAL',
      isHeadquarters: true,
    },
  });

  const eventsCompany = await prisma.company.upsert({
    where: {
      tenantId_code: { tenantId: tenant.id, code: 'EMP-02' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'EMP-02',
      legalName: 'DELTA Live Events & Ticketing S.A.',
      tradeName: 'DELTA Eventos & Pagamentos',
      taxId: '98.765.432/0001-10',
      taxRegime: 'LUCRO_PRESUMIDO',
      isHeadquarters: false,
    },
  });

  // 3. Filiais (Branches), Departamentos e Centros de Custo (Multiempresa)
  const branchesData = [
    { companyId: hqCompany.id, code: 'FIL-SP-01', name: 'Matriz São Paulo — Faria Lima', city: 'São Paulo', state: 'SP' },
    { companyId: hqCompany.id, code: 'FIL-RJ-02', name: 'Filial Rio de Janeiro — Centro', city: 'Rio de Janeiro', state: 'RJ' },
    { companyId: eventsCompany.id, code: 'FIL-EVT-01', name: 'Operações & Bilheteria Nacional', city: 'São Paulo', state: 'SP' },
  ];

  for (const b of branchesData) {
    await prisma.branch.upsert({
      where: { companyId_code: { companyId: b.companyId, code: b.code } },
      update: {},
      create: { tenantId: tenant.id, ...b },
    });
  }

  const departmentsData = [
    { companyId: hqCompany.id, code: 'DEP-FIN', name: 'Diretoria Financeira & Tesouraria' },
    { companyId: hqCompany.id, code: 'DEP-CONT', name: 'Contabilidade & Fiscal' },
    { companyId: hqCompany.id, code: 'DEP-TI', name: 'Engenharia, Cloud & Segurança' },
    { companyId: hqCompany.id, code: 'DEP-RH', name: 'Recursos Humanos & Departamento Pessoal' },
    { companyId: eventsCompany.id, code: 'DEP-OPS', name: 'Operações de Eventos & Atendimento ao Produtor' },
  ];

  for (const d of departmentsData) {
    await prisma.department.upsert({
      where: { companyId_code: { companyId: d.companyId, code: d.code } },
      update: {},
      create: { tenantId: tenant.id, ...d },
    });
  }

  const costCentersData = [
    { companyId: hqCompany.id, code: 'CC-100', name: 'Administração Central & Holding' },
    { companyId: hqCompany.id, code: 'CC-200', name: 'Infraestrutura Cloud & Tecnologia' },
    { companyId: hqCompany.id, code: 'CC-300', name: 'Comercial, Marketing & Expansão' },
    { companyId: eventsCompany.id, code: 'CC-400', name: 'Operação de Eventos & Adquirência' },
  ];

  for (const cc of costCentersData) {
    await prisma.costCenter.upsert({
      where: { companyId_code: { companyId: cc.companyId, code: cc.code } },
      update: {},
      create: { tenantId: tenant.id, ...cc },
    });
  }

  // 4. Ativação dos 20 módulos + Extensão de Eventos para ambas as empresas
  for (const comp of [hqCompany, eventsCompany]) {
    for (const mod of Object.values(ModuleCode)) {
      await prisma.tenantModuleSubscription.upsert({
        where: {
          tenantId_companyId_moduleCode: {
            tenantId: tenant.id,
            companyId: comp.id,
            moduleCode: mod,
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          companyId: comp.id,
          moduleCode: mod,
          isEnabled: true,
        },
      });
    }
  }

  // 5. Catálogo de Permissões Granulares RBAC
  const permissionsCatalog: Array<{ moduleCode: ModuleCode; code: string; name: string }> = [
    { moduleCode: ModuleCode.ADMINISTRATION, code: 'admin:organization:manage', name: 'Gerenciar empresas, filiais, departamentos e centros de custo' },
    { moduleCode: ModuleCode.ADMINISTRATION, code: 'admin:rbac:manage', name: 'Gerenciar perfis, permissões e alçadas ABAC' },
    { moduleCode: ModuleCode.ADMINISTRATION, code: 'admin:modules:manage', name: 'Ativar e desativar módulos do ERP (Feature Management)' },
    { moduleCode: ModuleCode.ADMINISTRATION, code: 'admin:audit:read', name: 'Consultar trilha imutável de auditoria' },
    { moduleCode: ModuleCode.FINANCIAL, code: 'financial:payable:read', name: 'Consultar contas a pagar' },
    { moduleCode: ModuleCode.FINANCIAL, code: 'financial:payable:create', name: 'Registrar contas a pagar' },
    { moduleCode: ModuleCode.FINANCIAL, code: 'financial:payable:approve', name: 'Aprovar títulos a pagar conforme alçada ABAC' },
    { moduleCode: ModuleCode.FINANCIAL, code: 'financial:settlement:execute', name: 'Liquidar títulos e movimentar contas bancárias' },
    { moduleCode: ModuleCode.ACCOUNTING, code: 'accounting:journal:post', name: 'Efetivar lançamentos contábeis de partidas dobradas' },
    { moduleCode: ModuleCode.WORKFLOW, code: 'workflow:approval:decide', name: 'Aprovar ou rejeitar solicitações no motor de Workflow' },
    { moduleCode: ModuleCode.EVENTS, code: 'events:settlement:read', name: 'Consultar borderô financeiro e repasses de eventos' },
    { moduleCode: ModuleCode.INVENTORY, code: 'inventory:item:read', name: 'Consultar catálogo de almoxarifado e ficha Kardex' },
    { moduleCode: ModuleCode.INVENTORY, code: 'inventory:item:create', name: 'Cadastrar materiais e SKUs de estoque' },
    { moduleCode: ModuleCode.INVENTORY, code: 'inventory:movement:execute', name: 'Movimentar estoque (entradas, requisições e transferências)' },
  ];

  const createdPermissions = [];
  for (const perm of permissionsCatalog) {
    const p = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name },
      create: perm,
    });
    createdPermissions.push(p);
  }

  // 6. Perfis RBAC + ABAC (Alçadas Financeiras Configuráveis)
  const rolesData = [
    { code: 'SUPER_ADMIN', name: 'Superadministrador Global', isSystemRole: true, maxApprovalAmount: 999999999.99 },
    { code: 'DIRECTOR', name: 'Diretor Executivo / CFO', isSystemRole: false, maxApprovalAmount: 500000.0 },
    { code: 'FINANCIAL_MANAGER', name: 'Gerente Financeiro', isSystemRole: false, maxApprovalAmount: 50000.0 },
    { code: 'ACCOUNTANT', name: 'Contador Sênior', isSystemRole: false, maxApprovalAmount: 0 },
    { code: 'HR_MANAGER', name: 'Gestor de Recursos Humanos', isSystemRole: false, maxApprovalAmount: 15000.0 },
    { code: 'EXTERNAL_PRODUCER', name: 'Produtor de Eventos (Portal Externo)', isSystemRole: false, maxApprovalAmount: 0 },
  ];

  const roleMap: Record<string, any> = {};
  for (const r of rolesData) {
    const savedRole = await prisma.role.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: r.code } },
      update: {},
      create: { tenantId: tenant.id, ...r },
    });
    roleMap[r.code] = savedRole;
  }

  // Vincula permissões ao perfil FINANCIAL_MANAGER
  for (const perm of createdPermissions.filter((p) => p.code.startsWith('financial:') || p.code.startsWith('workflow:'))) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: roleMap.FINANCIAL_MANAGER.id, permissionId: perm.id } },
      update: {},
      create: { roleId: roleMap.FINANCIAL_MANAGER.id, permissionId: perm.id },
    });
  }

  // 7. Plano de Contas Completo (Módulo 03 — Contabilidade: Ativo, Passivo, Receita e Despesa)
  const chartAccountsData = [
    // EMP-01 (Matriz)
    { companyId: hqCompany.id, code: '1.01.01.001', name: 'Bancos Conta Movimento — Itaú Corporate', nature: AccountNature.ASSET },
    { companyId: hqCompany.id, code: '1.01.02.001', name: 'Clientes — Contas a Receber Contratos B2B', nature: AccountNature.ASSET },
    { companyId: hqCompany.id, code: '2.01.03.001', name: 'Fornecedores Nacionais a Pagar', nature: AccountNature.LIABILITY },
    { companyId: hqCompany.id, code: '4.01.01.001', name: 'Receita de Licenciamento e Serviços Enterprise', nature: AccountNature.REVENUE },
    { companyId: hqCompany.id, code: '5.01.02.001', name: 'Despesas com Infraestrutura Cloud e Software', nature: AccountNature.EXPENSE },
    // EMP-02 (Eventos & Pagamentos)
    { companyId: eventsCompany.id, code: '1.01.01.002', name: 'Conta Liquidação PIX & Adquirência', nature: AccountNature.ASSET },
    { companyId: eventsCompany.id, code: '2.01.05.001', name: 'Recursos de Produtores a Repassar (Custódia Eventos)', nature: AccountNature.LIABILITY },
    { companyId: eventsCompany.id, code: '4.01.02.001', name: 'Receita de Taxas de Conveniência e Antecipação', nature: AccountNature.REVENUE },
    { companyId: eventsCompany.id, code: '5.01.03.001', name: 'Despesas de Taxas de Adquirência (MDR/PIX)', nature: AccountNature.EXPENSE },
  ];

  for (const acc of chartAccountsData) {
    await prisma.chartOfAccount.upsert({
      where: { companyId_code: { companyId: acc.companyId, code: acc.code } },
      update: { name: acc.name, nature: acc.nature },
      create: {
        tenantId: tenant.id,
        companyId: acc.companyId,
        code: acc.code,
        name: acc.name,
        nature: acc.nature,
        isAnalytical: true,
      },
    });
  }

  // 7.1 Contas Bancárias Iniciais (Módulo 02 — Financeiro e Tesouraria)
  const bankAccountsData = [
    {
      companyId: hqCompany.id,
      code: 'BC-ITAU-01',
      name: 'Itaú Corporate — Conta Principal',
      bankCode: '341',
      agencyNumber: '0912',
      accountNumber: '88451-9',
      pixKey: 'tesouraria@deltaerp.com.br',
      initialBalance: 450000.0,
      currentBalance: 450000.0,
    },
    {
      companyId: hqCompany.id,
      code: 'BC-BRAD-02',
      name: 'Bradesco Empresas — Reserva Operacional',
      bankCode: '237',
      agencyNumber: '3310',
      accountNumber: '12900-4',
      pixKey: '12.345.678/0001-90',
      initialBalance: 180000.0,
      currentBalance: 180000.0,
    },
    {
      companyId: eventsCompany.id,
      code: 'BC-PIX-EVT',
      name: 'Conta Escrow & Liquidação de Eventos',
      bankCode: '260',
      agencyNumber: '0001',
      accountNumber: '998120-1',
      pixKey: '98.765.432/0001-10',
      initialBalance: 320000.0,
      currentBalance: 320000.0,
    },
  ];

  for (const bank of bankAccountsData) {
    await prisma.bankAccount.upsert({
      where: { companyId_code: { companyId: bank.companyId, code: bank.code } },
      update: {},
      create: { tenantId: tenant.id, ...bank },
    });
  }

  // 7.2 Produtor Homologado, Evento e Lotes de Ingressos (Extensão de Eventos & Portal do Produtor)
  const producer = await prisma.producer.upsert({
    where: { companyId_taxId: { companyId: eventsCompany.id, taxId: '45.111.222/0001-88' } },
    update: {},
    create: {
      tenantId: tenant.id,
      companyId: eventsCompany.id,
      legalName: 'Prime Live Entertainment & Festivais S.A.',
      tradeName: 'Prime Live Produções',
      taxId: '45.111.222/0001-88',
      pixKeyForPayout: 'financeiro@primelive.com.br',
      defaultFeePct: 12.0,
      advanceFeePct: 2.5,
    },
  });

  const festivalEvent = await prisma.event.upsert({
    where: { companyId_code: { companyId: eventsCompany.id, code: 'EVT-2026-01' } },
    update: {},
    create: {
      tenantId: tenant.id,
      companyId: eventsCompany.id,
      producerId: producer.id,
      code: 'EVT-2026-01',
      title: 'DELTA Summit & Music Festival 2026',
      venueName: 'Allianz Parque — Arena Principal',
      city: 'São Paulo',
      state: 'SP',
      startsAt: new Date('2026-12-15T18:00:00Z'),
      endsAt: new Date('2026-12-16T04:00:00Z'),
      serviceFeePct: 12.0,
      status: 'ON_SALE',
      grossTicketSales: 185000.0,
      totalServiceFees: 22200.0,
      totalAcquirerFees: 3150.0,
      totalChargebacks: 0,
      totalAdvanced: 40000.0,
      totalPaidOut: 0,
    },
  });

  const existingBatches = await prisma.ticketBatch.count({ where: { eventId: festivalEvent.id } });
  if (existingBatches === 0) {
    await prisma.ticketBatch.createMany({
      data: [
        {
          eventId: festivalEvent.id,
          name: '1º Lote — Pista Premium',
          faceValue: 350.0,
          serviceFee: 42.0,
          totalQuota: 2000,
          soldQuantity: 350,
        },
        {
          eventId: festivalEvent.id,
          name: 'Lote VIP — Camarote Open Bar',
          faceValue: 750.0,
          serviceFee: 90.0,
          totalQuota: 500,
          soldQuantity: 80,
        },
      ],
    });
  }

  // 7.3 Parametrização Tributária Padrão (Módulo 04 — Fiscal e Tributário)
  const taxRulesData = [
    {
      companyId: hqCompany.id,
      code: 'SERV-TI-TOMADO',
      name: 'Entrada NFS-e — Serviços de TI & Consultoria (Retenção IRRF 1,5% + PCC 4,65%)',
      documentModel: 'NFSE' as const,
      direction: 'INBOUND' as const,
      cfopOrLc116: 'LC 1.01',
      issPct: 5.0,
      pisPct: 0.65,
      cofinsPct: 3.0,
      irrfPct: 1.5,
      csllPct: 1.0,
      icmsPct: 0,
      withholdTaxes: true,
    },
    {
      companyId: hqCompany.id,
      code: 'FAT-SAAS-SAIDA',
      name: 'Saída NFS-e — Faturamento Licenciamento & SaaS (Lucro Real)',
      documentModel: 'NFSE' as const,
      direction: 'OUTBOUND' as const,
      cfopOrLc116: 'LC 1.05',
      issPct: 2.9,
      pisPct: 1.65,
      cofinsPct: 7.6,
      irrfPct: 0,
      csllPct: 0,
      icmsPct: 0,
      withholdTaxes: false,
    },
    {
      companyId: hqCompany.id,
      code: 'NFE-COMPRA-EQUIP',
      name: 'Entrada NF-e (Mod. 55) — Aquisição de Equipamentos & Servidores (CFOP 1551)',
      documentModel: 'NFE' as const,
      direction: 'INBOUND' as const,
      cfopOrLc116: 'CFOP 1551',
      issPct: 0,
      pisPct: 1.65,
      cofinsPct: 7.6,
      irrfPct: 0,
      csllPct: 0,
      icmsPct: 18.0,
      withholdTaxes: false,
    },
    {
      companyId: eventsCompany.id,
      code: 'NFSE-TAXA-EVENTO',
      name: 'Saída NFS-e — Taxa de Conveniência e Intermediação de Bilheteria',
      documentModel: 'NFSE' as const,
      direction: 'OUTBOUND' as const,
      cfopOrLc116: 'LC 12.01',
      issPct: 5.0,
      pisPct: 0.65,
      cofinsPct: 3.0,
      irrfPct: 0,
      csllPct: 0,
      icmsPct: 0,
      withholdTaxes: false,
    },
  ];

  for (const rule of taxRulesData) {
    await prisma.taxRule.upsert({
      where: { companyId_code: { companyId: rule.companyId, code: rule.code } },
      update: {},
      create: { tenantId: tenant.id, ...rule },
    });
  }

  // 7.4 Colaboradores Iniciais (Módulo 05 — Recursos Humanos e Folha)
  const employeesData = [
    {
      companyId: hqCompany.id,
      registrationCode: 'COL-0001',
      fullName: 'Rafael Mendes — Arquiteto de Software Principal',
      taxId: '312.456.789-01',
      email: 'rafael.mendes@deltaerp.com.br',
      jobTitle: 'Staff Software Architect',
      contractType: 'CLT' as const,
      baseSalary: 18500.0,
      benefitsAmount: 1650.0,
      dependentsCount: 2,
      esocialMatricula: 'ESOC-S2200-COL0001',
    },
    {
      companyId: hqCompany.id,
      registrationCode: 'COL-0002',
      fullName: 'Beatriz Oliveira — Controller & Contadora Sênior',
      taxId: '423.567.890-12',
      email: 'beatriz.oliveira@deltaerp.com.br',
      jobTitle: 'Head de Controladoria e Fiscal',
      contractType: 'CLT' as const,
      baseSalary: 14200.0,
      benefitsAmount: 1450.0,
      dependentsCount: 1,
      esocialMatricula: 'ESOC-S2200-COL0002',
    },
    {
      companyId: eventsCompany.id,
      registrationCode: 'COL-0003',
      fullName: 'Lucas Silveira — Diretor de Operações de Arena',
      taxId: '534.678.901-23',
      email: 'lucas.silveira@deltaerp.com.br',
      jobTitle: 'Diretor de Operações de Eventos',
      contractType: 'STATUTORY_DIRECTOR' as const,
      baseSalary: 22000.0,
      benefitsAmount: 1800.0,
      dependentsCount: 0,
      esocialMatricula: 'ESOC-S2300-COL0003',
    },
  ];

  for (const emp of employeesData) {
    await prisma.employee.upsert({
      where: {
        companyId_registrationCode: {
          companyId: emp.companyId,
          registrationCode: emp.registrationCode,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        hireDate: new Date('2025-02-01'),
        ...emp,
      },
    });
  }

  // 7.5 Clientes e Funil Comercial Inicial (Módulo 06 — Comercial e CRM)
  const customer1 = await prisma.customer.upsert({
    where: {
      companyId_code: {
        companyId: hqCompany.id,
        code: 'CLI-0001',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      companyId: hqCompany.id,
      code: 'CLI-0001',
      legalName: 'Grupo Varejista Atlântico S.A.',
      tradeName: 'Atlântico Retail Enterprise',
      taxId: '61.234.567/0001-88',
      email: 'compras.ti@atlanticoretail.com.br',
      segment: 'ENTERPRISE_RETAIL',
      creditLimit: 500000.0,
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: {
      companyId_code: {
        companyId: hqCompany.id,
        code: 'CLI-0002',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      companyId: hqCompany.id,
      code: 'CLI-0002',
      legalName: 'Indústrias Metalúrgicas Horizonte Ltda',
      tradeName: 'Horizonte Siderurgia',
      taxId: '72.345.678/0001-99',
      email: 'diretoria@horizontesiderurgia.com.br',
      segment: 'MANUFACTURING',
      creditLimit: 350000.0,
    },
  });

  const customerEvents = await prisma.customer.upsert({
    where: {
      companyId_code: {
        companyId: eventsCompany.id,
        code: 'CLI-EV-01',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      companyId: eventsCompany.id,
      code: 'CLI-EV-01',
      legalName: 'Banco Global Patrocínios & Mídia S.A.',
      tradeName: 'Global Bank Naming Rights',
      taxId: '83.456.789/0001-10',
      email: 'marketing.eventos@globalbank.com.br',
      segment: 'SPONSORSHIP_MEDIA',
      creditLimit: 800000.0,
    },
  });

  const opportunitiesData = [
    {
      companyId: hqCompany.id,
      customerId: customer1.id,
      code: 'OPP-2026-001',
      title: 'Licenciamento Anual ERP Enterprise + Módulo Fiscal SPED (150 Usuários)',
      salespersonName: 'Henrique Vasconcelos — Executivo de Contas Enterprise',
      stage: 'NEGOTIATION' as const,
      probabilityPct: 80,
      grossAmount: 140000.0,
      discountAmount: 10000.0,
      netAmount: 130000.0,
      commissionRatePct: 5.0,
      commissionAmount: 6500.0,
      expectedCloseDate: new Date('2026-11-30'),
    },
    {
      companyId: hqCompany.id,
      customerId: customer2.id,
      code: 'OPP-2026-002',
      title: 'Implantação Consultiva Core Financeiro, Contábil & Tesouraria',
      salespersonName: 'Carolina Martins — Key Account Manager',
      stage: 'PROPOSAL' as const,
      probabilityPct: 60,
      grossAmount: 85000.0,
      discountAmount: 5000.0,
      netAmount: 80000.0,
      commissionRatePct: 4.5,
      commissionAmount: 3600.0,
      expectedCloseDate: new Date('2026-12-15'),
    },
    {
      companyId: eventsCompany.id,
      customerId: customerEvents.id,
      code: 'OPP-EV-001',
      title: 'Cota Master de Patrocínio & Camarotes Corporativos — Delta Music Festival',
      salespersonName: 'Rodrigo Alencar — Diretor Comercial de Patrocínios',
      stage: 'NEGOTIATION' as const,
      probabilityPct: 85,
      grossAmount: 200000.0,
      discountAmount: 15000.0,
      netAmount: 185000.0,
      commissionRatePct: 6.0,
      commissionAmount: 11100.0,
      expectedCloseDate: new Date('2026-11-25'),
    },
  ];

  for (const opp of opportunitiesData) {
    await prisma.salesOpportunity.upsert({
      where: {
        companyId_code: {
          companyId: opp.companyId,
          code: opp.code,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        ...opp,
      },
    });
  }

  // 7.6 Fornecedores Homologados e Pedidos de Compra Iniciais (Módulo 07 — Compras e Suprimentos)
  await prisma.supplier.upsert({
    where: {
      companyId_code: {
        companyId: hqCompany.id,
        code: 'FOR-0001',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      companyId: hqCompany.id,
      code: 'FOR-0001',
      legalName: 'Amazon Web Services Brasil Cloud Computing Ltda',
      tradeName: 'AWS Cloud Enterprise',
      taxId: '23.456.789/0001-12',
      email: 'faturamento.enterprise@aws.amazon.com',
      category: 'CLOUD_INFRASTRUCTURE',
      ratingScore: 9.85,
      isHomologated: true,
      paymentTermsDays: 30,
    },
  });

  const supplier2 = await prisma.supplier.upsert({
    where: {
      companyId_code: {
        companyId: hqCompany.id,
        code: 'FOR-0002',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      companyId: hqCompany.id,
      code: 'FOR-0002',
      legalName: 'Dell Computadores do Brasil Ltda',
      tradeName: 'Dell Technologies Hardware',
      taxId: '72.381.189/0001-10',
      email: 'corporate.sales@dell.com',
      category: 'IT_HARDWARE_SERVERS',
      ratingScore: 9.6,
      isHomologated: true,
      paymentTermsDays: 45,
    },
  });

  const supplierEvents = await prisma.supplier.upsert({
    where: {
      companyId_code: {
        companyId: eventsCompany.id,
        code: 'FOR-EV-01',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      companyId: eventsCompany.id,
      code: 'FOR-EV-01',
      legalName: 'ProStage Sonorização, Painéis LED e Estruturas S.A.',
      tradeName: 'ProStage Arena Engineering',
      taxId: '45.678.912/0001-33',
      email: 'engenharia@prostage.com.br',
      category: 'STAGE_AUDIO_LIGHTING',
      ratingScore: 9.4,
      isHomologated: true,
      paymentTermsDays: 15,
    },
  });

  const purchaseOrdersData = [
    {
      companyId: hqCompany.id,
      supplierId: supplier2.id,
      code: 'PO-2026-0001',
      description: 'Aquisição de 15 Workstations Engenharia & 2 Servidores Rack PowerEdge',
      requesterName: 'Rafael Mendes — Arquitetura & Infraestrutura',
      quote1Amount: 42000.0,
      quote2Amount: 46500.0,
      quote3Amount: 48900.0,
      negotiatedSavings: 6900.0,
      freightAmount: 850.0,
      totalAmount: 42850.0,
      status: 'PENDING_APPROVAL' as const,
      expectedDeliveryDate: new Date('2026-11-25'),
    },
    {
      companyId: eventsCompany.id,
      supplierId: supplierEvents.id,
      code: 'PO-EV-0001',
      description: 'Locação de Palco Principal GeoSpace + 400m² Painel LED P2 — Delta Festival',
      requesterName: 'Lucas Silveira — Diretoria de Operações de Arena',
      quote1Amount: 68000.0,
      quote2Amount: 74000.0,
      quote3Amount: 79500.0,
      negotiatedSavings: 11500.0,
      freightAmount: 2000.0,
      totalAmount: 70000.0,
      status: 'PENDING_APPROVAL' as const,
      expectedDeliveryDate: new Date('2026-11-20'),
    },
  ];

  for (const po of purchaseOrdersData) {
    await prisma.purchaseOrder.upsert({
      where: {
        companyId_code: {
          companyId: po.companyId,
          code: po.code,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        ...po,
      },
    });
  }

  // 7.7 Itens de Estoque e Saldo Contábil Inicial (Módulo 08 — Estoque e Inventário)
  const inventoryItemsData = [
    {
      companyId: hqCompany.id,
      sku: 'MAT-SRV-001',
      name: 'Servidor Rack Dell PowerEdge R760 (Dual Xeon / 256GB RAM)',
      category: 'DATACENTER_HARDWARE',
      unit: 'UN',
      warehouseLocation: 'ALM-CENTRAL-SP',
      quantityOnHand: 6.0,
      reorderPoint: 2.0,
      averageUnitCost: 14500.0,
      totalStockValue: 87000.0,
    },
    {
      companyId: hqCompany.id,
      sku: 'MAT-NBK-002',
      name: 'Workstation Portátil Corporativa 32GB NVMe 1TB',
      category: 'IT_EQUIPMENT',
      unit: 'UN',
      warehouseLocation: 'ALM-CENTRAL-SP',
      quantityOnHand: 15.0,
      reorderPoint: 5.0,
      averageUnitCost: 6800.0,
      totalStockValue: 102000.0,
    },
    {
      companyId: eventsCompany.id,
      sku: 'MAT-EV-RFID',
      name: 'Pulseira Cashless NFC/RFID Festival Impermeável (Lote Milheiro)',
      category: 'EVENT_CONSUMABLES',
      unit: 'MIL',
      warehouseLocation: 'ALM-ARENA-RJ',
      quantityOnHand: 25.0,
      reorderPoint: 10.0,
      averageUnitCost: 1200.0,
      totalStockValue: 30000.0,
    },
  ];

  for (const item of inventoryItemsData) {
    await prisma.inventoryItem.upsert({
      where: {
        companyId_sku: {
          companyId: item.companyId,
          sku: item.sku,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        ...item,
      },
    });
  }

  // 7.8 Bens do Ativo Imobilizado Inicial (Módulo 09 — Patrimônio, Depreciação Linear CPC 27)
  const fixedAssetsData = [
    {
      companyId: hqCompany.id,
      assetTag: 'PAT-2026-0001',
      name: 'Cluster Hiperconvergente Nutanix / Dell EMC (Datacenter Tier III)',
      category: 'DATACENTER_INFRASTRUCTURE',
      locationName: 'Datacenter Matriz São Paulo — Rack A01',
      acquisitionDate: new Date('2026-01-15'),
      acquisitionValue: 240000.0,
      residualValue: 24000.0,
      usefulLifeMonths: 60,
      annualDepreciationRatePct: 20.0,
      accumulatedDepreciation: 36000.0,
      netBookValue: 204000.0,
    },
    {
      companyId: hqCompany.id,
      assetTag: 'PAT-2026-0002',
      name: 'Gerador de Energia Estacionário 500 kVA + Nobreak Dupla Conversão',
      category: 'FACILITIES_POWER',
      locationName: 'Subestação Matriz São Paulo',
      acquisitionDate: new Date('2025-06-10'),
      acquisitionValue: 180000.0,
      residualValue: 30000.0,
      usefulLifeMonths: 120,
      annualDepreciationRatePct: 10.0,
      accumulatedDepreciation: 15000.0,
      netBookValue: 165000.0,
    },
    {
      companyId: eventsCompany.id,
      assetTag: 'PAT-EV-0001',
      name: 'Sistema Line Array L-Acoustics K2 + Consoles Digitais DiGiCo',
      category: 'ARENA_AUDIO_VISUAL',
      locationName: 'Arena Eventos Rio de Janeiro',
      acquisitionDate: new Date('2025-11-01'),
      acquisitionValue: 360000.0,
      residualValue: 60000.0,
      usefulLifeMonths: 60,
      annualDepreciationRatePct: 20.0,
      accumulatedDepreciation: 50000.0,
      netBookValue: 310000.0,
    },
  ];

  for (const ast of fixedAssetsData) {
    await prisma.fixedAsset.upsert({
      where: {
        companyId_assetTag: {
          companyId: ast.companyId,
          assetTag: ast.assetTag,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        ...ast,
      },
    });
  }

  // 7.9 Pedidos de Venda e Transações de Gateway PIX/Cartão (Módulos 10 — Vendas e 11 — Pagamentos)
  await prisma.salesOrder.upsert({
    where: {
      companyId_orderNumber: {
        companyId: hqCompany.id,
        orderNumber: 'PV-2026-0001',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      companyId: hqCompany.id,
      customerId: customer1.id,
      orderNumber: 'PV-2026-0001',
      salespersonName: 'Henrique Vasconcelos — Executivo Enterprise',
      quantity: 2.0,
      unitPrice: 28000.0,
      grossAmount: 56000.0,
      discountAmount: 2000.0,
      netAmount: 54000.0,
      cmvAmount: 29000.0,
      commissionAmount: 2700.0,
      status: 'CONFIRMED',
    },
  });

  await prisma.paymentGatewayTransaction.upsert({
    where: {
      companyId_externalNsuCode: {
        companyId: hqCompany.id,
        externalNsuCode: 'E2E-PIX-BACEN-20261104-001',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      companyId: hqCompany.id,
      gatewayProvider: 'BACEN_SPI_PIX_DIRETO',
      externalNsuCode: 'E2E-PIX-BACEN-20261104-001',
      paymentMethod: 'PIX_INSTANT',
      installments: 1,
      grossAmount: 54000.0,
      mdrRatePct: 0.89,
      mdrFeeAmount: 480.6,
      netSettledAmount: 53519.4,
      status: 'CAPTURED_SETTLED',
    },
  });

  // 7.10 Módulos 12 a 16 (Contratos, SAC, Marketing e Documentos ICP-Brasil)
  await prisma.corporateContract.upsert({
    where: {
      companyId_contractNumber: {
        companyId: hqCompany.id,
        contractNumber: 'CTR-2026-0001',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      companyId: hqCompany.id,
      contractNumber: 'CTR-2026-0001',
      title: 'Licenciamento Enterprise ERP Cloud + Suporte 24x7 Missão Crítica',
      counterpartyName: 'Grupo Varejista Atlântico S.A.',
      counterpartyTaxId: '45.111.222/0001-90',
      contractNature: 'REVENUE_SAAS',
      readjustmentIndex: 'IGPM',
      originalMonthlyVal: 25000.0,
      currentMonthlyVal: 25000.0,
      accumulatedReadjPct: 0,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2028-12-31'),
      status: 'ACTIVE',
    },
  });

  await prisma.supportTicket.upsert({
    where: {
      companyId_protocolNumber: {
        companyId: hqCompany.id,
        protocolNumber: 'SAC-2026-9001',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      companyId: hqCompany.id,
      protocolNumber: 'SAC-2026-9001',
      customerName: 'Indústrias Metalúrgicas Unidas Ltda',
      customerTaxId: '78.444.555/0001-12',
      subject: 'Solicitação de Estorno Parcial — Duplicidade de Cobrança Licenças Adicionais',
      priority: 'HIGH',
      slaTargetHours: 4,
      elapsedHours: 1.5,
      refundRequested: 3500.0,
      refundApproved: 0,
      status: 'OPEN_IN_SLA',
    },
  });

  await prisma.marketingCampaign.upsert({
    where: {
      companyId_code: {
        companyId: hqCompany.id,
        code: 'MKT-2026-ENT01',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      companyId: hqCompany.id,
      code: 'MKT-2026-ENT01',
      name: 'Campanha Expansão Enterprise B2B — CFO & CIO Summit',
      channel: 'LINKEDIN_GOOGLE_SEARCH',
      couponCode: 'DELTAENTERPRISE10',
      discountPct: 10.0,
      budgetSpent: 18000.0,
      conversionsCount: 6,
      attributedRevenue: 144000.0,
      roasMultiplier: 8.0,
      status: 'ACTIVE',
    },
  });

  await prisma.digitalDocument.upsert({
    where: {
      companyId_documentCode: {
        companyId: hqCompany.id,
        documentCode: 'DOC-ICP-2026-001',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      companyId: hqCompany.id,
      documentCode: 'DOC-ICP-2026-001',
      title: 'Contrato Master de Prestação de Serviços SaaS & SLA 99,95% — Grupo Atlântico',
      category: 'MASTER_SERVICE_AGREEMENT',
      sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      signerName: 'Roberto Almeida (Diretor estatutário CFO)',
      signerTaxId: '123.456.789-01',
      certificateType: 'ICP_BRASIL_A3_TOKEN',
      signatureStatus: 'SIGNED_VERIFIED',
    },
  });

  // 8. Usuários com Hash PBKDF2-SHA512 e MFA configurado
  // Segurança (Achado 5): update: {} garante que o seed nunca sobrescreva senhas ou segredos MFA já alterados pelos usuários.
  const initialPassword = process.env.SEED_INITIAL_PASSWORD || 'Delta@2026';
  const secureHash = IdentityService.hashPassword(initialPassword);
  const initialMfaSecret =
    process.env.MFA_TOTP_SECRET ||
    (process.env.NODE_ENV === 'production'
      ? crypto.randomBytes(20).toString('hex')
      : '3132333435363738393031323334353637383930');

  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@deltaerp.com.br' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@deltaerp.com.br',
      passwordHash: secureHash,
      fullName: 'Diretoria Executiva DELTA',
      userType: UserType.INTERNAL,
      mfaEnabled: true,
      mfaSecretEncrypted: initialMfaSecret,
      lgpdConsentAt: new Date(),
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'financeiro@deltaerp.com.br' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'financeiro@deltaerp.com.br',
      passwordHash: secureHash,
      fullName: 'Marina Costa — Gerente Financeira',
      userType: UserType.INTERNAL,
      mfaEnabled: false,
      lgpdConsentAt: new Date(),
    },
  });

  await prisma.userCompanyAccess.upsert({
    where: {
      userId_companyId_roleId: {
        userId: adminUser.id,
        companyId: hqCompany.id,
        roleId: roleMap.SUPER_ADMIN.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: adminUser.id,
      companyId: hqCompany.id,
      roleId: roleMap.SUPER_ADMIN.id,
      allowedCostCenterIds: [],
    },
  });

  await prisma.userCompanyAccess.upsert({
    where: {
      userId_companyId_roleId: {
        userId: adminUser.id,
        companyId: eventsCompany.id,
        roleId: roleMap.DIRECTOR.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: adminUser.id,
      companyId: eventsCompany.id,
      roleId: roleMap.DIRECTOR.id,
      allowedCostCenterIds: [],
    },
  });

  await prisma.userCompanyAccess.upsert({
    where: {
      userId_companyId_roleId: {
        userId: managerUser.id,
        companyId: hqCompany.id,
        roleId: roleMap.FINANCIAL_MANAGER.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: managerUser.id,
      companyId: hqCompany.id,
      roleId: roleMap.FINANCIAL_MANAGER.id,
      allowedCostCenterIds: [],
    },
  });

  console.log('✅ Seed da Fundação + Entrega 2 concluído com sucesso!');
}

main()
  .catch((err) => {
    console.error('❌ Erro no seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
