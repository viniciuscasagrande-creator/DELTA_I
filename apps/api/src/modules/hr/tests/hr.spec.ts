import { describe, it, expect } from 'vitest';
import { HrService } from '../services/hr.service';

describe('Módulo 05: Recursos Humanos (RH) — Cálculo de Folha CLT, Encargos (FGTS/INSS) e IRRF', () => {
  it('deve calcular corretamente salário líquido CLT, INSS teto, IRRF com dependentes e custo empresa', () => {
    const res = HrService.calculateEmployeePayroll({
      baseSalary: 10000.0,
      benefitsAmount: 1500.0,
      dependentsCount: 1,
      contractType: 'CLT',
    });

    expect(res.grossSalary).toBe(10000.0);
    expect(res.inssEmployeeDiscount).toBe(908.85); // Teto INSS segurado
    expect(res.fgtsEmployerAmount).toBe(800.0);    // 8% FGTS
    expect(res.inssEmployerAmount).toBe(2000.0);   // 20% INSS Patronal
    expect(res.irrfEmployeeDiscount).toBeGreaterThan(1500);
    expect(res.netSalary).toBeLessThan(7600);
    expect(res.totalCompanyCost).toBe(14300.0);    // 10.000 + 1.500 + 800 + 2.000
  });

  it('deve isentar encargos trabalhistas diretos quando modalidade contratual for PJ', () => {
    const res = HrService.calculateEmployeePayroll({
      baseSalary: 12000.0,
      benefitsAmount: 0,
      contractType: 'PJ',
    });

    expect(res.inssEmployeeDiscount).toBe(0);
    expect(res.irrfEmployeeDiscount).toBe(0);
    expect(res.fgtsEmployerAmount).toBe(0);
    expect(res.netSalary).toBe(12000.0);
  });
});
