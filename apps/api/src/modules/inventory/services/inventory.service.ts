import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { roundCurrency, TenantExecutionContext } from '@delta-erp/shared';
import { CoreSecurityPolicy } from '../../../core/permissions/permission.guard';

export interface MovingAverageInput {
  currentQty: number;
  currentAvgCost: number;
  reorderPoint: number;
  movementType: 'INBOUND_PURCHASE' | 'OUTBOUND_REQUISITION' | 'BRANCH_TRANSFER' | 'INVENTORY_ADJUSTMENT';
  quantity: number;
  inboundUnitCost?: number;
}

export interface MovingAverageResult {
  movementType: string;
  quantity: number;
  appliedUnitCost: number;
  totalMovementValue: number;
  resultingQtyOnHand: number;
  resultingAvgCost: number;
  resultingTotalStockValue: number;
  belowReorderPoint: boolean;
}

export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Motor de Custo Médio Ponderado Móvel (CMPM — CPC 16 / NBC TG 16):
   * - Entradas (INBOUND_PURCHASE) recalculam o Custo Médio Ponderado com base no saldo anterior + nova aquisição;
   * - Saídas (OUTBOUND_REQUISITION / BRANCH_TRANSFER) baixam o estoque pelo Custo Médio vigente e bloqueiam saldo negativo.
   */
  static calculateMovingAverageMovement(input: MovingAverageInput): MovingAverageResult {
    const currentQty = roundCurrency(input.currentQty);
    const currentAvgCost = roundCurrency(input.currentAvgCost);
    const currentTotalValue = roundCurrency(currentQty * currentAvgCost);
    const quantity = roundCurrency(input.quantity);

    if (quantity <= 0) {
      throw new Error('A quantidade movimentada no Kardex deve ser maior que zero.');
    }

    if (input.movementType === 'INBOUND_PURCHASE' || input.movementType === 'INVENTORY_ADJUSTMENT') {
      const inboundUnitCost = roundCurrency(input.inboundUnitCost ?? currentAvgCost);
      if (inboundUnitCost <= 0) {
        throw new Error('O custo unitário de entrada em estoque deve ser maior que zero.');
      }

      const totalMovementValue = roundCurrency(quantity * inboundUnitCost);
      const resultingQtyOnHand = roundCurrency(currentQty + quantity);
      const resultingTotalStockValue = roundCurrency(currentTotalValue + totalMovementValue);
      const resultingAvgCost = roundCurrency(resultingTotalStockValue / resultingQtyOnHand);

      return {
        movementType: input.movementType,
        quantity,
        appliedUnitCost: inboundUnitCost,
        totalMovementValue,
        resultingQtyOnHand,
        resultingAvgCost,
        resultingTotalStockValue,
        belowReorderPoint: resultingQtyOnHand <= input.reorderPoint,
      };
    }

    // Saída por Requisição ou Transferência entre Filiais
    if (quantity > currentQty) {
      throw new Error(
        `INSUFFICIENT_STOCK: Quantidade requisitada (${quantity}) superior ao saldo físico disponível em estoque (${currentQty}).`
      );
    }

    const appliedUnitCost = currentAvgCost;
    const totalMovementValue = roundCurrency(quantity * appliedUnitCost);
    const resultingQtyOnHand = roundCurrency(currentQty - quantity);
    const resultingAvgCost = resultingQtyOnHand > 0 ? currentAvgCost : 0;
    const resultingTotalStockValue = roundCurrency(resultingQtyOnHand * resultingAvgCost);

    return {
      movementType: input.movementType,
      quantity,
      appliedUnitCost,
      totalMovementValue,
      resultingQtyOnHand,
      resultingAvgCost,
      resultingTotalStockValue,
      belowReorderPoint: resultingQtyOnHand <= input.reorderPoint,
    };
  }

  /**
   * Cadastra um novo Material / SKU no Catálogo de Estoque com saldo inicial.
   */
  async createInventoryItem(input: {
    companyCode: string;
    sku: string;
    name: string;
    category?: string;
    unit?: string;
    warehouseLocation?: string;
    quantityOnHand: number;
    reorderPoint: number;
    averageUnitCost: number;
    context?: TenantExecutionContext;
  }) {
    if (input.context) {
      CoreSecurityPolicy.assertPermissionAndScope(input.context, 'inventory:item:create');
    }

    const company = input.context
      ? await this.prisma.company.findFirst({
          where: { id: input.context.companyId, tenantId: input.context.tenantId },
        })
      : await this.prisma.company.findFirst({
          where: { code: input.companyCode },
        });
    if (!company) {
      throw new Error(`Empresa ${input.companyCode} não localizada.`);
    }

    if (input.context) {
      CoreSecurityPolicy.assertTenantAndCompanyIsolation(
        input.context,
        company.tenantId,
        company.id
      );
      if (input.companyCode && company.code !== input.companyCode) {
        throw new Error(
          `FORBIDDEN_CROSS_COMPANY_ACCESS: Tentativa bloqueada de criar SKU na empresa ${input.companyCode} fora do contexto autorizado (${company.code}).`
        );
      }
    }

    const actorId =
      input.context?.userId ||
      (
        await this.prisma.user.findFirst({
          where: { tenantId: company.tenantId },
          orderBy: { createdAt: 'asc' },
        })
      )?.id;

    const qty = roundCurrency(input.quantityOnHand);
    const avgCost = roundCurrency(input.averageUnitCost);
    const totalStockValue = roundCurrency(qty * avgCost);

    const runTx =
      typeof (this.prisma as any).executeInTenantTransaction === 'function'
        ? (fn: (tx: any) => Promise<any>) =>
            this.prisma.executeInTenantTransaction(company.tenantId, company.id, fn)
        : (fn: (tx: any) => Promise<any>) => this.prisma.$transaction(fn);

    return runTx(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          sku: input.sku.trim().toUpperCase(),
          name: input.name.trim(),
          category: input.category || 'IT_EQUIPMENT',
          unit: input.unit || 'UN',
          warehouseLocation: input.warehouseLocation || 'ALM-CENTRAL-SP',
          quantityOnHand: qty,
          reorderPoint: roundCurrency(input.reorderPoint || 5),
          averageUnitCost: avgCost,
          totalStockValue,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          userId: actorId,
          moduleCode: 'INVENTORY',
          action: 'CREATE_SKU_ITEM',
          entityName: 'InventoryItem',
          entityId: item.id,
          newValues: {
            sku: item.sku,
            name: item.name,
            quantityOnHand: qty,
            averageUnitCost: avgCost,
            totalStockValue,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          aggregateType: 'InventoryItem',
          aggregateId: item.id,
          eventType: 'inventory.item.created',
          payload: {
            itemId: item.id,
            sku: item.sku,
            name: item.name,
            totalStockValue,
          },
          status: 'PUBLISHED',
          processedAt: new Date(),
        },
      });

      return item;
    });
  }

  /**
   * Registra Movimentação Física/Contábil no Kardex (Entrada ou Saída/Consumo) em transação ACID única:
   * 1. Recalcula o Custo Médio Ponderado Móvel (CMPM) e atualiza o saldo do SKU;
   * 2. Registra o movimento na Ficha Kardex (inv_movements);
   * 3. Efetiva Lançamento Contábil de Partidas Dobradas (Estoque Ativo vs CMV/Consumo na DRE).
   */
  async recordStockMovement(input: {
    companyCode: string;
    itemId: string;
    movementType: 'INBOUND_PURCHASE' | 'OUTBOUND_REQUISITION' | 'BRANCH_TRANSFER';
    quantity: number;
    unitCost?: number;
    referenceDocument?: string;
    notes?: string;
    context?: TenantExecutionContext;
  }) {
    if (input.context) {
      CoreSecurityPolicy.assertPermissionAndScope(input.context, 'inventory:movement:execute');
    }

    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: input.itemId },
      include: { company: true },
    });
    if (!item) {
      throw new Error('Material / SKU não localizado no almoxarifado.');
    }

    if (input.context) {
      CoreSecurityPolicy.assertTenantAndCompanyIsolation(
        input.context,
        item.tenantId,
        item.companyId
      );
    }

    if (input.companyCode && item.company && item.company.code !== input.companyCode) {
      throw new Error(
        `FORBIDDEN_CROSS_COMPANY_ACCESS: Tentativa bloqueada de movimentar material (${item.id}) pertencente à empresa ${item.company.code} a partir do contexto ${input.companyCode}.`
      );
    }

    const company = item.company;
    const calc = InventoryService.calculateMovingAverageMovement({
      currentQty: Number(item.quantityOnHand),
      currentAvgCost: Number(item.averageUnitCost),
      reorderPoint: Number(item.reorderPoint),
      movementType: input.movementType,
      quantity: input.quantity,
      inboundUnitCost: input.unitCost,
    });

    const actor = input.context
      ? { id: input.context.userId }
      : await this.prisma.user.findFirst({
          where: { tenantId: company.tenantId },
          orderBy: { createdAt: 'asc' },
        });
    if (!actor) {
      throw new Error('Usuário operador não localizado.');
    }

    let stockAssetAccount = await this.prisma.chartOfAccount.findFirst({
      where: { companyId: company.id, nature: 'ASSET', isAnalytical: true },
    });
    if (!stockAssetAccount) {
      stockAssetAccount = await this.prisma.chartOfAccount.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          code: '1.1.03.001',
          name: 'Estoques de Materiais, Equipamentos e Insumos',
          nature: 'ASSET',
          isAnalytical: true,
        },
      });
    }

    let cmvExpenseAccount = await this.prisma.chartOfAccount.findFirst({
      where: { companyId: company.id, nature: 'EXPENSE', isAnalytical: true },
    });
    if (!cmvExpenseAccount) {
      cmvExpenseAccount = await this.prisma.chartOfAccount.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          code: '3.1.03.001',
          name: 'CMV e Consumo Interno de Materiais de Almoxarifado',
          nature: 'EXPENSE',
          isAnalytical: true,
        },
      });
    }

    let supplierLiabilityAccount = await this.prisma.chartOfAccount.findFirst({
      where: { companyId: company.id, nature: 'LIABILITY', isAnalytical: true },
    });
    if (!supplierLiabilityAccount) {
      supplierLiabilityAccount = await this.prisma.chartOfAccount.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          code: '2.1.02.001',
          name: 'Fornecedores / Entradas de Estoque a Faturar',
          nature: 'LIABILITY',
          isAnalytical: true,
        },
      });
    }

    const refDoc =
      input.referenceDocument ||
      `${input.movementType === 'INBOUND_PURCHASE' ? 'NFE-ENT' : 'REQ-ALM'}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;
    const today = new Date();

    return this.prisma.$transaction(async (tx) => {
      // 1. Atualiza o Saldo Físico e Custo Médio Ponderado do Item
      const updatedItem = await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          quantityOnHand: calc.resultingQtyOnHand,
          averageUnitCost: calc.resultingAvgCost,
          totalStockValue: calc.resultingTotalStockValue,
        },
      });

      // 2. Contabiliza a Movimentação de Estoque no Livro Diário / DRE
      const lastEntry = await tx.journalEntry.findFirst({
        where: { companyId: company.id },
        orderBy: { entryNumber: 'desc' },
      });
      const nextEntryNumber = (lastEntry?.entryNumber ?? 1000) + 1;

      const isInbound = input.movementType === 'INBOUND_PURCHASE';
      const debitAccId = isInbound ? stockAssetAccount.id : cmvExpenseAccount.id;
      const creditAccId = isInbound ? supplierLiabilityAccount.id : stockAssetAccount.id;

      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          entryNumber: nextEntryNumber,
          competenceDate: today,
          postingDate: today,
          originModule: 'INVENTORY',
          originReferenceId: item.id,
          description: `Kardex ${input.movementType} (${refDoc}) — ${calc.quantity} ${item.unit} de ${item.sku} @ R$ ${calc.appliedUnitCost.toFixed(
            2
          )}`,
          status: 'POSTED',
          totalDebit: calc.totalMovementValue,
          totalCredit: calc.totalMovementValue,
          idempotencyKey: `INV-JE-${company.code}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          createdById: actor.id,
          lines: {
            create: [
              {
                chartOfAccountId: debitAccId,
                memo: isInbound
                  ? `Entrada em Estoque ${item.sku} (${refDoc})`
                  : `Baixa CMV / Requisição Interna ${item.sku} (${refDoc})`,
                debitAmount: calc.totalMovementValue,
                creditAmount: 0,
              },
              {
                chartOfAccountId: creditAccId,
                memo: isInbound
                  ? `Contrapartida Entrada Física ${item.sku}`
                  : `Saída de Almoxarifado pelo Custo Médio ${item.sku}`,
                debitAmount: 0,
                creditAmount: calc.totalMovementValue,
              },
            ],
          },
        },
      });

      // 3. Registra Movimento na Ficha Kardex
      const movement = await tx.stockMovement.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          itemId: item.id,
          movementType: input.movementType,
          quantity: calc.quantity,
          unitCost: calc.appliedUnitCost,
          totalMovementValue: calc.totalMovementValue,
          resultingQtyOnHand: calc.resultingQtyOnHand,
          resultingAvgCost: calc.resultingAvgCost,
          referenceDocument: refDoc,
          notes: input.notes || `Movimentação Kardex (${input.movementType})`,
          linkedJournalEntryId: journalEntry.id,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          userId: actor.id,
          moduleCode: 'INVENTORY',
          action: 'RECORD_KARDEX_MOVEMENT',
          entityName: 'StockMovement',
          entityId: movement.id,
          previousValues: {
            quantityOnHand: Number(item.quantityOnHand),
            averageUnitCost: Number(item.averageUnitCost),
          },
          newValues: {
            movementType: input.movementType,
            quantity: calc.quantity,
            resultingQtyOnHand: calc.resultingQtyOnHand,
            resultingAvgCost: calc.resultingAvgCost,
            journalEntryNumber: journalEntry.entryNumber,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: company.tenantId,
          companyId: company.id,
          aggregateType: 'StockMovement',
          aggregateId: movement.id,
          eventType: 'inventory.kardex.moved',
          payload: {
            sku: item.sku,
            movementType: input.movementType,
            quantity: calc.quantity,
            totalMovementValue: calc.totalMovementValue,
            resultingQtyOnHand: calc.resultingQtyOnHand,
            belowReorderPoint: calc.belowReorderPoint,
          },
          status: 'PUBLISHED',
          processedAt: new Date(),
        },
      });

      return {
        movement,
        updatedItem,
        calculation: calc,
        journalEntry,
      };
    });
  }

  /**
   * Retorna resumo consolidado do Módulo 08 (Estoque, Custo Médio e Ficha Kardex).
   */
  async getInventorySummary(companyCode: string, context?: TenantExecutionContext) {
    if (context) {
      CoreSecurityPolicy.assertPermissionAndScope(context, 'inventory:item:read');
    }

    const company = context
      ? await this.prisma.company.findFirst({
          where: { id: context.companyId, tenantId: context.tenantId },
        })
      : await this.prisma.company.findFirst({
          where: { code: companyCode },
        });
    if (!company) {
      throw new Error(`Empresa ${companyCode} não localizada.`);
    }

    if (context) {
      CoreSecurityPolicy.assertTenantAndCompanyIsolation(context, company.tenantId, company.id);
      if (companyCode && company.code !== companyCode) {
        throw new Error(
          `FORBIDDEN_CROSS_COMPANY_ACCESS: Tentativa bloqueada de consultar estoque da empresa ${companyCode} fora do contexto autorizado (${company.code}).`
        );
      }
    }

    const [items, movements] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: { tenantId: company.tenantId, companyId: company.id },
        orderBy: { sku: 'asc' },
      }),
      this.prisma.stockMovement.findMany({
        where: { tenantId: company.tenantId, companyId: company.id },
        include: { item: true },
        orderBy: { occurredAt: 'desc' },
        take: 15,
      }),
    ]);

    const totalStockValuation = roundCurrency(
      items.reduce((acc, i) => acc + Number(i.totalStockValue), 0)
    );
    const totalUnitsOnHand = roundCurrency(
      items.reduce((acc, i) => acc + Number(i.quantityOnHand), 0)
    );
    const belowReorderItems = items.filter(
      (i) => Number(i.quantityOnHand) <= Number(i.reorderPoint)
    );

    return {
      kpis: {
        skusCount: items.length,
        totalUnitsOnHand,
        totalStockValuation,
        belowReorderCount: belowReorderItems.length,
        movementsCount: movements.length,
      },
      items: items.map((i) => ({
        id: i.id,
        sku: i.sku,
        name: i.name,
        category: i.category,
        unit: i.unit,
        warehouseLocation: i.warehouseLocation,
        quantityOnHand: Number(i.quantityOnHand),
        reorderPoint: Number(i.reorderPoint),
        averageUnitCost: Number(i.averageUnitCost),
        totalStockValue: Number(i.totalStockValue),
        belowReorderPoint: Number(i.quantityOnHand) <= Number(i.reorderPoint),
      })),
      movements: movements.map((m) => ({
        id: m.id,
        sku: m.item.sku,
        itemName: m.item.name,
        movementType: m.movementType,
        quantity: Number(m.quantity),
        unitCost: Number(m.unitCost),
        totalMovementValue: Number(m.totalMovementValue),
        resultingQtyOnHand: Number(m.resultingQtyOnHand),
        resultingAvgCost: Number(m.resultingAvgCost),
        referenceDocument: m.referenceDocument,
        occurredAt: m.occurredAt,
      })),
    };
  }
}
