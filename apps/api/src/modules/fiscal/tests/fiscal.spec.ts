import { describe, it, expect } from 'vitest';
import { FiscalService } from '../services/fiscal.service';

describe('Módulo 04: Fiscal & Tributário — Cálculo de Tributos Próprios e Retenções na Fonte (IRRF + PCC 4,65%)', () => {
  it('deve calcular com precisão IRRF (1,5%) e PCC/CSRF (4,65%) em NFS-e de serviço tomado', () => {
    const result = FiscalService.calculateTaxesAndWithholdings({
      grossAmount: 20000.0,
      issPct: 5.0,
      pisPct: 0.65,
      cofinsPct: 3.0,
      irrfPct: 1.5,
      csllPct: 1.0,
      icmsPct: 0,
      withholdTaxes: true,
    });

    expect(result.irrfRetained).toBe(300.0); // 1,5% de 20.000
    expect(result.pccRetained).toBe(930.0);  // 4,65% de 20.000
    expect(result.totalRetainedAmount).toBe(1230.0);
    expect(result.netInvoiceAmount).toBe(18770.0); // 20.000 - 1.230
  });

  it('deve calcular impostos próprios sem retenção quando withholdTaxes = false', () => {
    const result = FiscalService.calculateTaxesAndWithholdings({
      grossAmount: 10000.0,
      issPct: 5.0,
      pisPct: 1.65,
      cofinsPct: 7.6,
      irrfPct: 0,
      csllPct: 0,
      icmsPct: 0,
      withholdTaxes: false,
    });

    expect(result.issAmount).toBe(500.0);
    expect(result.pisAmount).toBe(165.0);
    expect(result.cofinsAmount).toBe(760.0);
    expect(result.totalOwnTaxes).toBe(1425.0);
    expect(result.totalRetainedAmount).toBe(0);
    expect(result.netInvoiceAmount).toBe(10000.0);
  });

  it('deve gerar chave de acesso válida de 44 dígitos para documentos fiscais', () => {
    const key = FiscalService.generateAccessKey('NFE', '12.345.678/0001-90');
    expect(key).toHaveLength(44);
    expect(key.startsWith('35')).toBe(true);
  });
});
