/**
 * ============================================================================
 * ENTERPRISE ERP — TESTES AUTOMATIZADOS: MÓDULOS 12 A 16
 * (CONTRATOS, SAC, MARKETING, BI & DOCUMENTOS ICP-BRASIL)
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import { EnterpriseOpsService } from '../services/enterprise-ops.service';

describe('Módulos 12 a 16 — Contratos (IGPM/IPCA), SAC, Marketing (ROAS/CAC), BI & Documentos', () => {
  const service = new EnterpriseOpsService({} as any);

  it('deve calcular corretamente o reajuste anual composto de contrato pelo IGPM/IPCA', () => {
    const res = service.calculateContractReadjustment(25000, 6.5, 0);
    expect(res.previousMonthlyVal).toBe(25000);
    expect(res.deltaAmount).toBe(1625);
    expect(res.newMonthlyVal).toBe(26625);
    expect(res.newAccumulatedPct).toBe(6.5);
  });

  it('deve calcular corretamente ROAS, ROI (%) e CAC de uma campanha de marketing', () => {
    const res = service.calculateCampaignMetrics(20000, 160000, 8);
    expect(res.roasMultiplier).toBe(8);
    expect(res.roiPct).toBe(700);
    expect(res.cacAmount).toBe(2500);
  });

  it('deve rejeitar reajuste de contrato com índice negativo', () => {
    expect(() => service.calculateContractReadjustment(25000, -2, 0)).toThrow(
      /ENTERPRISE_CONTRACT_ERROR/
    );
  });
});
