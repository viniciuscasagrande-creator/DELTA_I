import { describe, it, expect } from 'vitest';
import { CrmService } from '../services/crm.service';

describe('Módulo 06 — Comercial e CRM (Precificação, Política de Desconto, Comissões e Forecast)', () => {
  it('deve calcular valor líquido, comissão do vendedor e forecast ponderado com precisão decimal', () => {
    const pricing = CrmService.calculateProposalPricing({
      grossAmount: 140000,
      discountAmount: 10000,
      commissionRatePct: 5,
      probabilityPct: 80,
    });

    expect(pricing.grossAmount).toBe(140000);
    expect(pricing.discountAmount).toBe(10000);
    expect(pricing.discountPct).toBe(7.14);
    expect(pricing.netAmount).toBe(130000);
    expect(pricing.commissionAmount).toBe(6500);
    expect(pricing.weightedForecastAmount).toBe(104000);
  });

  it('deve bloquear propostas comerciais com desconto superior ao teto de política comercial (30%)', () => {
    expect(() =>
      CrmService.calculateProposalPricing({
        grossAmount: 100000,
        discountAmount: 35000,
        commissionRatePct: 5,
      })
    ).toThrow(/excede o limite de política comercial/);
  });
});
