// ============================================================================
// @delta-erp/ui — DESIGN SYSTEM TOKENS (MODERNO: FUNDO CLARO & CARDS MINIMALISTAS)
// ============================================================================

export const deltaModernTheme = {
  name: 'DELTA Modern Light',
  colors: {
    canvas: '#F8FAFC',       // Slate 50 — Fundo claro suave da aplicação
    surface: '#FFFFFF',      // Branco puro — Cards minimalistas e tabelas
    surfaceSubtle: '#F1F5F9',// Slate 100 — Cabeçalhos de tabela e hover suave
    border: '#E2E8F0',       // Slate 200 — Bordas finas de 1px
    textPrimary: '#0F172A',  // Slate 900 — Alto contraste para leitura
    textSecondary: '#475569',// Slate 600 — Labels e metadados
    textMuted: '#94A3B8',    // Slate 400 — Placeholders
    brand: {
      primary: '#4F46E5',    // Indigo 600
      primaryHover: '#4338CA',
      softBg: '#EEF2FF',     // Indigo 50
      softBorder: '#C7D2FE', // Indigo 200
    },
    status: {
      successText: '#047857',
      successBg: '#ECFDF5',
      warningText: '#B45309',
      warningBg: '#FFFBEB',
      dangerText: '#BE123C',
      dangerBg: '#FFF1F2',
      infoText: '#0369A1',
      infoBg: '#F0F9FF',
    },
  },
  radius: {
    card: '12px',
    button: '8px',
    badge: '9999px',
  },
  shadows: {
    minimalCard: '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
    elevatedCard: '0 4px 12px -2px rgba(15, 23, 42, 0.06)',
  },
} as const;
