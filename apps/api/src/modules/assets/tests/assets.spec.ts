import { describe, it, expect } from 'vitest';
import { AssetsService } from '../services/assets.service';

describe('Módulo 09 — Patrimônio e Ativo Imobilizado (Depreciação Linear CPC 27)', () => {
  it('deve calcular a quota mensal de depreciação linear deduzindo o valor residual da base depreciável', () => {
    // Aquisição: R$ 240.000,00 | Valor Residual: R$ 24.000,00 -> Base Depreciável = R$ 216.000,00
    // Vida útil: 60 meses (20% a.a.) -> Quota mensal = R$ 3.600,00
    const res = AssetsService.calculateMonthlyDepreciationQuota({
      acquisitionValue: 240000,
      residualValue: 24000,
      usefulLifeMonths: 60,
      accumulatedDepreciation: 36000,
    });

    expect(res.depreciableBase).toBe(216000);
    expect(res.annualRatePct).toBe(20);
    expect(res.standardMonthlyQuota).toBe(3600);
    expect(res.appliedQuota).toBe(3600);
    expect(res.accumulatedAfterRun).toBe(39600);
    expect(res.netBookValueAfterRun).toBe(200400);
    expect(res.isFullyDepreciated).toBe(false);
  });

  it('deve limitar a última quota de depreciação para nunca reduzir o Valor Contábil Líquido abaixo do Valor Residual', () => {
    const res = AssetsService.calculateMonthlyDepreciationQuota({
      acquisitionValue: 100000,
      residualValue: 10000,
      usefulLifeMonths: 60, // Quota normal = 90.000 / 60 = 1.500
      accumulatedDepreciation: 89200, // Restam apenas R$ 800,00 depreciáveis
    });

    expect(res.standardMonthlyQuota).toBe(1500);
    expect(res.appliedQuota).toBe(800);
    expect(res.accumulatedAfterRun).toBe(90000);
    expect(res.netBookValueAfterRun).toBe(10000);
    expect(res.isFullyDepreciated).toBe(true);
  });
});
