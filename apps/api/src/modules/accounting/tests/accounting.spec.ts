import { describe, it, expect } from 'vitest';
import { assertBalancedJournalLines } from '@delta-erp/validators';

describe('Módulo 03: Contabilidade — Invariantes de Partidas Dobradas e DRE', () => {
  it('deve validar com sucesso um lançamento contábil onde Débito == Crédito', () => {
    expect(() =>
      assertBalancedJournalLines([
        { debitAmount: 15420.55, creditAmount: 0 },
        { debitAmount: 0, creditAmount: 10000.0 },
        { debitAmount: 0, creditAmount: 5420.55 },
      ])
    ).not.toThrow();
  });

  it('deve rejeitar lançamento contábil desbalanceado (Débito != Crédito)', () => {
    expect(() =>
      assertBalancedJournalLines([
        { debitAmount: 1000.0, creditAmount: 0 },
        { debitAmount: 0, creditAmount: 999.99 },
      ])
    ).toThrow(/Partida dobrada inválida/);
  });

  it('deve rejeitar lançamento com menos de 2 linhas', () => {
    expect(() =>
      assertBalancedJournalLines([{ debitAmount: 500, creditAmount: 500 }])
    ).toThrow(/exige no mínimo 2 linhas/);
  });
});
