import { describe, it, expect } from 'vitest';
import { EventsService } from '../services/events.service';

describe('Extensão de Eventos & Portal do Produtor — Cálculo de Borderô e Split Contábil', () => {
  it('deve apurar com exatidão o saldo líquido disponível para repasse ao produtor', () => {
    const balance = EventsService.calculateProducerAvailableBalance({
      grossTicketSales: 250000.0,
      totalAcquirerFees: 4250.5,
      totalChargebacks: 1200.0,
      totalAdvanced: 50000.0,
      totalPaidOut: 40000.0,
    });

    expect(balance).toBe(154549.5);
  });
});
