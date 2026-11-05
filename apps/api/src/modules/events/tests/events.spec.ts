import { describe, it, expect } from 'vitest';
import { EventsService } from '../services/events.service';
import {
  EventApprovalStatus,
  EventPublicationStatus,
  EventSalesStatus,
  EventRealizationStatus,
  formatTicketNumber,
} from '@delta-erp/shared';

describe('Módulo de Eventos & Ingressos (ERP DiskIngressos)', () => {
  it('deve formatar o número do ingresso rigorosamente com 8 dígitos numéricos com zeros à esquerda', () => {
    expect(formatTicketNumber(1)).toBe('00000001');
    expect(formatTicketNumber(42)).toBe('00000042');
    expect(formatTicketNumber(88410)).toBe('00088410');
    expect(formatTicketNumber('12345678')).toBe('12345678');
    expect(formatTicketNumber('invalid_text')).toBe('00000000');
  });

  it('deve aplicar as regras das 4 dimensões de estado (vendas não abrem sem aprovação)', () => {
    // 1. Tentar abrir vendas em evento em rascunho deve ser rejeitado
    expect(() => {
      EventsService.validateStateTransition(
        {
          approvalStatus: EventApprovalStatus.DRAFT,
          publicationStatus: EventPublicationStatus.UNPUBLISHED,
          salesStatus: EventSalesStatus.NOT_OPEN,
          realizationStatus: EventRealizationStatus.SCHEDULED,
        },
        { salesStatus: EventSalesStatus.OPEN }
      );
    }).toThrowError(/EVENT_SALES_NOT_ALLOWED/);

    // 2. Permitir abrir vendas após o evento ser aprovado
    const valid = EventsService.validateStateTransition(
      {
        approvalStatus: EventApprovalStatus.APPROVED,
        publicationStatus: EventPublicationStatus.PUBLISHED,
        salesStatus: EventSalesStatus.NOT_OPEN,
        realizationStatus: EventRealizationStatus.SCHEDULED,
      },
      { salesStatus: EventSalesStatus.OPEN }
    );
    expect(valid.salesStatus).toBe(EventSalesStatus.OPEN);

    // 3. Cancelamento do evento fecha vendas imediatamente
    const cancelled = EventsService.validateStateTransition(valid, {
      realizationStatus: EventRealizationStatus.CANCELLED,
    });
    expect(cancelled.salesStatus).toBe(EventSalesStatus.CLOSED);
  });

  it('deve emitir ingressos com número de 8 dígitos e credencial criptográfica segura (HMAC-SHA256)', () => {
    const tickets = EventsService.generateTickets({
      eventId: 'evt-rock-2026',
      eventName: 'Curitiba Rock Fest 2026',
      batchId: 'batch-01',
      batchName: 'Lote 1 Pista',
      sectorName: 'Pista Premium',
      quantity: 3,
      faceValue: 200.0,
      convenienceFeeValue: 30.0,
      buyerName: 'Eduardo Silveira',
      buyerTaxId: '123.456.789-00',
      buyerEmail: 'eduardo@teste.com.br',
      paymentMethod: 'PIX',
      startSequenceNumber: 1,
      hmacSecret: 'test-secret-salt-2026',
    });

    expect(tickets).toHaveLength(3);

    // Verifica formatação rigorosa de 8 dígitos
    expect(tickets[0].ticketNumber).toBe('00000001');
    expect(tickets[1].ticketNumber).toBe('00000002');
    expect(tickets[2].ticketNumber).toBe('00000003');

    // Verifica credencial de acesso criptográfica para a catraca (hex SHA-256 de 64 chars)
    expect(tickets[0].validationHash).toHaveLength(64);
    expect(tickets[0].validationHash).not.toBe(tickets[1].validationHash);

    // Valores financeiros do ingresso
    expect(tickets[0].faceValue).toBe(200.0);
    expect(tickets[0].convenienceFeeValue).toBe(30.0);
    expect(tickets[0].totalPaid).toBe(230.0);
    expect(tickets[0].status).toBe('ISSUED');
  });

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
