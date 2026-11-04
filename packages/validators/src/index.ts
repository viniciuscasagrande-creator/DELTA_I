// ============================================================================
// @delta-erp/validators — VALIDADORES COMPARTILHADOS (DOCUMENTOS, VALORES, DATAS)
// ============================================================================

export function isValidCnpjOrCpf(rawTaxId: string): boolean {
  const digits = rawTaxId.replace(/\D/g, '');
  return digits.length === 11 || digits.length === 14;
}

export function assertPositiveCurrency(amount: number, fieldName: string): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`O campo monetário "${fieldName}" deve ser um valor numérico estritamente positivo.`);
  }
}

export function assertBalancedJournalLines(
  lines: Array<{ debitAmount: number; creditAmount: number }>
): void {
  if (!lines || lines.length < 2) {
    throw new Error('Um lançamento contábil de partidas dobradas exige no mínimo 2 linhas.');
  }
  const totalDebitCents = lines.reduce((acc, l) => acc + Math.round(l.debitAmount * 100), 0);
  const totalCreditCents = lines.reduce((acc, l) => acc + Math.round(l.creditAmount * 100), 0);

  if (totalDebitCents !== totalCreditCents || totalDebitCents <= 0) {
    throw new Error(
      `Partida dobrada inválida: Total Débito (${(totalDebitCents / 100).toFixed(2)}) difere do Total Crédito (${(totalCreditCents / 100).toFixed(2)}).`
    );
  }
}
