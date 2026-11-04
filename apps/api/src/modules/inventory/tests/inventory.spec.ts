import { describe, it, expect } from 'vitest';
import { InventoryService } from '../services/inventory.service';

describe('Módulo 08 — Estoque e Inventário (Custo Médio Ponderado Móvel e Ficha Kardex)', () => {
  it('deve recalcular o Custo Médio Ponderado Móvel (CMPM) em entradas de compra e baixar pelo custo médio nas requisições', () => {
    // Saldo inicial: 10 unidades @ R$ 1.000,00 = R$ 10.000,00
    // Entrada de compra: +10 unidades @ R$ 1.500,00 = R$ 15.000,00 -> Novo Custo Médio = R$ 1.250,00 (20 un = R$ 25.000,00)
    const inbound = InventoryService.calculateMovingAverageMovement({
      currentQty: 10,
      currentAvgCost: 1000,
      reorderPoint: 5,
      movementType: 'INBOUND_PURCHASE',
      quantity: 10,
      inboundUnitCost: 1500,
    });

    expect(inbound.resultingQtyOnHand).toBe(20);
    expect(inbound.resultingAvgCost).toBe(1250);
    expect(inbound.resultingTotalStockValue).toBe(25000);
    expect(inbound.belowReorderPoint).toBe(false);

    // Saída por requisição interna: -16 unidades -> Deve sair pelo Custo Médio de R$ 1.250,00 (= R$ 20.000,00) e restar 4 un (abaixo do ponto de pedido = 5)
    const outbound = InventoryService.calculateMovingAverageMovement({
      currentQty: inbound.resultingQtyOnHand,
      currentAvgCost: inbound.resultingAvgCost,
      reorderPoint: 5,
      movementType: 'OUTBOUND_REQUISITION',
      quantity: 16,
    });

    expect(outbound.appliedUnitCost).toBe(1250);
    expect(outbound.totalMovementValue).toBe(20000);
    expect(outbound.resultingQtyOnHand).toBe(4);
    expect(outbound.resultingTotalStockValue).toBe(5000);
    expect(outbound.belowReorderPoint).toBe(true);
  });

  it('deve bloquear saídas de almoxarifado que gerem saldo físico negativo (INSUFFICIENT_STOCK)', () => {
    expect(() =>
      InventoryService.calculateMovingAverageMovement({
        currentQty: 6,
        currentAvgCost: 14500,
        reorderPoint: 2,
        movementType: 'OUTBOUND_REQUISITION',
        quantity: 8,
      })
    ).toThrow(/INSUFFICIENT_STOCK/);
  });
});
