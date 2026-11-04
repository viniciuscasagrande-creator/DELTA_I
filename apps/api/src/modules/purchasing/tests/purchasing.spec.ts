import { describe, it, expect } from 'vitest';
import { PurchasingService } from '../services/purchasing.service';

describe('Módulo 07 — Compras e Suprimentos (Mapa Comparativo de 3 Cotações e Saving)', () => {
  it('deve validar a menor cotação, apurar o Saving negociado e somar o frete ao total do PO', () => {
    const result = PurchasingService.evaluateQuotationMap({
      quote1Amount: 42000,
      quote2Amount: 46500,
      quote3Amount: 48900,
      freightAmount: 850,
    });

    expect(result.lowestQuoteAmount).toBe(42000);
    expect(result.highestQuoteAmount).toBe(48900);
    expect(result.negotiatedSavings).toBe(6900);
    expect(result.savingsPct).toBe(14.11);
    expect(result.totalAmount).toBe(42850);
  });

  it('deve rejeitar a emissão de Pedido de Compra quando a cotação escolhida não for a menor do mapa comparativo', () => {
    expect(() =>
      PurchasingService.evaluateQuotationMap({
        quote1Amount: 52000,
        quote2Amount: 45000,
        quote3Amount: 49000,
      })
    ).toThrow(/Política de Compras: A cotação selecionada/);
  });
});
