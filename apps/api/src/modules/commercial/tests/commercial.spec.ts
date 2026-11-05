import { describe, it, expect, vi } from 'vitest';
import { CommercialService } from '../services/commercial.service';
import { TenantExecutionContext } from '@delta-erp/shared';

describe('Módulo 03: CommercialService (ERP DiskIngressos)', () => {
  const mockContext: TenantExecutionContext = {
    requestId: 'req-comm-01',
    tenantId: 'tenant-delta-01',
    companyId: 'comp-emp-01',
    userId: 'user-sales-01',
    userEmail: 'comercial@diskingressos.com.br',
    userType: 'INTERNAL',
    roleCode: 'COMMERCIAL_MANAGER',
    permissions: ['commercial:contract:create', 'commercial:contract:read'],
    maxApprovalAmount: 500000,
    allowedCostCenterIds: ['CC-COMERCIAL'],
  };

  const mockPrisma: any = {};
  const mockAuditService: any = {
    record: vi.fn().mockResolvedValue(undefined),
  };

  it('deve calcular corretamente o forecast comercial (GMV, conveniência percentual, taxa fixa e comissão)', () => {
    const result = CommercialService.calculateCommercialPricing({
      expectedCapacity: 10000,
      estimatedTicketAverage: 150.0,
      convenienceFeeRatePct: 15.0,
      convenienceFeeFixedPerTicket: 2.0,
      commissionRatePct: 5.0,
    });

    expect(result.estimatedGmv).toBe(1500000.0); // 10.000 * 150 = 1.500.000
    expect(result.conveniencePercentRevenue).toBe(225000.0); // 15% de 1.500.000
    expect(result.convenienceFixedRevenue).toBe(20000.0); // 10.000 * 2.00
    expect(result.totalConvenienceRevenue).toBe(245000.0); // 225.000 + 20.000
    expect(result.commissionAmount).toBe(12250.0); // 5% de 245.000
  });

  it('deve BLOQUEAR sumariamente qualquer tentativa do Comercial de configurar Spread, Rebate ou Antecipação', () => {
    expect(() => {
      CommercialService.assertSecurityBoundary({
        expectedCapacity: 5000,
        estimatedTicketAverage: 100,
        convenienceFeeRatePct: 12,
        spreadRate: 2.5, // Campo restrito do Financeiro!
      });
    }).toThrowError(/FORBIDDEN_SCOPE_COMMERCIAL.*Spread.*Rebate.*Adiantamentos/);

    expect(() => {
      CommercialService.assertSecurityBoundary({
        rebatePct: 3.0, // Campo restrito do Financeiro!
      });
    }).toThrowError(/FORBIDDEN_SCOPE_COMMERCIAL/);

    expect(() => {
      CommercialService.assertSecurityBoundary({
        advanceRequested: 50000, // Campo restrito do Financeiro!
      });
    }).toThrowError(/FORBIDDEN_SCOPE_COMMERCIAL/);
  });

  it('deve rejeitar taxas de conveniência fora da política comercial permitida (> 35%)', () => {
    expect(() => {
      CommercialService.calculateCommercialPricing({
        expectedCapacity: 5000,
        estimatedTicketAverage: 100,
        convenienceFeeRatePct: 40.0, // Acima de 35%
      });
    }).toThrowError(/fora da política permitida/);
  });

  it('deve registrar contrato comercial com sucesso e auditar na trilha forense', async () => {
    const service = new CommercialService(mockPrisma, mockAuditService);

    const contract = await service.createContract(mockContext, {
      code: 'CTR-2026-TEST',
      eventName: 'Festival de Primavera 2026',
      eventCategory: 'FESTIVAL',
      producerId: 'prod-001',
      producerLegalName: 'Live Entretenimento S.A.',
      producerTaxId: '11.222.333/0001-44',
      startDate: '2026-11-20',
      endDate: '2026-11-21',
      venueName: 'Pedreira Paulo Leminski',
      venueCity: 'Curitiba / PR',
      expectedCapacity: 12000,
      estimatedTicketAverage: 180,
      convenienceFeeRatePct: 14.0,
      convenienceFeeFixedPerTicket: 0,
      exclusivityType: 'TOTAL_EXCLUSIVITY',
      salesChannels: ['ONLINE_ECOMMERCE', 'BOX_OFFICE_PDV'],
      accountExecutive: 'Lucas Marcondes',
    });

    expect(contract.id).toBeDefined();
    expect(contract.estimatedGmv).toBe(2160000);
    expect(contract.estimatedConvenienceRevenue).toBe(302400);
    expect(mockAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        entityName: 'CommercialContract',
      })
    );
  });
});
