/**
 * ============================================================================
 * ENTERPRISE ERP — TESTES AUTOMATIZADOS: MÓDULOS 10 & 11 (VENDAS E PAGAMENTOS)
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import { SalesAndPaymentsService } from '../services/sales-payments.service';

describe('Módulos 10 & 11 — Vendas, Faturamento, Gateways PIX/Cartão e MDR', () => {
  const service = new SalesAndPaymentsService({} as any);

  it('deve calcular corretamente a taxa MDR de PIX Instantâneo (0,89%) e valor líquido', () => {
    const result = service.calculateGatewaySettlement(10000, 'PIX_INSTANT', 1);
    expect(result.grossAmount).toBe(10000);
    expect(result.mdrRatePct).toBe(0.89);
    expect(result.mdrFeeAmount).toBe(89);
    expect(result.netSettledAmount).toBe(9911);
  });

  it('deve calcular corretamente a taxa MDR de Cartão de Crédito Parcelado (3x) com escalonamento', () => {
    const result = service.calculateGatewaySettlement(20000, 'CREDIT_CARD_INSTALLMENTS', 3);
    // 2.99 + (3-1)*0.35 = 3.69%
    expect(result.mdrRatePct).toBe(3.69);
    expect(result.mdrFeeAmount).toBe(738);
    expect(result.netSettledAmount).toBe(19262);
  });

  it('deve rejeitar transação de gateway com valor bruto zerado ou negativo', () => {
    expect(() => service.calculateGatewaySettlement(0, 'PIX_INSTANT', 1)).toThrow(
      /ENTERPRISE_PAYMENTS_ERROR/
    );
  });
});
