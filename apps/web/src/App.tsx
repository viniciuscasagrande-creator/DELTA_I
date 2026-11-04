import React, { useEffect, useState, useCallback } from 'react';
import { formatBRL } from '@delta-erp/shared';

const API_BASE = 'http://localhost:3000/api';

type ActiveTab =
  | 'foundation'
  | 'identity'
  | 'multicompany'
  | 'rbac'
  | 'financial'
  | 'accounting'
  | 'fiscal'
  | 'hr'
  | 'crm'
  | 'purchasing'
  | 'inventory'
  | 'assets'
  | 'sales_payments'
  | 'enterprise_ops'
  | 'events'
  | 'audit';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('foundation');
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string>('EMP-01');
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>('FINANCIAL_MANAGER');
  const [health, setHealth] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Core Identity state
  const [loginEmail, setLoginEmail] = useState('admin@deltaerp.com.br');
  const [loginPassword, setLoginPassword] = useState('Delta@2026');
  const [authSession, setAuthSession] = useState<any>(null);
  const [totpInput, setTotpInput] = useState('');
  const [recoveryResult, setRecoveryResult] = useState<any>(null);

  // Multiempresa form states
  const [newBranchCode, setNewBranchCode] = useState('FIL-BH-03');
  const [newBranchName, setNewBranchName] = useState('Filial Belo Horizonte — Savassi');
  const [newBranchCity, setNewBranchCity] = useState('Belo Horizonte');
  const [newBranchState, setNewBranchState] = useState('MG');

  const [newCostCenterCode, setNewCostCenterCode] = useState('CC-500');
  const [newCostCenterName, setNewCostCenterName] = useState('Inovação & Inteligência Artificial');

  // Financial & Workflow form state
  const [supplierName, setSupplierName] = useState('Oracle Cloud Infrastructure Brasil');
  const [grossAmount, setGrossAmount] = useState('32500');
  const [workflowNotes, setWorkflowNotes] = useState('Aprovado conforme orçamento da diretoria');

  // Events & Producer Portal form state
  const [ticketQuantity, setTicketQuantity] = useState('4');
  const [payoutAmount, setPayoutAmount] = useState('25000');
  const [isAdvancePayout, setIsAdvancePayout] = useState(true);

  // Módulo 04 Fiscal & Tributário form state
  const [selectedTaxRuleId, setSelectedTaxRuleId] = useState<string>('');
  const [fiscalCounterpartyName, setFiscalCounterpartyName] = useState('Datacenter Brasil Telecom S.A.');
  const [fiscalCounterpartyTaxId, setFiscalCounterpartyTaxId] = useState('33.444.555/0001-77');
  const [fiscalGrossAmount, setFiscalGrossAmount] = useState('20000');

  // Módulo 05 RH, Folha & eSocial form state
  const [empCode, setEmpCode] = useState('MAT-2026-004');
  const [empName, setEmpName] = useState('Camila Andrade Rocha');
  const [empCpf, setEmpCpf] = useState('458.712.369-10');
  const [empRoleTitle, setEmpRoleTitle] = useState('Especialista Contábil Tributária Sênior');
  const [empDepartment, setEmpDepartment] = useState('Controladoria & Fiscal');
  const [empContractType, setEmpContractType] = useState<'CLT' | 'PJ'>('CLT');
  const [empBaseSalary, setEmpBaseSalary] = useState('11200');
  const [empBenefits, setEmpBenefits] = useState('1450');
  const [empDependents, setEmpDependents] = useState('1');
  const [payrollCompetence, setPayrollCompetence] = useState('2026-11');

  // Módulo 06 Comercial & CRM form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [crmCustomerCode, setCrmCustomerCode] = useState('CLI-0005');
  const [crmCustomerName, setCrmCustomerName] = useState('Hospitalar Santa Clara S.A.');
  const [crmCustomerTaxId, setCrmCustomerTaxId] = useState('54.321.987/0001-65');
  const [crmCustomerCreditLimit, setCrmCustomerCreditLimit] = useState('450000');

  const [oppTitle, setOppTitle] = useState('Suite ERP Cloud + Módulo Contábil/Fiscal Multi-Unidades');
  const [oppSalesperson, setOppSalesperson] = useState('Henrique Vasconcelos — Executivo Enterprise');
  const [oppGrossAmount, setOppGrossAmount] = useState('120000');
  const [oppDiscountAmount, setOppDiscountAmount] = useState('10000');
  const [oppCommissionPct, setOppCommissionPct] = useState('5');

  // Módulo 07 Compras & Suprimentos form state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [purSupplierCode, setPurSupplierCode] = useState('FOR-0005');
  const [purSupplierName, setPurSupplierName] = useState('Cisco Systems Brasil Redes & Segurança Ltda');
  const [purSupplierTaxId, setPurSupplierTaxId] = useState('11.222.333/0001-44');
  const [purSupplierRating, setPurSupplierRating] = useState('9.7');

  const [poDescription, setPoDescription] = useState('Switches Core 100GbE + Licenças Firewall Zero-Trust');
  const [poQuote1, setPoQuote1] = useState('34500');
  const [poQuote2, setPoQuote2] = useState('38900');
  const [poQuote3, setPoQuote3] = useState('41200');
  const [poFreight, setPoFreight] = useState('650');

  // Módulo 08 Estoque & Inventário form state
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [invMovementType, setInvMovementType] = useState<'INBOUND_PURCHASE' | 'OUTBOUND_REQUISITION' | 'BRANCH_TRANSFER'>('INBOUND_PURCHASE');
  const [invQuantity, setInvQuantity] = useState('4');
  const [invUnitCost, setInvUnitCost] = useState('15200');
  const [invRefDoc, setInvRefDoc] = useState('NFE-ENT-2026');

  const [newSkuCode, setNewSkuCode] = useState('MAT-SW-100G');
  const [newSkuName, setNewSkuName] = useState('Switch Core Datacenter 100GbE 32 Portas');
  const [newSkuQty, setNewSkuQty] = useState('8');
  const [newSkuReorder, setNewSkuReorder] = useState('3');
  const [newSkuCost, setNewSkuCost] = useState('9400');

  // Módulo 09 Patrimônio & Depreciação form state
  const [assetTagInput, setAssetTagInput] = useState('PAT-2026-0008');
  const [assetNameInput, setAssetNameInput] = useState('Storage All-Flash NVMe 500TB (Replicação Síncrona)');
  const [assetLocationInput, setAssetLocationInput] = useState('Datacenter Matriz São Paulo — Rack B04');
  const [assetAcquisitionValue, setAssetAcquisitionValue] = useState('150000');
  const [assetResidualValue, setAssetResidualValue] = useState('15000');
  const [assetUsefulLifeMonths, setAssetUsefulLifeMonths] = useState('60');
  const [depreciationCompetence, setDepreciationCompetence] = useState('2026-11');

  // Módulos 10 & 11 Vendas & Pagamentos (PIX/Gateways) form state
  const [salesOrderNumber, setSalesOrderNumber] = useState('PV-2026-0002');
  const [salespersonInput, setSalespersonInput] = useState('Marina Costa (Head Enterprise Sales)');
  const [salesQuantity, setSalesQuantity] = useState('2');
  const [salesUnitPrice, setSalesUnitPrice] = useState('42000');
  const [salesDiscount, setSalesDiscount] = useState('2000');

  const [gatewayPaymentMethod, setGatewayPaymentMethod] = useState<'PIX_INSTANT' | 'CREDIT_CARD_1X' | 'CREDIT_CARD_INSTALLMENTS'>('PIX_INSTANT');
  const [gatewayInstallments, setGatewayInstallments] = useState('1');
  const [gatewayGrossAmount, setGatewayGrossAmount] = useState('82000');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
  const [selectedReceivableId, setSelectedReceivableId] = useState<string>('');

  const fetchDashboardData = useCallback(async (companyCode: string) => {
    try {
      const [healthRes, overviewRes] = await Promise.all([
        fetch(`${API_BASE}/health`),
        fetch(`${API_BASE}/foundation/overview?companyCode=${companyCode}`),
      ]);
      const healthJson = await healthRes.json();
      const overviewJson = await overviewRes.json();
      setHealth(healthJson);
      if (overviewJson.success) {
        setOverview(overviewJson.data);
        if (overviewJson.data.fiscalSummary?.taxRules?.length > 0) {
          setSelectedTaxRuleId((prev) => prev || overviewJson.data.fiscalSummary.taxRules[0].id);
        }
        if (overviewJson.data.crmSummary?.customers?.length > 0) {
          setSelectedCustomerId((prev) => prev || overviewJson.data.crmSummary.customers[0].id);
        }
        if (overviewJson.data.purchasingSummary?.suppliers?.length > 0) {
          setSelectedSupplierId((prev) => prev || overviewJson.data.purchasingSummary.suppliers[0].id);
        }
        if (overviewJson.data.inventorySummary?.items?.length > 0) {
          setSelectedItemId((prev) => prev || overviewJson.data.inventorySummary.items[0].id);
        }
        if (overviewJson.data.salesPaymentsSummary?.bankAccounts?.length > 0) {
          setSelectedBankAccountId((prev) => prev || overviewJson.data.salesPaymentsSummary.bankAccounts[0].id);
        }
        if (overviewJson.data.salesPaymentsSummary?.openReceivables?.length > 0) {
          setSelectedReceivableId((prev) => prev || overviewJson.data.salesPaymentsSummary.openReceivables[0].id);
        }
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: `Erro ao conectar na API em ${API_BASE}: ${err?.message || 'Verifique se a API está ativa'}`,
      });
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(selectedCompanyCode);
  }, [selectedCompanyCode, fetchDashboardData]);

  // 1. Core Identity Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/core/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          companyCode: selectedCompanyCode,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || 'Falha no login');
      setAuthSession(json.data);
      setTotpInput(json.data.demoCurrentTotpCode || '');
      setActionMessage({
        type: 'success',
        text: `Login autenticado (${json.data.user.email})! Sessão ${json.data.sessionId} criada e JWT HS256 emitido.`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authSession?.sessionId) return;
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/core/auth/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: authSession.sessionId,
          totpCode: totpInput,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || 'Falha no MFA');
      setAuthSession({
        ...authSession,
        mfaRequired: false,
        accessToken: json.data.accessToken,
      });
      setActionMessage({
        type: 'success',
        text: 'Segundo fator TOTP MFA (RFC 6238) validado! Sessão elevada para mfaVerified=true.',
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handlePasswordRecovery = async () => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/core/auth/password-recovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      setRecoveryResult(json.data);
      setActionMessage({
        type: 'success',
        text: `Token temporário de recuperação gerado para ${json.data.email} (expira em ${json.data.expiresInMinutes} min).`,
      });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/core/auth/sessions/${sessionId}/revoke`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      setActionMessage({
        type: 'success',
        text: `Sessão ${sessionId} revogada imediatamente.`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // 2. Multiempresa & Feature Flag Handlers
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/core/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          roleCode: selectedRoleCode,
          code: newBranchCode,
          name: newBranchName,
          city: newBranchCity,
          state: newBranchState,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      setActionMessage({
        type: 'success',
        text: `Filial ${json.data.code} (${json.data.name}) criada na empresa ${selectedCompanyCode}!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleCreateCostCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/core/cost-centers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          roleCode: selectedRoleCode,
          code: newCostCenterCode,
          name: newCostCenterName,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      setActionMessage({
        type: 'success',
        text: `Centro de Custo ${json.data.code} (${json.data.name}) criado com sucesso!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleToggleModule = async (moduleCode: string, currentEnabled: boolean) => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/core/modules/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          roleCode: selectedRoleCode,
          moduleCode,
          isEnabled: !currentEnabled,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      setActionMessage({
        type: 'success',
        text: `Módulo ${moduleCode} ${!currentEnabled ? 'ATIVADO' : 'DESATIVADO'} para a empresa ${selectedCompanyCode}.`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // 3. RBAC / ABAC Handler
  const handleUpdateRoleLimit = async (roleId: string, newLimit: number) => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/core/roles/${roleId}/approval-limit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          roleCode: selectedRoleCode,
          maxApprovalAmount: newLimit,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      setActionMessage({
        type: 'success',
        text: `Alçada ABAC do perfil ${json.data.name} atualizada para ${formatBRL(json.data.maxApprovalAmount)}!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // 4. Financial, Treasury & Workflow Handlers
  const handleCreatePayable = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/financial/payables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          roleCode: selectedRoleCode,
          supplierName,
          supplierTaxId: '18.765.432/0001-99',
          description: `Provisão Contábil/Financeira (${selectedCompanyCode})`,
          grossAmount: Number(grossAmount),
          taxRetainedAmount: Math.round(Number(grossAmount) * 0.0465 * 100) / 100,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      setActionMessage({
        type: 'success',
        text: `Título ${json.data.documentNumber} criado e enviado para o Motor de Workflow!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleDecideWorkflow = async (workflowId: string, decision: 'APPROVED' | 'REJECTED') => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/core/workflows/${workflowId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          roleCode: selectedRoleCode,
          decision,
          decisionNotes: workflowNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      setActionMessage({
        type: 'success',
        text: `Workflow ${decision === 'APPROVED' ? 'APROVADO' : 'REJEITADO'} pelo perfil ${selectedRoleCode}!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleSettlePayable = async (payableId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/financial/payables/${payableId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleCode: selectedRoleCode,
          paymentMethod: 'PIX',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      setActionMessage({
        type: 'success',
        text: `Baixa bancária executada! Saldo da Conta Corrente atualizado e Lançamento Contábil de Partidas Dobradas gerado automaticamente.`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // 5. Events & Producer Portal Handlers
  const handleRecordTicketSale = async (eventId: string, ticketBatchId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/ticket-sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketBatchId,
          quantity: Number(ticketQuantity || 2),
          paymentMethod: 'PIX',
          buyerName: 'Comprador Bilheteria PIX',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      const b = json.data.saleBreakdown;
      setActionMessage({
        type: 'success',
        text: `Venda de ${b.quantity} ingressos registrada! Face (${formatBRL(
          b.faceTotal
        )}) creditada em Custódia do Produtor e Taxa (${formatBRL(
          b.serviceFeeTotal
        )}) reconhecida como Receita da Operadora.`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleRequestProducerPayout = async (eventId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/payout-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedAmount: Number(payoutAmount),
          isAdvancePayout,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      setActionMessage({
        type: 'success',
        text: `Solicitação de ${
          isAdvancePayout ? 'Antecipação de Recebíveis' : 'Repasse de Borderô'
        } criada! Valor líquido a transferir: ${formatBRL(
          Number(json.data.settlement.netPayoutAmount)
        )}. Título gerado em Contas a Pagar e Workflow da EMP-02.`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // 6. Módulo 04 Fiscal & Tributário Handler
  const handleCreateFiscalDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    const ruleId = selectedTaxRuleId || overview?.fiscalSummary?.taxRules?.[0]?.id;
    if (!ruleId) return;
    try {
      const res = await fetch(`${API_BASE}/fiscal/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          roleCode: selectedRoleCode,
          taxRuleId: ruleId,
          counterpartyName: fiscalCounterpartyName,
          counterpartyTaxId: fiscalCounterpartyTaxId,
          grossAmount: Number(fiscalGrossAmount),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      const { fiscalDoc, breakdown } = json.data;
      setActionMessage({
        type: 'success',
        text: `Documento Fiscal ${fiscalDoc.documentNumber} (${fiscalDoc.model}) autorizado! Retenções na fonte: ${formatBRL(
          breakdown.totalRetainedAmount
        )} | Líquido: ${formatBRL(
          breakdown.netInvoiceAmount
        )}. Integrado ao Financeiro, Workflow e Contabilidade!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // 7. Módulo 05 RH, Folha de Pagamento & eSocial Handlers
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/hr/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          roleCode: selectedRoleCode,
          code: empCode,
          fullName: empName,
          cpf: empCpf,
          email: `${empCode.toLowerCase()}@deltaerp.com.br`,
          roleTitle: empRoleTitle,
          department: empDepartment,
          contractType: empContractType,
          baseSalary: Number(empBaseSalary),
          benefitsAmount: Number(empBenefits),
          dependentsCount: Number(empDependents),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      setActionMessage({
        type: 'success',
        text: `Colaborador ${json.data.fullName} (${json.data.code}) admitido com evento eSocial S-2200 (${json.data.esocialId})!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleProcessMonthlyPayroll = async () => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/hr/payroll/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          roleCode: selectedRoleCode,
          competenceMonth: payrollCompetence,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      const t = json.data.totals;
      setActionMessage({
        type: 'success',
        text: `Folha ${json.data.competenceMonth} fechada (eSocial S-1200/S-1210)! Líquido: ${formatBRL(
          t.totalNetSalary
        )} | Encargos Patronais: ${formatBRL(
          t.totalFgts + t.totalEmployerInss
        )}. Título gerado em Contas a Pagar + Lançamento Contábil na DRE!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // 8. Módulo 06 Comercial & CRM Handlers
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/crm/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          roleCode: selectedRoleCode,
          code: crmCustomerCode,
          legalName: crmCustomerName,
          tradeName: crmCustomerName,
          taxId: crmCustomerTaxId,
          email: `contato@${crmCustomerCode.toLowerCase()}.com.br`,
          segment: 'ENTERPRISE',
          creditLimit: Number(crmCustomerCreditLimit),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      setSelectedCustomerId(json.data.id);
      setActionMessage({
        type: 'success',
        text: `Cliente ${json.data.legalName} (${json.data.code}) cadastrado com limite de crédito de ${formatBRL(
          Number(json.data.creditLimit)
        )}!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    const customerId = selectedCustomerId || overview?.crmSummary?.customers?.[0]?.id;
    if (!customerId) return;
    try {
      const res = await fetch(`${API_BASE}/crm/opportunities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          roleCode: selectedRoleCode,
          customerId,
          title: oppTitle,
          salespersonName: oppSalesperson,
          stage: 'NEGOTIATION',
          probabilityPct: 75,
          grossAmount: Number(oppGrossAmount),
          discountAmount: Number(oppDiscountAmount),
          commissionRatePct: Number(oppCommissionPct),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      const { opportunity, pricing } = json.data;
      setActionMessage({
        type: 'success',
        text: `Oportunidade ${opportunity.code} criada no funil! Líquido: ${formatBRL(
          pricing.netAmount
        )} | Comissão (${pricing.commissionRatePct}%): ${formatBRL(pricing.commissionAmount)}.`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleWinOpportunity = async (oppId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/crm/opportunities/${oppId}/win`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleCode: selectedRoleCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      const { opportunity, receivable, commissionPayable } = json.data;
      setActionMessage({
        type: 'success',
        text: `Proposta ${opportunity.code} FECHADA (GANHA)! Conta a Receber (${receivable.documentNumber}: ${formatBRL(
          Number(receivable.netAmount)
        )}) + Comissão (${commissionPayable.documentNumber}: ${formatBRL(
          Number(commissionPayable.netAmount)
        )}) + Receita Contábil na DRE geradas!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // 9. Módulo 07 Compras & Suprimentos Handlers
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/purchasing/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          code: purSupplierCode,
          legalName: purSupplierName,
          tradeName: purSupplierName,
          taxId: purSupplierTaxId,
          email: `suprimentos@${purSupplierCode.toLowerCase()}.com.br`,
          category: 'NETWORK_SECURITY',
          ratingScore: Number(purSupplierRating),
          paymentTermsDays: 30,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      setSelectedSupplierId(json.data.id);
      setActionMessage({
        type: 'success',
        text: `Fornecedor ${json.data.legalName} (${json.data.code}) homologado com Nota ISO/SLA ${Number(
          json.data.ratingScore
        ).toFixed(2)}!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleCreatePurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    const supplierId = selectedSupplierId || overview?.purchasingSummary?.suppliers?.[0]?.id;
    if (!supplierId) return;
    try {
      const res = await fetch(`${API_BASE}/purchasing/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          supplierId,
          description: poDescription,
          quote1Amount: Number(poQuote1),
          quote2Amount: Number(poQuote2),
          quote3Amount: Number(poQuote3),
          freightAmount: Number(poFreight),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      const { purchaseOrder, quotation } = json.data;
      setActionMessage({
        type: 'success',
        text: `Pedido de Compra ${purchaseOrder.code} emitido! Total: ${formatBRL(
          quotation.totalAmount
        )} | Saving apurado nas 3 cotações: ${formatBRL(
          quotation.negotiatedSavings
        )} (${quotation.savingsPct}%). Enviado ao Workflow!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleReceivePurchaseOrder = async (poId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/purchasing/orders/${poId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleCode: selectedRoleCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      const { purchaseOrder, payable, journalEntry } = json.data;
      setActionMessage({
        type: 'success',
        text: `Pedido de Compra ${purchaseOrder.code} aprovado pela alçada ${selectedRoleCode} e recebido! Título ${payable.documentNumber} (${formatBRL(
          Number(payable.netAmount)
        )}) criado em Contas a Pagar + Partida Dobrada #${journalEntry.entryNumber} na DRE!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // 10. Módulo 08 Estoque & Inventário Handlers
  const handleCreateInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/inventory/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          sku: newSkuCode,
          name: newSkuName,
          category: 'DATACENTER_NETWORK',
          unit: 'UN',
          warehouseLocation: 'ALM-CENTRAL-SP',
          quantityOnHand: Number(newSkuQty),
          reorderPoint: Number(newSkuReorder),
          averageUnitCost: Number(newSkuCost),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      setSelectedItemId(json.data.id);
      setActionMessage({
        type: 'success',
        text: `Material ${json.data.sku} (${json.data.name}) cadastrado no almoxarifado com saldo contábil de ${formatBRL(
          Number(json.data.totalStockValue)
        )}!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleRecordStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    const itemId = selectedItemId || overview?.inventorySummary?.items?.[0]?.id;
    if (!itemId) return;
    try {
      const res = await fetch(`${API_BASE}/inventory/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          itemId,
          movementType: invMovementType,
          quantity: Number(invQuantity),
          unitCost: invMovementType === 'INBOUND_PURCHASE' ? Number(invUnitCost) : undefined,
          referenceDocument: invRefDoc,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      const { calculation, journalEntry } = json.data;
      setActionMessage({
        type: 'success',
        text: `Movimentação Kardex (${calculation.movementType}) registrada! Novo Saldo: ${
          calculation.resultingQtyOnHand
        } UN | Novo Custo Médio (CMPM): ${formatBRL(
          calculation.resultingAvgCost
        )} | Lançamento Contábil #${journalEntry.entryNumber} na DRE!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // 11. Módulo 09 Patrimônio & Depreciação Handlers
  const handleRegisterFixedAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/assets/fixed-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          assetTag: assetTagInput,
          name: assetNameInput,
          category: 'DATACENTER_STORAGE',
          locationName: assetLocationInput,
          acquisitionValue: Number(assetAcquisitionValue),
          residualValue: Number(assetResidualValue),
          usefulLifeMonths: Number(assetUsefulLifeMonths),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      const { asset, quotaPreview } = json.data;
      setActionMessage({
        type: 'success',
        text: `Bem Imobilizado ${asset.assetTag} (${asset.name}) tombado! Quota Mensal Linear CPC 27: ${formatBRL(
          quotaPreview.standardMonthlyQuota
        )} (${quotaPreview.annualRatePct}% a.a.).`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleRunMonthlyDepreciation = async () => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/assets/depreciation/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          competenceMonth: depreciationCompetence,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      const d = json.data;
      setActionMessage({
        type: 'success',
        text: `Depreciação Linear Mensal (${d.competenceMonth}) processada para ${
          d.assetsDepreciatedCount
        } bens! Despesa Contabilizada na DRE: ${formatBRL(
          d.totalDepreciationExpense
        )} (Diário #${d.journalEntry.entryNumber}).`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // 12. Módulos 10 & 11 Vendas & Pagamentos (PIX/Gateways) Handlers
  const handleCreateSalesOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    const customerId = selectedCustomerId || overview?.salesPaymentsSummary?.customers?.[0]?.id;
    const itemId = selectedItemId || overview?.salesPaymentsSummary?.inventoryItems?.[0]?.id;
    if (!customerId) return;
    try {
      const res = await fetch(`${API_BASE}/sales/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          customerId,
          inventoryItemId: itemId,
          orderNumber: salesOrderNumber,
          salespersonName: salespersonInput,
          quantity: Number(salesQuantity),
          unitPrice: Number(salesUnitPrice),
          discountAmount: Number(salesDiscount),
          commissionRatePct: 5,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      const { salesOrder, receivable, grossMarginAmount } = json.data;
      setActionMessage({
        type: 'success',
        text: `Pedido de Venda ${salesOrder.orderNumber} faturado e expedido! Recebível ${
          receivable.documentNumber
        } (${formatBRL(Number(salesOrder.netAmount))}) | CMV Baixado: ${formatBRL(
          Number(salesOrder.cmvAmount)
        )} | Margem Líquida: ${formatBRL(grossMarginAmount)}.`,
      });
      setSalesOrderNumber(`PV-2026-000${Math.floor(3 + Math.random() * 90)}`);
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleCaptureGatewayPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    const bankAccountId =
      selectedBankAccountId || overview?.salesPaymentsSummary?.bankAccounts?.[0]?.id;
    if (!bankAccountId) return;
    try {
      const res = await fetch(`${API_BASE}/payments/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          receivableId: selectedReceivableId || undefined,
          bankAccountId,
          paymentMethod: gatewayPaymentMethod,
          installments: Number(gatewayInstallments),
          grossAmount: Number(gatewayGrossAmount),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      const { gatewayTx, newBankBalance } = json.data;
      setActionMessage({
        type: 'success',
        text: `Liquidação Gateway (${gatewayTx.paymentMethod}) NSU ${
          gatewayTx.externalNsuCode
        } capturada! MDR (${gatewayTx.mdrRatePct}%): ${formatBRL(
          Number(gatewayTx.mdrFeeAmount)
        )} | Líquido Creditado: ${formatBRL(
          Number(gatewayTx.netSettledAmount)
        )} | Novo Saldo Bancário: ${formatBRL(newBankBalance)}.`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleRegisterChargeback = async (txId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/payments/${txId}/chargeback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          reason: 'Contestação de Portador (Chargeback Código 4837 - Transação em Disputa)',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      setActionMessage({
        type: 'success',
        text: `Disputa de Chargeback registrada para NSU ${json.data.externalNsuCode}!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // 13. Módulos 12 a 16 (Contratos, SAC, Marketing, BI & Documentos ICP-Brasil) Handlers
  const handleReadjustContract = async (contractId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/contracts/${contractId}/readjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyCode: selectedCompanyCode, indexRatePct: 6.5 }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      const { contract, calculation, receivable } = json.data;
      setActionMessage({
        type: 'success',
        text: `Contrato ${contract.contractNumber} reajustado pelo ${contract.readjustmentIndex} (+${
          calculation.indexRatePct
        }%)! Nova Mensalidade: ${formatBRL(calculation.newMonthlyVal)} | Fatura ${
          receivable.documentNumber
        } emitida!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleApproveSacRefund = async (ticketId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/sac/tickets/${ticketId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyCode: selectedCompanyCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      const { ticket, payable } = json.data;
      setActionMessage({
        type: 'success',
        text: `Estorno SAC ${ticket.protocolNumber} aprovado dentro do SLA! Reembolso de ${formatBRL(
          Number(ticket.refundApproved)
        )} gerado em Contas a Pagar (${payable.documentNumber})!`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleRecordMarketingConversion = async (campaignId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/marketing/campaigns/${campaignId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyCode: selectedCompanyCode, saleAmount: 24000 }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      const { campaign, metrics } = json.data;
      setActionMessage({
        type: 'success',
        text: `Nova conversão atribuída à campanha ${campaign.code} (Cupom ${
          campaign.couponCode
        })! ROAS Atualizado: ${metrics.roasMultiplier}x | ROI: ${metrics.roiPct}% | CAC: ${formatBRL(
          metrics.cacAmount
        )}.`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleSignIcpDocument = async () => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/documents/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyCode: selectedCompanyCode,
          title: 'Aditivo Contratual SLA 99,99% & Conformidade LGPD/ISO-27001',
          category: 'CONTRACT_ADDENDUM',
          signerName: 'Roberto Almeida (Diretor Estatutário CFO)',
          signerTaxId: '123.456.789-01',
          certificateType: 'ICP_BRASIL_A3_TOKEN',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message);
      setActionMessage({
        type: 'success',
        text: `Documento ${json.data.documentCode} assinado com Certificado ICP-Brasil A3! Hash SHA-256: ${json.data.sha256Hash.slice(
          0,
          24
        )}...`,
      });
      fetchDashboardData(selectedCompanyCode);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const checklistItems = [
    { label: 'Node.js e npm instalados (Node v24+ / npm v11+)', ok: true },
    { label: 'Banco PostgreSQL online e conectado', ok: health?.checks?.database?.status === 'up' },
    { label: 'Dependências do Monorepo instaladas sem erros', ok: true },
    { label: 'Prisma Client gerado (@prisma/client)', ok: Boolean(overview?.tenant?.id) },
    { label: 'Migration inicial (initial_foundation) aplicada', ok: Boolean(overview?.companies?.length) },
    { label: 'API respondendo em /api/health e /api/health/ready', ok: health?.status === 'ok' },
    { label: 'Dashboard React abrindo no navegador (:5173)', ok: true },
    { label: 'Documentação Swagger acessível em /api/docs', ok: health?.status === 'ok' },
  ];

  const completedChecks = checklistItems.filter((i) => i.ok).length;

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900">
      {/* Sidebar Esquerda */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              Δ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 tracking-tight text-base">ENTERPRISE ERP</h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  v1.4
                </span>
              </div>
              <p className="text-xs text-slate-500">Core + Fin + Contábil + Eventos</p>
            </div>
          </div>

          <div className="p-4">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Módulos Operacionais Ativos
            </p>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('foundation')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'foundation'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>01. Visão Geral & Status</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-mono">
                  {completedChecks}/8
                </span>
              </button>

              <button
                onClick={() => setActiveTab('identity')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'identity'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>02. Identity, Login & MFA</span>
                <span className="text-xs opacity-80 font-mono">JWT+TOTP</span>
              </button>

              <button
                onClick={() => setActiveTab('multicompany')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'multicompany'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>03. Multiempresa & Flags</span>
                <span className="text-xs opacity-80 font-mono">
                  {overview?.branches?.length ?? 0} Filiais
                </span>
              </button>

              <button
                onClick={() => setActiveTab('rbac')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'rbac'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>04. RBAC & Alçadas ABAC</span>
                <span className="text-xs opacity-80 font-mono">
                  {overview?.roles?.length ?? 0} Perfis
                </span>
              </button>

              <button
                onClick={() => setActiveTab('financial')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'financial'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>05. Financeiro & Tesouraria</span>
                <span className="text-xs opacity-80 font-mono">
                  {overview?.payables?.length ?? 0} Títulos
                </span>
              </button>

              <button
                onClick={() => setActiveTab('accounting')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'accounting'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>06. Contabilidade & DRE</span>
                <span className="text-xs opacity-80 font-mono">
                  {overview?.journalEntries?.length ?? 0} Diário
                </span>
              </button>

              <button
                onClick={() => setActiveTab('fiscal')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'fiscal'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>07. Fiscal & Tributário</span>
                <span className="text-xs opacity-80 font-mono">
                  {overview?.fiscalSummary?.documents?.length ?? 0} NF-e
                </span>
              </button>

              <button
                onClick={() => setActiveTab('hr')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'hr'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>08. RH, Folha & eSocial</span>
                <span className="text-xs opacity-80 font-mono">
                  {overview?.hrSummary?.headcount?.active ?? 0} Colab.
                </span>
              </button>

              <button
                onClick={() => setActiveTab('crm')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'crm'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>09. Comercial & CRM</span>
                <span className="text-xs opacity-80 font-mono">
                  {overview?.crmSummary?.opportunities?.length ?? 0} Pipeline
                </span>
              </button>

              <button
                onClick={() => setActiveTab('purchasing')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'purchasing'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>10. Compras & Suprimentos</span>
                <span className="text-xs opacity-80 font-mono">
                  {overview?.purchasingSummary?.orders?.length ?? 0} POs
                </span>
              </button>

              <button
                onClick={() => setActiveTab('inventory')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'inventory'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>11. Estoque & Inventário</span>
                <span className="text-xs opacity-80 font-mono">
                  {overview?.inventorySummary?.items?.length ?? 0} SKUs
                </span>
              </button>

              <button
                onClick={() => setActiveTab('assets')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'assets'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>12. Patrimônio & CPC 27</span>
                <span className="text-xs opacity-80 font-mono">
                  {overview?.assetsSummary?.assets?.length ?? 0} Bens
                </span>
              </button>

              <button
                onClick={() => setActiveTab('sales_payments')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'sales_payments'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>13. Vendas & Pagamentos</span>
                <span className="text-xs opacity-80 font-mono">
                  {overview?.salesPaymentsSummary?.orders?.length ?? 0} PV / PIX
                </span>
              </button>

              <button
                onClick={() => setActiveTab('enterprise_ops')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'enterprise_ops'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>14. Contratos, SAC, Mkt, BI & GED</span>
                <span className="text-xs opacity-80 font-mono">20/20 Mod.</span>
              </button>

              <button
                onClick={() => {
                  setSelectedCompanyCode('EMP-02');
                  setActiveTab('events');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'events'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>13. Eventos & Produtores</span>
                <span className="text-xs opacity-80 font-mono">Borderô</span>
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === 'audit'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>14. Auditoria & Outbox</span>
                <span className="text-xs opacity-80 font-mono">
                  {overview?.auditLogs?.length ?? 0} Logs
                </span>
              </button>
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <a
            href="http://localhost:3000/api/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-xs font-medium text-slate-700 hover:text-blue-700 border border-slate-200 transition"
          >
            <span>📚 Abrir Swagger (/api/docs)</span>
            <span>↗</span>
          </a>
          <a
            href="http://localhost:3000/api/health"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-xs font-medium text-slate-700 hover:text-emerald-700 border border-slate-200 transition"
          >
            <span>🩺 Health Check (/api/health)</span>
            <span className="font-mono text-emerald-600">
              {health?.checks?.database?.latencyMs ? `${health.checks.database.latencyMs}ms` : 'OK'}
            </span>
          </a>
        </div>
      </aside>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar Contextual */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ERP Integrado v1.4
            </span>
            <span className="text-xs text-slate-500">
              Saldo Bancário ({selectedCompanyCode}):{' '}
              <strong className="font-mono text-slate-900">
                {formatBRL(overview?.cashFlow?.currentBankBalance || 0)}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Perfil Operacional (ABAC):</label>
              <select
                value={selectedRoleCode}
                onChange={(e) => setSelectedRoleCode(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="FINANCIAL_MANAGER">FINANCIAL_MANAGER (Alçada R$ 50k)</option>
                <option value="DIRECTOR">DIRECTOR / CFO (Alçada R$ 500k)</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN (Alçada Ilimitada)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Empresa Ativa:</label>
              <select
                value={selectedCompanyCode}
                onChange={(e) => setSelectedCompanyCode(e.target.value)}
                className="text-xs font-semibold bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-blue-800 focus:outline-none focus:border-blue-600"
              >
                {overview?.companies?.map((comp: any) => (
                  <option key={comp.id} value={comp.code}>
                    {comp.code} — {comp.tradeName} ({comp.taxId})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <main className="p-8 space-y-6 max-w-7xl">
          {actionMessage && (
            <div
              className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <span>{actionMessage.text}</span>
              <button onClick={() => setActionMessage(null)} className="text-xs underline ml-4">
                Fechar
              </button>
            </div>
          )}

          {/* KPIs Superiores */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-xs font-medium text-slate-500">Caixa Disponível ({selectedCompanyCode})</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
                {formatBRL(overview?.cashFlow?.currentBankBalance || 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Projetado: {formatBRL(overview?.cashFlow?.projectedBalance || 0)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-xs font-medium text-slate-500">Obrigações em Aberto</p>
              <p className="text-2xl font-bold text-amber-700 mt-1 font-mono tabular-nums">
                {formatBRL(overview?.cashFlow?.openPayablesTotal || 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {overview?.workflows?.filter((w: any) => w.status === 'PENDING').length || 0} alçadas pendentes
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-xs font-medium text-slate-500">Resultado Contábil (DRE)</p>
              <p className="text-2xl font-bold text-blue-700 mt-1 font-mono tabular-nums">
                {formatBRL(overview?.accountingReports?.dre?.netIncome || 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {overview?.journalEntries?.length || 0} partidas dobradas no Diário
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-xs font-medium text-slate-500">Auditoria & Outbox</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {overview?.auditLogs?.length || 0} Registros
              </p>
              <p className="text-xs text-emerald-700 mt-1">Rastreabilidade ACID 100%</p>
            </div>
          </div>

          {/* ABA 01: FUNDAÇÃO */}
          {activeTab === 'foundation' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Status de Engenharia — Fundação + Core + Financeiro + Contábil + Eventos
                    </h2>
                    <p className="text-xs text-slate-500">
                      Verificação automática em tempo real dos serviços e integrações entre módulos
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {completedChecks}/8 CONCLUÍDO
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {checklistItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80"
                    >
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-emerald-600 text-white">
                        ✓
                      </span>
                      <span className="text-xs font-medium text-slate-800">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                <h2 className="text-base font-bold text-slate-900">Integrações Ativas entre Domínios</h2>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <strong className="text-blue-700">Financeiro → Workflow → Tesouraria → Contabilidade:</strong>
                  <p className="text-slate-600 mt-1">
                    Criar uma Conta a Pagar abre instância no Workflow; aprovar libera a baixa; liquidar debita a Conta Bancária e posta automaticamente o lançamento de partidas dobradas no Livro Diário/DRE.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <strong className="text-emerald-700">Eventos → Custódia Contábil → Repasse Produtor:</strong>
                  <p className="text-slate-600 mt-1">
                    Vendas de ingressos separam contabilmente o Valor de Face (Passivo do Produtor) da Taxa de Conveniência (Receita da Operadora).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ABA 02: CORE IDENTITY */}
          {activeTab === 'identity' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Autenticação & MFA (TOTP)</h2>
                  <p className="text-xs text-slate-500">
                    Teste o fluxo completo de Login, emissão de JWT e validação MFA
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">E-mail</label>
                    <select
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                    >
                      <option value="admin@deltaerp.com.br">admin@deltaerp.com.br (MFA Ativo)</option>
                      <option value="financeiro@deltaerp.com.br">financeiro@deltaerp.com.br (Gerente Fin.)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Senha</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition"
                    >
                      Autenticar e Emitir JWT
                    </button>
                    <button
                      type="button"
                      onClick={handlePasswordRecovery}
                      className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                    >
                      Recuperar Senha
                    </button>
                  </div>
                </form>

                {authSession && (
                  <form
                    onSubmit={handleVerifyMfa}
                    className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900">Validação TOTP MFA (6 dígitos)</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white text-blue-700 border border-blue-200">
                        Código atual: {authSession.demoCurrentTotpCode}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={totpInput}
                        onChange={(e) => setTotpInput(e.target.value)}
                        placeholder="000000"
                        className="flex-1 text-xs font-mono border border-blue-200 rounded-lg px-3 py-1.5 bg-white"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-semibold"
                      >
                        Validar MFA
                      </button>
                    </div>
                  </form>
                )}

                {recoveryResult && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                    <p className="font-bold text-amber-900">Token de Recuperação Gerado:</p>
                    <p className="font-mono text-[11px] text-amber-800 break-all mt-1">
                      {recoveryResult.resetToken}
                    </p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900 mb-2">
                    Usuários Cadastrados & Vínculos Multiempresa
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2">Nome / E-mail</th>
                          <th className="py-2">Tipo</th>
                          <th className="py-2">MFA</th>
                          <th className="py-2">Acessos por Empresa (RBAC)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {overview?.users?.map((u: any) => (
                          <tr key={u.id}>
                            <td className="py-3">
                              <p className="font-semibold text-slate-900">{u.fullName}</p>
                              <p className="font-mono text-slate-500">{u.email}</p>
                            </td>
                            <td className="py-3">{u.userType}</td>
                            <td className="py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  u.mfaEnabled
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {u.mfaEnabled ? 'TOTP Ativo' : 'Opcional'}
                              </span>
                            </td>
                            <td className="py-3 space-x-1">
                              {u.companyAccesses?.map((acc: any) => (
                                <span
                                  key={acc.id}
                                  className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[11px]"
                                >
                                  {acc.company.code}: {acc.role.code}
                                </span>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">
                    Sessões Ativas e Controle de Revogação
                  </h3>
                  <div className="space-y-2">
                    {overview?.activeSessions?.map((sess: any) => (
                      <div
                        key={sess.sessionId}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-800">{sess.sessionId}</span>
                          <span className="ml-2 text-slate-600">
                            {sess.email} ({sess.roleCode})
                          </span>
                          <span
                            className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              sess.revokedAt
                                ? 'bg-rose-50 text-rose-700'
                                : sess.mfaVerified
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {sess.revokedAt
                              ? 'REVOGADA'
                              : sess.mfaVerified
                              ? 'MFA VERIFICADO'
                              : 'AGUARDANDO MFA'}
                          </span>
                        </div>
                        {!sess.revokedAt && (
                          <button
                            onClick={() => handleRevokeSession(sess.sessionId)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold"
                          >
                            Revogar Sessão
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 03: MULTIEMPRESA & FEATURE FLAGS */}
          {activeTab === 'multicompany' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
                  <form onSubmit={handleCreateBranch} className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      Nova Filial ({selectedCompanyCode})
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newBranchCode}
                        onChange={(e) => setNewBranchCode(e.target.value)}
                        placeholder="Código"
                        className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                        required
                      />
                      <input
                        type="text"
                        value={newBranchState}
                        onChange={(e) => setNewBranchState(e.target.value)}
                        placeholder="UF"
                        maxLength={2}
                        className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                        required
                      />
                    </div>
                    <input
                      type="text"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="Nome da Filial"
                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                      required
                    />
                    <input
                      type="text"
                      value={newBranchCity}
                      onChange={(e) => setNewBranchCity(e.target.value)}
                      placeholder="Cidade"
                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                      required
                    />
                    <button
                      type="submit"
                      className="w-full py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold"
                    >
                      + Adicionar Filial
                    </button>
                  </form>

                  <form
                    onSubmit={handleCreateCostCenter}
                    className="pt-4 border-t border-slate-100 space-y-3"
                  >
                    <h3 className="text-sm font-bold text-slate-900">
                      Novo Centro de Custo ({selectedCompanyCode})
                    </h3>
                    <input
                      type="text"
                      value={newCostCenterCode}
                      onChange={(e) => setNewCostCenterCode(e.target.value)}
                      placeholder="Código (ex: CC-500)"
                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                      required
                    />
                    <input
                      type="text"
                      value={newCostCenterName}
                      onChange={(e) => setNewCostCenterName(e.target.value)}
                      placeholder="Descrição do Centro de Custo"
                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                      required
                    />
                    <button
                      type="submit"
                      className="w-full py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
                    >
                      + Adicionar Centro de Custo
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-2">
                      Filiais Ativas ({overview?.activeCompany?.tradeName})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {overview?.branches?.map((b: any) => (
                        <div
                          key={b.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between"
                        >
                          <div>
                            <span className="font-mono font-bold text-blue-700">{b.code}</span>
                            <p className="font-semibold text-slate-800 mt-0.5">{b.name}</p>
                          </div>
                          <span className="text-slate-500">
                            {b.city}/{b.state}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 mb-2">
                      Centros de Custo ({overview?.activeCompany?.tradeName})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {overview?.costCenters?.map((cc: any) => (
                        <div
                          key={cc.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                        >
                          <span className="font-mono font-bold text-slate-700">{cc.code}</span>
                          <span className="text-slate-800 font-medium">{cc.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="mb-4">
                  <h2 className="text-base font-bold text-slate-900">
                    Feature Management — Ativação de Módulos por Empresa ({selectedCompanyCode})
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {overview?.modulesCatalog?.map((mod: any) => (
                    <div
                      key={mod.code}
                      className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                        mod.isEnabled
                          ? 'bg-white border-slate-200'
                          : 'bg-slate-100/70 border-slate-200 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono font-bold text-blue-700">
                            #{mod.number} {mod.code}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              mod.isEnabled
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {mod.isEnabled ? 'ATIVO' : 'INATIVO'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{mod.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{mod.description}</p>
                      </div>
                      <button
                        onClick={() => handleToggleModule(mod.code, mod.isEnabled)}
                        className="mt-3 py-1.5 px-3 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700"
                      >
                        {mod.isEnabled ? 'Desativar Módulo' : 'Ativar Módulo'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 04: RBAC & ABAC */}
          {activeTab === 'rbac' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Perfis RBAC & Alçadas Financeiras ABAC
                  </h2>
                  <p className="text-xs text-slate-500">
                    Ajuste a alçada de aprovação de cada perfil para testar as travas ABAC
                  </p>
                </div>
                <div className="space-y-3">
                  {overview?.roles?.map((role: any) => (
                    <div
                      key={role.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{role.name}</span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                            {role.code}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Alçada atual:{' '}
                          <strong className="font-mono text-slate-900">
                            {formatBRL(role.maxApprovalAmount)}
                          </strong>
                        </p>
                      </div>
                      {!role.isSystemRole && (
                        <button
                          onClick={() =>
                            handleUpdateRoleLimit(role.id, role.maxApprovalAmount + 25000)
                          }
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold"
                        >
                          + R$ 25k
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Catálogo de Permissões Granulares (core_permissions)
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Padrão &lt;modulo&gt;:&lt;recurso&gt;:&lt;acao&gt; compartilhado por todo o ERP
                </p>
                <div className="space-y-2">
                  {overview?.permissionsCatalog?.map((perm: any) => (
                    <div
                      key={perm.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-blue-700">{perm.code}</span>
                        <p className="text-slate-600 mt-0.5">{perm.name}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-mono text-[10px]">
                        {perm.moduleCode}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 05: MÓDULO 02 FINANCEIRO, TESOURARIA E WORKFLOW */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              {/* Contas Bancárias & Fluxo de Caixa */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {overview?.cashFlow?.bankAccounts?.map((bank: any) => (
                  <div key={bank.id} className="bg-white p-5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-blue-700">
                        Banco {bank.bankCode} • Ag {bank.agencyNumber}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                        Conta Ativa
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{bank.name}</h3>
                    <p className="text-xl font-bold font-mono text-slate-900 mt-2 tabular-nums">
                      {formatBRL(bank.currentBalance)}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 mt-1">
                      Chave PIX: {bank.pixKey}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <form
                  onSubmit={handleCreatePayable}
                  className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
                >
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Lançar Conta a Pagar ({selectedCompanyCode})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Cria obrigação financeira, retém impostos e abre alçada no Workflow.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Fornecedor</label>
                    <input
                      type="text"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Valor Bruto (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={grossAmount}
                      onChange={(e) => setGrossAmount(e.target.value)}
                      className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Parecer de Alçada (Workflow)
                    </label>
                    <input
                      type="text"
                      value={workflowNotes}
                      onChange={(e) => setWorkflowNotes(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition"
                  >
                    + Registrar Título Financeiro
                  </button>
                </form>

                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 mb-2">
                      Contas a Pagar, Alçadas e Liquidação Bancária ({overview?.activeCompany?.tradeName})
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-2">Documento</th>
                            <th className="py-2">Fornecedor</th>
                            <th className="py-2 text-right">Valor Líquido</th>
                            <th className="py-2">Status</th>
                            <th className="py-2 text-right">Operação ({selectedRoleCode})</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {overview?.payables?.map((p: any) => {
                            const wf = overview?.workflows?.find(
                              (w: any) => w.entityId === p.id && w.status === 'PENDING'
                            );
                            return (
                              <tr key={p.id}>
                                <td className="py-3 font-mono font-semibold text-slate-800">
                                  {p.documentNumber}
                                </td>
                                <td className="py-3 text-slate-700">{p.supplierName}</td>
                                <td className="py-3 text-right font-mono font-bold tabular-nums">
                                  {formatBRL(p.netAmount)}
                                </td>
                                <td className="py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                      p.status === 'PAID'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : p.status === 'APPROVED'
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'bg-amber-50 text-amber-700'
                                    }`}
                                  >
                                    {p.status}
                                  </span>
                                </td>
                                <td className="py-3 text-right space-x-1.5">
                                  {p.status === 'PENDING_APPROVAL' && wf && (
                                    <button
                                      onClick={() => handleDecideWorkflow(wf.id, 'APPROVED')}
                                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold"
                                    >
                                      1. Aprovar Alçada
                                    </button>
                                  )}
                                  {p.status === 'APPROVED' && (
                                    <button
                                      onClick={() => handleSettlePayable(p.id)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                    >
                                      2. Liquidar (PIX + Contabilizar)
                                    </button>
                                  )}
                                  {p.status === 'PAID' && (
                                    <span className="text-emerald-700 font-semibold">
                                      ✓ Liquidado & Contabilizado
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 06: MÓDULO 03 CONTABILIDADE, BALANCETE E DRE */}
          {activeTab === 'accounting' && (
            <div className="space-y-6">
              {/* Resumo DRE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs font-medium text-slate-500">Receita Operacional Bruta (DRE)</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1 font-mono tabular-nums">
                    {formatBRL(overview?.accountingReports?.dre?.grossRevenue || 0)}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs font-medium text-slate-500">Despesas Operacionais (DRE)</p>
                  <p className="text-2xl font-bold text-rose-700 mt-1 font-mono tabular-nums">
                    {formatBRL(overview?.accountingReports?.dre?.operatingExpenses || 0)}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs font-medium text-slate-500">Resultado Líquido do Exercício</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1 font-mono tabular-nums">
                    {formatBRL(overview?.accountingReports?.dre?.netIncome || 0)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Balancete de Verificação */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h2 className="text-base font-bold text-slate-900 mb-1">
                    Balancete de Verificação ({overview?.activeCompany?.tradeName})
                  </h2>
                  <p className="text-xs text-slate-500 mb-4">
                    Saldos apurados por partidas dobradas a partir do Livro Razão
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2">Conta</th>
                          <th className="py-2">Natureza</th>
                          <th className="py-2 text-right">Débitos</th>
                          <th className="py-2 text-right">Créditos</th>
                          <th className="py-2 text-right">Saldo Atual</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {overview?.accountingReports?.trialBalance?.map((row: any) => (
                          <tr key={row.accountId}>
                            <td className="py-2.5">
                              <span className="font-mono font-bold text-blue-700">{row.code}</span>
                              <p className="text-slate-800">{row.name}</p>
                            </td>
                            <td className="py-2.5 font-mono text-[11px]">{row.nature}</td>
                            <td className="py-2.5 text-right font-mono tabular-nums">
                              {formatBRL(row.totalDebit)}
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums">
                              {formatBRL(row.totalCredit)}
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold tabular-nums">
                              {formatBRL(row.netBalance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Livro Diário (Partidas Dobradas) */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h2 className="text-base font-bold text-slate-900 mb-1">
                    Livro Diário — Partidas Dobradas (acc_journal_entries)
                  </h2>
                  <p className="text-xs text-slate-500 mb-4">
                    Lançamentos contábeis automáticos gerados por liquidações financeiras e vendas de ingressos
                  </p>
                  <div className="space-y-3">
                    {overview?.journalEntries?.map((je: any) => (
                      <div
                        key={je.id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-900">
                            Lançamento #{je.entryNumber} — {je.description}
                          </span>
                          <span className="font-mono font-bold text-emerald-700">
                            D = C = {formatBRL(je.totalDebit)}
                          </span>
                        </div>
                        <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-100">
                          {je.lines?.map((line: any) => (
                            <div
                              key={line.id}
                              className="flex items-center justify-between font-mono text-[11px]"
                            >
                              <span className="text-slate-700">
                                {line.chartOfAccount?.code} — {line.chartOfAccount?.name}
                              </span>
                              <span
                                className={
                                  line.debitAmount > 0 ? 'text-blue-700 font-semibold' : 'text-emerald-700 font-semibold'
                                }
                              >
                                {line.debitAmount > 0
                                  ? `D: ${formatBRL(line.debitAmount)}`
                                  : `C: ${formatBRL(line.creditAmount)}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {(!overview?.journalEntries || overview.journalEntries.length === 0) && (
                      <p className="text-xs text-slate-400">
                        Nenhum lançamento contábil registrado nesta empresa ainda. Liquide uma Conta a Pagar ou registre uma venda de ingresso para ver a contabilização automática!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 07: MÓDULO 04 FISCAL E TRIBUTÁRIO (NF-e, NFC-e, NFS-e, RETENÇÕES E SPED) */}
          {activeTab === 'fiscal' && (
            <div className="space-y-6">
              {/* Indicadores de Apuração Fiscal */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs font-medium text-slate-500">Volume Entradas (NF-e / NFS-e)</p>
                  <p className="text-xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
                    {formatBRL(overview?.fiscalSummary?.inboundGrossTotal || 0)}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs font-medium text-slate-500">Volume Saídas / Faturamento</p>
                  <p className="text-xl font-bold text-emerald-700 mt-1 font-mono tabular-nums">
                    {formatBRL(overview?.fiscalSummary?.outboundGrossTotal || 0)}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs font-medium text-slate-500">Tributos Próprios Apurados</p>
                  <p className="text-xl font-bold text-blue-700 mt-1 font-mono tabular-nums">
                    {formatBRL(overview?.fiscalSummary?.totalOwnTaxesDue || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">ISS + PIS + COFINS + ICMS</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs font-medium text-slate-500">Retenções a Recolher (DARF)</p>
                  <p className="text-xl font-bold text-amber-700 mt-1 font-mono tabular-nums">
                    {formatBRL(overview?.fiscalSummary?.totalWithholdingsToCollect || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">IRRF (1,5%) + CSRF/PCC (4,65%)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Formulário de Emissão / Recebimento de Documento Fiscal */}
                <form
                  onSubmit={handleCreateFiscalDocument}
                  className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
                >
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Emitir / Validar Documento Fiscal ({selectedCompanyCode})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Calcula retenções automaticamente e gera títulos no Financeiro + Partidas Dobradas na Contabilidade.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Regra Tributária / Operação Fiscal
                    </label>
                    <select
                      value={selectedTaxRuleId}
                      onChange={(e) => setSelectedTaxRuleId(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                    >
                      {overview?.fiscalSummary?.taxRules?.map((tr: any) => (
                        <option key={tr.id} value={tr.id}>
                          [{tr.direction}] {tr.code} — {tr.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Fornecedor / Tomador (Razão Social)
                    </label>
                    <input
                      type="text"
                      value={fiscalCounterpartyName}
                      onChange={(e) => setFiscalCounterpartyName(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      CNPJ / CPF
                    </label>
                    <input
                      type="text"
                      value={fiscalCounterpartyTaxId}
                      onChange={(e) => setFiscalCounterpartyTaxId(e.target.value)}
                      className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Valor Bruto da Nota (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={fiscalGrossAmount}
                      onChange={(e) => setFiscalGrossAmount(e.target.value)}
                      className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition"
                  >
                    + Escriturar Documento Fiscal
                  </button>
                </form>

                {/* Livro Fiscal de Entradas e Saídas + Obrigações SPED */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-bold text-slate-900 mb-2">
                      Livro de Documentos Fiscais Escriturados (NF-e / NFC-e / NFS-e)
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-2">Documento</th>
                            <th className="py-2">Direção</th>
                            <th className="py-2">Participante</th>
                            <th className="py-2 text-right">Valor Bruto</th>
                            <th className="py-2 text-right">IRRF + PCC Retido</th>
                            <th className="py-2 text-right">Líquido Financeiro</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {overview?.fiscalSummary?.documents?.map((doc: any) => (
                            <tr key={doc.id}>
                              <td className="py-3">
                                <span className="font-mono font-bold text-blue-700">
                                  {doc.documentNumber}
                                </span>
                                <p className="font-mono text-[10px] text-slate-400 truncate max-w-[180px]">
                                  Chave: {doc.accessKey}
                                </p>
                              </td>
                              <td className="py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    doc.direction === 'INBOUND'
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-emerald-50 text-emerald-700'
                                  }`}
                                >
                                  {doc.direction} ({doc.model})
                                </span>
                              </td>
                              <td className="py-3 text-slate-700">{doc.counterpartyName}</td>
                              <td className="py-3 text-right font-mono tabular-nums">
                                {formatBRL(doc.grossAmount)}
                              </td>
                              <td className="py-3 text-right font-mono tabular-nums text-rose-700">
                                - {formatBRL(doc.totalRetainedAmount)}
                              </td>
                              <td className="py-3 text-right font-mono font-bold tabular-nums text-slate-900">
                                {formatBRL(doc.netInvoiceAmount)}
                              </td>
                            </tr>
                          ))}
                          {(!overview?.fiscalSummary?.documents ||
                            overview.fiscalSummary.documents.length === 0) && (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-400">
                                Nenhum documento fiscal escriturado ainda. Utilize o painel ao lado para emitir ou validar uma NF-e / NFS-e!
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Obrigações Acessórias SPED / EFD-Reinf */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-bold text-slate-900 mb-3">
                      Obrigações Acessórias & SPED ({overview?.activeCompany?.taxRegime})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {overview?.fiscalSummary?.spedObligations?.map((ob: any) => (
                        <div
                          key={ob.code}
                          className="p-4 rounded-xl bg-slate-50 border border-slate-200"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-xs text-blue-700">
                              {ob.code}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                              {ob.status}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-800">{ob.name}</p>
                          <p className="text-xs font-mono text-slate-600 mt-2">
                            Base Apurada: <strong>{formatBRL(ob.amountReported)}</strong> (
                            {ob.recordsCount} docs)
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 08: MÓDULO 05 — RECURSOS HUMANOS (RH), FOLHA DE PAGAMENTO & eSOCIAL */}
          {activeTab === 'hr' && (
            <div className="space-y-6">
              {/* Resumo de Headcount, Folha e Encargos */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Quadro de Colaboradores Ativos</p>
                  <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {overview?.hrSummary?.headcount?.active || 0} Colaboradores
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    CLT: {overview?.hrSummary?.headcount?.clt || 0} • PJ:{' '}
                    {overview?.hrSummary?.headcount?.pj || 0}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Salário Base + Benefícios Mensais</p>
                  <p className="text-xl font-bold font-mono text-blue-700 mt-1 tabular-nums">
                    {formatBRL(
                      (overview?.hrSummary?.monthlyEstimate?.baseSalaryTotal || 0) +
                        (overview?.hrSummary?.monthlyEstimate?.benefitsTotal || 0)
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Base: {formatBRL(overview?.hrSummary?.monthlyEstimate?.baseSalaryTotal || 0)}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Folha Líquida Processada</p>
                  <p className="text-xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">
                    {formatBRL(overview?.hrSummary?.processedPayrollTotals?.netSalary || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    INSS/IRRF Retidos:{' '}
                    {formatBRL(
                      (overview?.hrSummary?.processedPayrollTotals?.inssEmployee || 0) +
                        (overview?.hrSummary?.processedPayrollTotals?.irrfEmployee || 0)
                    )}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Custo Total Empresa (Folha + Encargos)</p>
                  <p className="text-xl font-bold font-mono text-amber-700 mt-1 tabular-nums">
                    {formatBRL(overview?.hrSummary?.processedPayrollTotals?.totalCompanyCost || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    FGTS (8%) + INSS Patronal (20%):{' '}
                    {formatBRL(
                      (overview?.hrSummary?.processedPayrollTotals?.fgtsAmount || 0) +
                        (overview?.hrSummary?.processedPayrollTotals?.inssEmployer || 0)
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Formulário de Admissão e Processamento da Folha */}
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Fechamento da Folha Mensal (S-1200 / S-1210)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Calcula INSS/IRRF progressivos, FGTS (8%) e INSS Patronal (20%), gera Título em Contas a Pagar + Workflow e contabiliza na DRE
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={payrollCompetence}
                        onChange={(e) => setPayrollCompetence(e.target.value)}
                        placeholder="YYYY-MM"
                        className="w-32 text-xs font-mono border border-slate-200 rounded-lg px-3 py-2"
                      />
                      <button
                        onClick={handleProcessMonthlyPayroll}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                      >
                        Processar Folha ({payrollCompetence})
                      </button>
                    </div>
                  </div>

                  <form
                    onSubmit={handleCreateEmployee}
                    className="bg-white rounded-xl border border-slate-200 p-6 space-y-3"
                  >
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Admitir Colaborador (eSocial S-2200)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Cadastro de vínculo CLT ou PJ com geração imediata do recibo S-2200
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Matrícula
                        </label>
                        <input
                          type="text"
                          value={empCode}
                          onChange={(e) => setEmpCode(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Regime Contratual
                        </label>
                        <select
                          value={empContractType}
                          onChange={(e) => setEmpContractType(e.target.value as 'CLT' | 'PJ')}
                          className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50"
                        >
                          <option value="CLT">CLT (INSS + IRRF + FGTS)</option>
                          <option value="PJ">Prestador PJ</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        value={empName}
                        onChange={(e) => setEmpName(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          CPF
                        </label>
                        <input
                          type="text"
                          value={empCpf}
                          onChange={(e) => setEmpCpf(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Departamento
                        </label>
                        <input
                          type="text"
                          value={empDepartment}
                          onChange={(e) => setEmpDepartment(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Cargo / Função
                      </label>
                      <input
                        type="text"
                        value={empRoleTitle}
                        onChange={(e) => setEmpRoleTitle(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Salário Base (R$)
                        </label>
                        <input
                          type="number"
                          value={empBaseSalary}
                          onChange={(e) => setEmpBaseSalary(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Benefícios (R$)
                        </label>
                        <input
                          type="number"
                          value={empBenefits}
                          onChange={(e) => setEmpBenefits(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Dependentes IR
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={empDependents}
                          onChange={(e) => setEmpDependents(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition"
                    >
                      Registrar Admissão + Transmitir S-2200
                    </button>
                  </form>
                </div>

                {/* Quadro de Colaboradores, Holerites Calculados e Eventos eSocial */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-bold text-slate-900 mb-3">
                      Quadro de Colaboradores ({selectedCompanyCode})
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-2">Matrícula / Nome</th>
                            <th className="py-2">Cargo / Depto</th>
                            <th className="py-2">Regime</th>
                            <th className="py-2 text-right">Salário Base</th>
                            <th className="py-2 text-right">Benefícios</th>
                            <th className="py-2">Recibo eSocial</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {overview?.hrSummary?.employees?.map((emp: any) => (
                            <tr key={emp.id}>
                              <td className="py-3">
                                <span className="font-mono font-bold text-blue-700">{emp.code}</span>
                                <p className="font-medium text-slate-900">{emp.fullName}</p>
                              </td>
                              <td className="py-3 text-slate-600">
                                <p className="font-medium text-slate-800">{emp.roleTitle}</p>
                                <p className="text-[11px] text-slate-400">{emp.department}</p>
                              </td>
                              <td className="py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    emp.contractType === 'CLT'
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'bg-purple-50 text-purple-700'
                                  }`}
                                >
                                  {emp.contractType}
                                </span>
                              </td>
                              <td className="py-3 text-right font-mono tabular-nums">
                                {formatBRL(emp.baseSalary)}
                              </td>
                              <td className="py-3 text-right font-mono tabular-nums text-emerald-700">
                                {formatBRL(emp.benefitsAmount)}
                              </td>
                              <td className="py-3 font-mono text-[11px] text-slate-500">
                                {emp.esocialId}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Holerites Processados na Folha */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-bold text-slate-900 mb-3">
                      Holerites & Apuração de Encargos da Folha (hr_payroll_runs)
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-2">Competência / Colab.</th>
                            <th className="py-2 text-right">Proventos</th>
                            <th className="py-2 text-right">INSS + IRRF</th>
                            <th className="py-2 text-right">Salário Líquido</th>
                            <th className="py-2 text-right">FGTS + INSS Patr.</th>
                            <th className="py-2 text-right">Custo Empresa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {overview?.hrSummary?.payrollRuns?.map((run: any) => (
                            <tr key={run.id}>
                              <td className="py-2.5">
                                <span className="font-mono font-bold text-blue-700">
                                  {run.competenceMonth}
                                </span>{' '}
                                — <span className="font-medium text-slate-900">{run.employeeName}</span>
                              </td>
                              <td className="py-2.5 text-right font-mono tabular-nums">
                                {formatBRL(run.grossSalary + run.benefitsAmount)}
                              </td>
                              <td className="py-2.5 text-right font-mono tabular-nums text-rose-700">
                                - {formatBRL(run.inssEmployeeAmount + run.irrfAmount)}
                              </td>
                              <td className="py-2.5 text-right font-mono font-bold tabular-nums text-emerald-700">
                                {formatBRL(run.netSalary)}
                              </td>
                              <td className="py-2.5 text-right font-mono tabular-nums text-amber-700">
                                {formatBRL(run.fgtsAmount + run.employerInssAmount)}
                              </td>
                              <td className="py-2.5 text-right font-mono font-bold tabular-nums text-slate-900">
                                {formatBRL(run.totalCompanyCost)}
                              </td>
                            </tr>
                          ))}
                          {(!overview?.hrSummary?.payrollRuns ||
                            overview.hrSummary.payrollRuns.length === 0) && (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-400">
                                Nenhuma folha mensal processada ainda. Clique em "Processar Folha (2026-11)" ao lado para gerar os holerites, o título financeiro e a contabilização!
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 09: MÓDULO 06 — COMERCIAL & CRM (CLIENTES, FUNIL, PROPOSTAS E COMISSÕES) */}
          {activeTab === 'crm' && (
            <div className="space-y-6">
              {/* KPIs do Funil Comercial */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Pipeline em Negociação</p>
                  <p className="text-xl font-bold font-mono text-blue-700 mt-1 tabular-nums">
                    {formatBRL(overview?.crmSummary?.kpis?.pipelineOpenTotal || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {overview?.crmSummary?.kpis?.openOpportunitiesCount || 0} oportunidades abertas
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Forecast Ponderado (Probabilidade)</p>
                  <p className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                    {formatBRL(overview?.crmSummary?.kpis?.weightedForecastTotal || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Clientes ativos: {overview?.crmSummary?.kpis?.customersCount || 0}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Contratos Ganhos & Faturados</p>
                  <p className="text-xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">
                    {formatBRL(overview?.crmSummary?.kpis?.wonRevenueTotal || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {overview?.crmSummary?.kpis?.wonOpportunitiesCount || 0} contratos fechados (CLOSED_WON)
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Comissões Comerciais Apuradas</p>
                  <p className="text-xl font-bold font-mono text-amber-700 mt-1 tabular-nums">
                    {formatBRL(overview?.crmSummary?.kpis?.commissionsTotal || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Integrado a Contas a Pagar & Workflow
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Formulários de Nova Proposta e Novo Cliente */}
                <div className="space-y-6">
                  <form
                    onSubmit={handleCreateOpportunity}
                    className="bg-white rounded-xl border border-slate-200 p-6 space-y-3"
                  >
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Nova Oportunidade / Proposta Comercial
                      </h2>
                      <p className="text-xs text-slate-500">
                        Valida teto de desconto (máx. 30%), limite de crédito do cliente e calcula comissão do executivo
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Cliente Corporativo
                      </label>
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50"
                      >
                        {overview?.crmSummary?.customers?.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.code} — {c.tradeName} (Créd: {formatBRL(c.creditLimit)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Título da Proposta / Escopo
                      </label>
                      <input
                        type="text"
                        value={oppTitle}
                        onChange={(e) => setOppTitle(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Executivo de Contas Responsável
                      </label>
                      <input
                        type="text"
                        value={oppSalesperson}
                        onChange={(e) => setOppSalesperson(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Valor Bruto (R$)
                        </label>
                        <input
                          type="number"
                          value={oppGrossAmount}
                          onChange={(e) => setOppGrossAmount(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Desconto (R$)
                        </label>
                        <input
                          type="number"
                          value={oppDiscountAmount}
                          onChange={(e) => setOppDiscountAmount(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Comissão (%)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={oppCommissionPct}
                          onChange={(e) => setOppCommissionPct(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition"
                    >
                      Registrar Proposta no Funil CRM
                    </button>
                  </form>

                  <form
                    onSubmit={handleCreateCustomer}
                    className="bg-white rounded-xl border border-slate-200 p-6 space-y-3"
                  >
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Cadastrar Cliente & Limite de Crédito
                      </h2>
                      <p className="text-xs text-slate-500">
                        Habilita o cliente para propostas comerciais e faturamento
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Código
                        </label>
                        <input
                          type="text"
                          value={crmCustomerCode}
                          onChange={(e) => setCrmCustomerCode(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          CNPJ / CPF
                        </label>
                        <input
                          type="text"
                          value={crmCustomerTaxId}
                          onChange={(e) => setCrmCustomerTaxId(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Razão Social / Nome Fantasia
                      </label>
                      <input
                        type="text"
                        value={crmCustomerName}
                        onChange={(e) => setCrmCustomerName(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Limite de Crédito Aprovado (R$)
                      </label>
                      <input
                        type="number"
                        value={crmCustomerCreditLimit}
                        onChange={(e) => setCrmCustomerCreditLimit(e.target.value)}
                        className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition"
                    >
                      Cadastrar Cliente Corporativo
                    </button>
                  </form>
                </div>

                {/* Funil de Oportunidades e Carteira de Clientes */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-bold text-slate-900 mb-3">
                      Funil de Oportunidades & Fechamento de Contratos (crm_opportunities)
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-2">Proposta / Cliente</th>
                            <th className="py-2">Estágio</th>
                            <th className="py-2 text-right">Valor Líquido</th>
                            <th className="py-2 text-right">Comissão</th>
                            <th className="py-2 text-right">Ação Comercial</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {overview?.crmSummary?.opportunities?.map((opp: any) => (
                            <tr key={opp.id}>
                              <td className="py-3">
                                <span className="font-mono font-bold text-blue-700">
                                  {opp.code}
                                </span>{' '}
                                <span className="font-semibold text-slate-800">
                                  — {opp.customerName}
                                </span>
                                <p className="text-slate-600 mt-0.5">{opp.title}</p>
                                <p className="text-[11px] text-slate-400">
                                  Executivo: {opp.salespersonName}
                                </p>
                              </td>
                              <td className="py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    opp.stage === 'CLOSED_WON'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-amber-50 text-amber-700'
                                  }`}
                                >
                                  {opp.stage} ({opp.probabilityPct}%)
                                </span>
                              </td>
                              <td className="py-3 text-right font-mono font-bold tabular-nums text-slate-900">
                                {formatBRL(opp.netAmount)}
                              </td>
                              <td className="py-3 text-right font-mono tabular-nums text-amber-700">
                                {formatBRL(opp.commissionAmount)} ({opp.commissionRatePct}%)
                              </td>
                              <td className="py-3 text-right">
                                {opp.stage !== 'CLOSED_WON' ? (
                                  <button
                                    onClick={() => handleWinOpportunity(opp.id)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition"
                                  >
                                    ✓ Fechar & Faturar
                                  </button>
                                ) : (
                                  <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                                    Faturado (DRE+Fin)
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-bold text-slate-900 mb-3">
                      Carteira de Clientes & Limites de Crédito (crm_customers)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {overview?.crmSummary?.customers?.map((c: any) => (
                        <div
                          key={c.id}
                          className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono font-bold text-xs text-blue-700">
                              {c.code}
                            </span>
                            <p className="text-xs font-bold text-slate-900 mt-0.5">{c.tradeName}</p>
                            <p className="text-[11px] text-slate-500">CNPJ: {c.taxId}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500">Limite de Crédito</p>
                            <p className="text-xs font-mono font-bold text-emerald-700">
                              {formatBRL(c.creditLimit)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 10: MÓDULO 07 — COMPRAS & SUPRIMENTOS (FORNECEDORES, 3 COTAÇÕES, SAVING E PEDIDOS PO) */}
          {activeTab === 'purchasing' && (
            <div className="space-y-6">
              {/* KPIs de Compras & Suprimentos */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Fornecedores Homologados (ISO/SLA)</p>
                  <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {overview?.purchasingSummary?.kpis?.homologatedSuppliersCount || 0} Homologados
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Score mínimo de compliance: 6.0 / 10
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Pedidos Aguardando Alçada (PO)</p>
                  <p className="text-xl font-bold font-mono text-amber-700 mt-1 tabular-nums">
                    {formatBRL(overview?.purchasingSummary?.kpis?.pendingOrdersTotal || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {overview?.purchasingSummary?.kpis?.pendingOrdersCount || 0} pedidos pendentes no Workflow
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Saving Negociado (Mapa 3 Cotações)</p>
                  <p className="text-xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">
                    {formatBRL(overview?.purchasingSummary?.kpis?.totalNegotiatedSavings || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Economia real vs. maior proposta concorrente
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Pedidos Recebidos & Contabilizados</p>
                  <p className="text-xl font-bold font-mono text-blue-700 mt-1 tabular-nums">
                    {formatBRL(overview?.purchasingSummary?.kpis?.receivedOrdersTotal || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {overview?.purchasingSummary?.kpis?.receivedOrdersCount || 0} POs integrados ao Financeiro/DRE
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Formulários de Novo Pedido de Compra (3 Cotações) e Homologação de Fornecedor */}
                <div className="space-y-6">
                  <form
                    onSubmit={handleCreatePurchaseOrder}
                    className="bg-white rounded-xl border border-slate-200 p-6 space-y-3"
                  >
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Emitir Pedido de Compra (Mapa de 3 Cotações)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Exige escolha da menor cotação homologada, calcula o Saving e abre alçada no Workflow
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Fornecedor Vencedor Homologado
                      </label>
                      <select
                        value={selectedSupplierId}
                        onChange={(e) => setSelectedSupplierId(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50"
                      >
                        {overview?.purchasingSummary?.suppliers?.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.code} — {s.tradeName} (SLA: {s.ratingScore}/10)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Objeto da Requisição / Especificação Técnica
                      </label>
                      <input
                        type="text"
                        value={poDescription}
                        onChange={(e) => setPoDescription(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-emerald-700 mb-1">
                          Cotação 1 Vencedora (R$)
                        </label>
                        <input
                          type="number"
                          value={poQuote1}
                          onChange={(e) => setPoQuote1(e.target.value)}
                          className="w-full text-xs font-mono border border-emerald-300 bg-emerald-50/40 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Cotação 2 (R$)
                        </label>
                        <input
                          type="number"
                          value={poQuote2}
                          onChange={(e) => setPoQuote2(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Cotação 3 (R$)
                        </label>
                        <input
                          type="number"
                          value={poQuote3}
                          onChange={(e) => setPoQuote3(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Frete / Logística de Entrega (R$)
                      </label>
                      <input
                        type="number"
                        value={poFreight}
                        onChange={(e) => setPoFreight(e.target.value)}
                        className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition"
                    >
                      Emitir Pedido de Compra + Abrir Workflow
                    </button>
                  </form>

                  <form
                    onSubmit={handleCreateSupplier}
                    className="bg-white rounded-xl border border-slate-200 p-6 space-y-3"
                  >
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Homologar Fornecedor (ISO / SLA)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Cadastro técnico e avaliação de compliance de fornecedores
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Código
                        </label>
                        <input
                          type="text"
                          value={purSupplierCode}
                          onChange={(e) => setPurSupplierCode(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          CNPJ
                        </label>
                        <input
                          type="text"
                          value={purSupplierTaxId}
                          onChange={(e) => setPurSupplierTaxId(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Razão Social do Fornecedor
                      </label>
                      <input
                        type="text"
                        value={purSupplierName}
                        onChange={(e) => setPurSupplierName(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Nota de Homologação SLA / Qualidade (0 a 10)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        max={10}
                        value={purSupplierRating}
                        onChange={(e) => setPurSupplierRating(e.target.value)}
                        className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition"
                    >
                      Homologar Fornecedor
                    </button>
                  </form>
                </div>

                {/* Tabela de Pedidos de Compra e Catálogo de Fornecedores */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-bold text-slate-900 mb-3">
                      Pedidos de Compra, Mapa de Cotações & Recebimento (pur_orders)
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-2">PO / Fornecedor</th>
                            <th className="py-2">Status</th>
                            <th className="py-2 text-right">Saving (3 Cotações)</th>
                            <th className="py-2 text-right">Valor Total (c/ Frete)</th>
                            <th className="py-2 text-right">Aprovação & Recebimento</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {overview?.purchasingSummary?.orders?.map((po: any) => (
                            <tr key={po.id}>
                              <td className="py-3">
                                <span className="font-mono font-bold text-blue-700">
                                  {po.code}
                                </span>{' '}
                                <span className="font-semibold text-slate-800">
                                  — {po.supplierName}
                                </span>
                                <p className="text-slate-600 mt-0.5">{po.description}</p>
                                <p className="text-[11px] text-slate-400">
                                  Cotações: 1ª {formatBRL(po.quote1Amount)} | 2ª{' '}
                                  {formatBRL(po.quote2Amount)} | 3ª {formatBRL(po.quote3Amount)}
                                </p>
                              </td>
                              <td className="py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    po.status === 'RECEIVED'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-amber-50 text-amber-700'
                                  }`}
                                >
                                  {po.status}
                                </span>
                              </td>
                              <td className="py-3 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                                + {formatBRL(po.negotiatedSavings)}
                              </td>
                              <td className="py-3 text-right font-mono font-bold tabular-nums text-slate-900">
                                {formatBRL(po.totalAmount)}
                              </td>
                              <td className="py-3 text-right">
                                {po.status !== 'RECEIVED' ? (
                                  <button
                                    onClick={() => handleReceivePurchaseOrder(po.id)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition"
                                  >
                                    ✓ Aprovar & Receber PO
                                  </button>
                                ) : (
                                  <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                                    Integrado (Fin+DRE)
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-bold text-slate-900 mb-3">
                      Catálogo de Fornecedores Homologados (pur_suppliers)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {overview?.purchasingSummary?.suppliers?.map((s: any) => (
                        <div
                          key={s.id}
                          className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono font-bold text-xs text-blue-700">
                              {s.code}
                            </span>
                            <p className="text-xs font-bold text-slate-900 mt-0.5">{s.tradeName}</p>
                            <p className="text-[11px] text-slate-500">
                              CNPJ: {s.taxId} • Prazo: {s.paymentTermsDays} dias
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500">Score ISO/SLA</p>
                            <p className="text-xs font-mono font-bold text-emerald-700">
                              {s.ratingScore.toFixed(2)} / 10
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 11: MÓDULO 08 — ESTOQUE, CUSTO MÉDIO PONDERADO (CMPM) & FICHA KARDEX */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* KPIs de Estoque & Almoxarifado */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Valoração Contábil do Estoque (CMPM)</p>
                  <p className="text-xl font-bold font-mono text-blue-700 mt-1 tabular-nums">
                    {formatBRL(overview?.inventorySummary?.kpis?.totalStockValuation || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Custo Médio Ponderado Móvel (CPC 16)
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">SKUs / Materiais Ativos</p>
                  <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {overview?.inventorySummary?.kpis?.skusCount || 0} Materiais
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Volume físico total: {overview?.inventorySummary?.kpis?.totalUnitsOnHand || 0} un.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Alertas de Ressuprimento (Estoque Mínimo)</p>
                  <p className="text-xl font-bold font-mono text-amber-700 mt-1">
                    {overview?.inventorySummary?.kpis?.belowReorderCount || 0} Itens Críticos
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Gatilho automático para Requisição de Compra
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Movimentações na Ficha Kardex</p>
                  <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
                    {overview?.inventorySummary?.kpis?.movementsCount || 0} Movimentos
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Integrado ao Livro Diário & CMV na DRE
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Formulários de Movimentação Kardex e Cadastro de SKU */}
                <div className="space-y-6">
                  <form
                    onSubmit={handleRecordStockMovement}
                    className="bg-white rounded-xl border border-slate-200 p-6 space-y-3"
                  >
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Movimentar Ficha Kardex (Entrada / Saída / Transferência)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Recalcula o Custo Médio Ponderado Móvel (CMPM), bloqueia saldo negativo e contabiliza CMV na DRE
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Material / SKU
                      </label>
                      <select
                        value={selectedItemId}
                        onChange={(e) => setSelectedItemId(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50"
                      >
                        {overview?.inventorySummary?.items?.map((item: any) => (
                          <option key={item.id} value={item.id}>
                            {item.sku} — {item.name} (Saldo: {item.quantityOnHand} {item.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Operação de Almoxarifado
                      </label>
                      <select
                        value={invMovementType}
                        onChange={(e) => setInvMovementType(e.target.value as any)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white"
                      >
                        <option value="INBOUND_PURCHASE">
                          ENTRADA DE COMPRA (Recalcula Custo Médio CMPM)
                        </option>
                        <option value="OUTBOUND_REQUISITION">
                          SAÍDA POR REQUISIÇÃO INTERNA (Baixa pelo Custo Médio → CMV)
                        </option>
                        <option value="BRANCH_TRANSFER">
                          TRANSFERÊNCIA ENTRE FILIAIS (Baixa pelo Custo Médio)
                        </option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Quantidade
                        </label>
                        <input
                          type="number"
                          min={1}
                          step="1"
                          value={invQuantity}
                          onChange={(e) => setInvQuantity(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          {invMovementType === 'INBOUND_PURCHASE'
                            ? 'Custo Unitário Entrada (R$)'
                            : 'Doc. Referência'}
                        </label>
                        {invMovementType === 'INBOUND_PURCHASE' ? (
                          <input
                            type="number"
                            value={invUnitCost}
                            onChange={(e) => setInvUnitCost(e.target.value)}
                            className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                            required
                          />
                        ) : (
                          <input
                            type="text"
                            value={invRefDoc}
                            onChange={(e) => setInvRefDoc(e.target.value)}
                            className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                          />
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition"
                    >
                      Executar Movimentação Kardex + Contabilizar
                    </button>
                  </form>

                  <form
                    onSubmit={handleCreateInventoryItem}
                    className="bg-white rounded-xl border border-slate-200 p-6 space-y-3"
                  >
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Cadastrar Novo Material / SKU
                      </h2>
                      <p className="text-xs text-slate-500">
                        Inclusão de item no catálogo com ponto de pedido e custo inicial
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Código SKU
                        </label>
                        <input
                          type="text"
                          value={newSkuCode}
                          onChange={(e) => setNewSkuCode(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Custo Unitário (R$)
                        </label>
                        <input
                          type="number"
                          value={newSkuCost}
                          onChange={(e) => setNewSkuCost(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Descrição Técnica do Material
                      </label>
                      <input
                        type="text"
                        value={newSkuName}
                        onChange={(e) => setNewSkuName(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Saldo Inicial
                        </label>
                        <input
                          type="number"
                          value={newSkuQty}
                          onChange={(e) => setNewSkuQty(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Estoque Mínimo
                        </label>
                        <input
                          type="number"
                          value={newSkuReorder}
                          onChange={(e) => setNewSkuReorder(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition"
                    >
                      Cadastrar SKU no Almoxarifado
                    </button>
                  </form>
                </div>

                {/* Posição Física/Contábil de Estoque e Ficha Kardex */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-bold text-slate-900 mb-3">
                      Posição de Estoque & Custo Médio Ponderado Móvel (inv_items)
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-2">SKU / Material</th>
                            <th className="py-2">Almoxarifado</th>
                            <th className="py-2 text-right">Saldo Físico</th>
                            <th className="py-2 text-right">Custo Médio (CMPM)</th>
                            <th className="py-2 text-right">Valor Contábil Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {overview?.inventorySummary?.items?.map((item: any) => (
                            <tr key={item.id}>
                              <td className="py-3">
                                <span className="font-mono font-bold text-blue-700">
                                  {item.sku}
                                </span>
                                <p className="font-medium text-slate-900">{item.name}</p>
                              </td>
                              <td className="py-3">
                                <span className="font-mono text-[11px] text-slate-600">
                                  {item.warehouseLocation}
                                </span>
                              </td>
                              <td className="py-3 text-right font-mono tabular-nums">
                                <span
                                  className={`font-bold ${
                                    item.belowReorderPoint ? 'text-rose-700' : 'text-slate-900'
                                  }`}
                                >
                                  {item.quantityOnHand} {item.unit}
                                </span>
                                <p className="text-[10px] text-slate-400">
                                  Mín: {item.reorderPoint} {item.unit}
                                </p>
                              </td>
                              <td className="py-3 text-right font-mono tabular-nums text-slate-700">
                                {formatBRL(item.averageUnitCost)}
                              </td>
                              <td className="py-3 text-right font-mono font-bold tabular-nums text-emerald-700">
                                {formatBRL(item.totalStockValue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-bold text-slate-900 mb-3">
                      Histórico da Ficha Kardex Auditável (inv_movements)
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-2">Doc / SKU</th>
                            <th className="py-2">Tipo de Movimento</th>
                            <th className="py-2 text-right">Qtd</th>
                            <th className="py-2 text-right">Custo Aplicado</th>
                            <th className="py-2 text-right">Valor Total</th>
                            <th className="py-2 text-right">Saldo Após</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {overview?.inventorySummary?.movements?.map((m: any) => (
                            <tr key={m.id}>
                              <td className="py-2.5">
                                <span className="font-mono font-bold text-blue-700">
                                  {m.referenceDocument}
                                </span>
                                <p className="text-[11px] text-slate-600">{m.sku}</p>
                              </td>
                              <td className="py-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    m.movementType === 'INBOUND_PURCHASE'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-amber-50 text-amber-700'
                                  }`}
                                >
                                  {m.movementType}
                                </span>
                              </td>
                              <td className="py-2.5 text-right font-mono tabular-nums">
                                {m.movementType === 'INBOUND_PURCHASE' ? '+' : '-'}
                                {m.quantity}
                              </td>
                              <td className="py-2.5 text-right font-mono tabular-nums">
                                {formatBRL(m.unitCost)}
                              </td>
                              <td className="py-2.5 text-right font-mono font-bold tabular-nums text-slate-900">
                                {formatBRL(m.totalMovementValue)}
                              </td>
                              <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                                {m.resultingQtyOnHand} un ({formatBRL(m.resultingAvgCost)})
                              </td>
                            </tr>
                          ))}
                          {(!overview?.inventorySummary?.movements ||
                            overview.inventorySummary.movements.length === 0) && (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-400">
                                Nenhuma movimentação registrada ainda. Utilize o painel ao lado para lançar uma Entrada de Compra ou Saída por Requisição!
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 12: MÓDULO 09 — PATRIMÔNIO, ATIVO IMOBILIZADO & DEPRECIAÇÃO LINEAR CPC 27 */}
          {activeTab === 'assets' && (
            <div className="space-y-6">
              {/* KPIs de Patrimônio & Imobilizado */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Valor Original de Aquisição</p>
                  <p className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                    {formatBRL(overview?.assetsSummary?.kpis?.totalAcquisitionValue || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {overview?.assetsSummary?.kpis?.assetsCount || 0} bens imobilizados tombados
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">(-) Depreciação Acumulada</p>
                  <p className="text-xl font-bold font-mono text-rose-700 mt-1 tabular-nums">
                    - {formatBRL(overview?.assetsSummary?.kpis?.totalAccumulatedDepreciation || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Regime Linear CPC 27 / NBC TG 27
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Valor Contábil Líquido (Net Book Value)</p>
                  <p className="text-xl font-bold font-mono text-blue-700 mt-1 tabular-nums">
                    {formatBRL(overview?.assetsSummary?.kpis?.totalNetBookValue || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Protegido pelo piso de Valor Residual
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Quota Mensal de Depreciação</p>
                  <p className="text-xl font-bold font-mono text-amber-700 mt-1 tabular-nums">
                    {formatBRL(overview?.assetsSummary?.kpis?.estimatedMonthlyDepreciation || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Contabilização automática na DRE
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Fechamento de Depreciação Mensal e Tombamento de Bem */}
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Processar Quota Mensal de Depreciação (CPC 27)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Calcula a quota linear mensal respeitando o valor residual e posta a partida dobrada na DRE
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={depreciationCompetence}
                        onChange={(e) => setDepreciationCompetence(e.target.value)}
                        placeholder="YYYY-MM"
                        className="w-32 text-xs font-mono border border-slate-200 rounded-lg px-3 py-2"
                      />
                      <button
                        onClick={handleRunMonthlyDepreciation}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                      >
                        Depreciar Competência ({depreciationCompetence})
                      </button>
                    </div>
                  </div>

                  <form
                    onSubmit={handleRegisterFixedAsset}
                    className="bg-white rounded-xl border border-slate-200 p-6 space-y-3"
                  >
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Tombar Novo Bem Imobilizado (Plaquetamento)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Cadastro patrimonial com valor de aquisição, valor residual e vida útil
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Plaqueta Patrimonial
                        </label>
                        <input
                          type="text"
                          value={assetTagInput}
                          onChange={(e) => setAssetTagInput(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Vida Útil (Meses)
                        </label>
                        <input
                          type="number"
                          min={12}
                          value={assetUsefulLifeMonths}
                          onChange={(e) => setAssetUsefulLifeMonths(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Descrição do Bem / Equipamento
                      </label>
                      <input
                        type="text"
                        value={assetNameInput}
                        onChange={(e) => setAssetNameInput(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Localização Física / Unidade
                      </label>
                      <input
                        type="text"
                        value={assetLocationInput}
                        onChange={(e) => setAssetLocationInput(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Valor Aquisição (R$)
                        </label>
                        <input
                          type="number"
                          value={assetAcquisitionValue}
                          onChange={(e) => setAssetAcquisitionValue(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Valor Residual (R$)
                        </label>
                        <input
                          type="number"
                          value={assetResidualValue}
                          onChange={(e) => setAssetResidualValue(e.target.value)}
                          className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition"
                    >
                      Registrar Tombamento Patrimonial
                    </button>
                  </form>
                </div>

                {/* Bens do Ativo Imobilizado e Histórico de Depreciação */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-bold text-slate-900 mb-3">
                      Cadastro de Bens do Ativo Imobilizado (ast_fixed_assets)
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-2">Plaqueta / Bem</th>
                            <th className="py-2 text-right">Aquisição</th>
                            <th className="py-2 text-right">Quota Mensal</th>
                            <th className="py-2 text-right">Deprec. Acumulada</th>
                            <th className="py-2 text-right">Valor Contábil Líquido</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {overview?.assetsSummary?.assets?.map((ast: any) => (
                            <tr key={ast.id}>
                              <td className="py-3">
                                <span className="font-mono font-bold text-blue-700">
                                  {ast.assetTag}
                                </span>
                                <p className="font-medium text-slate-900">{ast.name}</p>
                                <p className="text-[11px] text-slate-400">
                                  {ast.locationName} • Taxa: {ast.annualDepreciationRatePct}% a.a. (Residual:{' '}
                                  {formatBRL(ast.residualValue)})
                                </p>
                              </td>
                              <td className="py-3 text-right font-mono tabular-nums">
                                {formatBRL(ast.acquisitionValue)}
                              </td>
                              <td className="py-3 text-right font-mono tabular-nums text-amber-700">
                                {formatBRL(ast.monthlyQuota)}
                              </td>
                              <td className="py-3 text-right font-mono tabular-nums text-rose-700">
                                - {formatBRL(ast.accumulatedDepreciation)}
                              </td>
                              <td className="py-3 text-right font-mono font-bold tabular-nums text-emerald-700">
                                {formatBRL(ast.netBookValue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-bold text-slate-900 mb-3">
                      Histórico de Quotas Mensais Contabilizadas (ast_depreciation_runs)
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-2">Competência / Plaqueta</th>
                            <th className="py-2 text-right">Quota Depreciada</th>
                            <th className="py-2 text-right">Acumulado Após</th>
                            <th className="py-2 text-right">Líquido Contábil Após</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {overview?.assetsSummary?.depreciationRuns?.map((run: any) => (
                            <tr key={run.id}>
                              <td className="py-2.5">
                                <span className="font-mono font-bold text-blue-700">
                                  {run.competenceMonth}
                                </span>{' '}
                                — <span className="font-mono font-semibold">{run.assetTag}</span> ({run.assetName})
                              </td>
                              <td className="py-2.5 text-right font-mono font-bold tabular-nums text-rose-700">
                                - {formatBRL(run.depreciationQuotaAmount)}
                              </td>
                              <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                                {formatBRL(run.accumulatedAfterRun)}
                              </td>
                              <td className="py-2.5 text-right font-mono font-bold tabular-nums text-emerald-700">
                                {formatBRL(run.netBookValueAfterRun)}
                              </td>
                            </tr>
                          ))}
                          {(!overview?.assetsSummary?.depreciationRuns ||
                            overview.assetsSummary.depreciationRuns.length === 0) && (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-slate-400">
                                Nenhuma quota mensal processada ainda. Clique em "Depreciar Competência (2026-11)" ao lado para calcular e contabilizar na DRE!
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 13: MÓDULOS 10 & 11 — VENDAS, EXPEDIÇÃO, GATEWAYS PIX/CARTÃO, MDR E CHARGEBACKS */}
          {activeTab === 'sales_payments' && (
            <div className="space-y-6">
              {/* KPIs de Vendas e Liquidação de Gateways */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">Faturamento Pedidos (PV)</p>
                  <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {formatBRL(overview?.salesPaymentsSummary?.kpis?.totalInvoicedSales ?? 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {overview?.salesPaymentsSummary?.kpis?.ordersCount ?? 0} pedidos faturados
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">CMV Baixado (Estoque)</p>
                  <p className="text-xl font-bold font-mono text-amber-700 mt-1">
                    {formatBRL(overview?.salesPaymentsSummary?.kpis?.totalCmvSales ?? 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Expedição integrada Kardex</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">Capturado PIX & Cartões</p>
                  <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
                    {formatBRL(overview?.salesPaymentsSummary?.kpis?.totalGatewayCaptured ?? 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Liquidação adquirentes/PIX</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">Taxas MDR Descontadas</p>
                  <p className="text-xl font-bold font-mono text-rose-700 mt-1">
                    {formatBRL(overview?.salesPaymentsSummary?.kpis?.totalMdrFees ?? 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Contabilizado Despesa DRE</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">Disputas de Chargeback</p>
                  <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {overview?.salesPaymentsSummary?.kpis?.totalChargebacks ?? 0}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Monitoramento antifraude</p>
                </div>
              </div>

              {/* Formulários Operacionais: Emissão de Pedido de Venda (Módulo 10) e Captura Gateway PIX/Cartão (Módulo 11) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form
                  onSubmit={handleCreateSalesOrder}
                  className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
                >
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Módulo 10 — Emitir & Faturar Pedido de Venda (Com Expedição Kardex)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Baixa automática de estoque pelo CMPM, gera Contas a Receber e contabiliza Receita na DRE
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Nº Pedido</label>
                      <input
                        type="text"
                        value={salesOrderNumber}
                        onChange={(e) => setSalesOrderNumber(e.target.value)}
                        className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Cliente</label>
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                      >
                        {overview?.salesPaymentsSummary?.customers?.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.legalName} ({c.taxId})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Qtd</label>
                      <input
                        type="number"
                        min={1}
                        value={salesQuantity}
                        onChange={(e) => setSalesQuantity(e.target.value)}
                        className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Preço Unit. (R$)</label>
                      <input
                        type="number"
                        value={salesUnitPrice}
                        onChange={(e) => setSalesUnitPrice(e.target.value)}
                        className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Desconto (R$)</label>
                      <input
                        type="number"
                        value={salesDiscount}
                        onChange={(e) => setSalesDiscount(e.target.value)}
                        className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition"
                  >
                    Emitir Pedido, Expedir Estoque (CMV) & Faturar Título
                  </button>
                </form>

                <form
                  onSubmit={handleCaptureGatewayPayment}
                  className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
                >
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Módulo 11 — Liquidação Gateway PIX / Cartão de Crédito & MDR
                    </h2>
                    <p className="text-xs text-slate-500">
                      Deduz taxa MDR na fonte, credita valor líquido no Banco e baixa o título a receber
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Modalidade Gateway</label>
                      <select
                        value={gatewayPaymentMethod}
                        onChange={(e) => setGatewayPaymentMethod(e.target.value as any)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                      >
                        <option value="PIX_INSTANT">PIX Instantâneo BACEN (MDR 0,89%)</option>
                        <option value="CREDIT_CARD_1X">Cartão de Crédito 1x (MDR 2,49%)</option>
                        <option value="CREDIT_CARD_INSTALLMENTS">Cartão Parcelado (MDR Escalonado)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Valor Bruto (R$)</label>
                      <input
                        type="number"
                        value={gatewayGrossAmount}
                        onChange={(e) => setGatewayGrossAmount(e.target.value)}
                        className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Parcelas</label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={gatewayInstallments}
                        onChange={(e) => setGatewayInstallments(e.target.value)}
                        className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Conta Bancária Destino</label>
                      <select
                        value={selectedBankAccountId}
                        onChange={(e) => setSelectedBankAccountId(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                      >
                        {overview?.salesPaymentsSummary?.bankAccounts?.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({formatBRL(b.currentBalance)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                  >
                    Capturar Liquidação PIX / Cartão & Contabilizar MDR
                  </button>
                </form>
              </div>

              {/* Tabelas de Pedidos de Venda e Transações de Gateway */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">
                    Pedidos de Venda Faturados & Expedidos (sls_orders)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2">Pedido</th>
                          <th className="py-2">Cliente</th>
                          <th className="py-2 text-right">Líquido</th>
                          <th className="py-2 text-right">CMV</th>
                          <th className="py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {overview?.salesPaymentsSummary?.orders?.map((o: any) => (
                          <tr key={o.id}>
                            <td className="py-2.5 font-mono font-bold text-blue-700">{o.orderNumber}</td>
                            <td className="py-2.5 text-slate-800">{o.customerName}</td>
                            <td className="py-2.5 text-right font-mono font-semibold">
                              {formatBRL(o.netAmount)}
                            </td>
                            <td className="py-2.5 text-right font-mono text-amber-700">
                              {formatBRL(o.cmvAmount)}
                            </td>
                            <td className="py-2.5 text-right">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">
                    Transações de Gateways PIX / Cartões & Chargebacks (pay_gateway_transactions)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2">NSU / E2E</th>
                          <th className="py-2">Método</th>
                          <th className="py-2 text-right">Bruto</th>
                          <th className="py-2 text-right">MDR</th>
                          <th className="py-2 text-right">Líquido</th>
                          <th className="py-2 text-right">Ação / Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {overview?.salesPaymentsSummary?.gatewayTransactions?.map((tx: any) => (
                          <tr key={tx.id}>
                            <td className="py-2.5 font-mono text-[11px] font-bold text-slate-800">
                              {tx.externalNsuCode}
                            </td>
                            <td className="py-2.5 text-slate-600">
                              {tx.paymentMethod} ({tx.installments}x)
                            </td>
                            <td className="py-2.5 text-right font-mono">{formatBRL(tx.grossAmount)}</td>
                            <td className="py-2.5 text-right font-mono text-rose-700">
                              -{formatBRL(tx.mdrFeeAmount)} ({tx.mdrRatePct}%)
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold text-emerald-700">
                              {formatBRL(tx.netSettledAmount)}
                            </td>
                            <td className="py-2.5 text-right">
                              {tx.status === 'CAPTURED_SETTLED' ? (
                                <button
                                  onClick={() => handleRegisterChargeback(tx.id)}
                                  className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-semibold border border-rose-200"
                                >
                                  Disputar Chargeback
                                </button>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                                  {tx.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 14: MÓDULOS 12 A 16 — CONTRATOS, SAC, MARKETING, BI & ANALYTICS E DOCUMENTOS ICP-BRASIL */}
          {activeTab === 'enterprise_ops' && (
            <div className="space-y-6">
              {/* KPIs Consolidados Módulos 12 a 16 */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">Mód. 12 — MRR Contratos Ativos</p>
                  <p className="text-xl font-bold font-mono text-blue-700 mt-1">
                    {formatBRL(overview?.enterpriseOpsSummary?.kpis?.mrrContracts ?? 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    ARR: {formatBRL(overview?.enterpriseOpsSummary?.kpis?.arrContracts ?? 0)}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">Mód. 13 — SAC & Reembolsos</p>
                  <p className="text-xl font-bold font-mono text-amber-700 mt-1">
                    {overview?.enterpriseOpsSummary?.kpis?.openTicketsCount ?? 0} em SLA
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Estornos: {formatBRL(overview?.enterpriseOpsSummary?.kpis?.totalRefundsApproved ?? 0)}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">Mód. 14 — ROAS Médio Mídia</p>
                  <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
                    {overview?.enterpriseOpsSummary?.kpis?.avgCampaignRoas ?? 0}x
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Retorno sobre investimento</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">Mód. 15 — EBITDA Estimado BI</p>
                  <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {formatBRL(overview?.enterpriseOpsSummary?.kpis?.estimatedEbitda ?? 0)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Analytics & Forecast M+3</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">Mód. 16 — Assinaturas ICP-Brasil</p>
                  <p className="text-xl font-bold font-mono text-indigo-700 mt-1">
                    {overview?.enterpriseOpsSummary?.kpis?.signedDocumentsCount ?? 0} Docs
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Carimbo SHA-256 verificado</p>
                </div>
              </div>

              {/* Módulo 12 (Contratos) & Módulo 13 (SAC e Estornos) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Módulo 12 — Gestão Contratual, Vigências & Reajuste IGPM/IPCA (ctr_contracts)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Aplica índice de reajuste anual composto e fatura a mensalidade em Contas a Receber
                    </p>
                  </div>
                  <div className="space-y-3">
                    {overview?.enterpriseOpsSummary?.contracts?.map((c: any) => (
                      <div
                        key={c.id}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-blue-700">
                              {c.contractNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                              {c.status}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 mt-1">{c.title}</p>
                          <p className="text-[11px] text-slate-500">
                            Cliente: {c.counterpartyName} • Índice: <strong>{c.readjustmentIndex}</strong> •
                            Mensalidade Atual: <strong>{formatBRL(c.currentMonthlyVal)}</strong>
                          </p>
                        </div>
                        <button
                          onClick={() => handleReadjustContract(c.id)}
                          className="px-3 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shrink-0"
                        >
                          Reajustar (+6,5%) & Faturar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Módulo 13 — SAC, Atendimento, SLA & Aprovação de Reembolsos (sac_support_tickets)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Aprova estorno de cliente dentro do SLA e gera programação de reembolso em Contas a Pagar
                    </p>
                  </div>
                  <div className="space-y-3">
                    {overview?.enterpriseOpsSummary?.tickets?.map((t: any) => (
                      <div
                        key={t.id}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-amber-700">
                              {t.protocolNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800">
                              SLA: {t.elapsedHours}h / {t.slaTargetHours}h ({t.status})
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 mt-1">{t.subject}</p>
                          <p className="text-[11px] text-slate-500">
                            Cliente: {t.customerName} • Estorno Solicitado:{' '}
                            <strong>{formatBRL(t.refundRequested)}</strong>
                          </p>
                        </div>
                        {t.status !== 'REFUNDED_CLOSED' && (
                          <button
                            onClick={() => handleApproveSacRefund(t.id)}
                            className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0"
                          >
                            Aprovar Estorno SAC
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Módulo 14 (Marketing), Módulo 15 (BI & Analytics) e Módulo 16 (Documentos ICP-Brasil) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Módulo 14 — Marketing, Cupons & ROAS (mkt_campaigns)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Atribuição de vendas por cupom, ROAS e CAC em tempo real
                    </p>
                  </div>
                  {overview?.enterpriseOpsSummary?.campaigns?.map((m: any) => (
                    <div key={m.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-emerald-700">
                          Cupom: {m.couponCode} (-{m.discountPct}%)
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-900">
                          ROAS: {m.roasMultiplier}x
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">{m.name}</p>
                      <p className="text-[11px] text-slate-500">
                        Investido: {formatBRL(m.budgetSpent)} • Receita: {formatBRL(m.attributedRevenue)} (
                        {m.conversionsCount} conv.)
                      </p>
                      <button
                        onClick={() => handleRecordMarketingConversion(m.id)}
                        className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        + Registrar Conversão de Cupom (+R$ 24.000)
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Módulo 15 — BI & Analytics Preditivo (Forecast Trimestral)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Projeção gerencial de Receita, Custos e EBITDA (M+1 a M+3)
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {overview?.enterpriseOpsSummary?.biForecast?.map((f: any) => (
                      <div
                        key={f.horizon}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-blue-700">{f.horizon}</span>
                          <p className="text-[11px] text-slate-500">
                            Receita Proj.: {formatBRL(f.projectedRevenue)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-500 block">EBITDA Projetado</span>
                          <span className="font-mono font-bold text-emerald-700">
                            {formatBRL(f.projectedEbitda)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Módulo 16 — Documentos & ICP-Brasil (GED)
                      </h3>
                      <p className="text-xs text-slate-500">Assinatura digital A3 e Hash SHA-256</p>
                    </div>
                    <button
                      onClick={handleSignIcpDocument}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                    >
                      + Assinar ICP-Brasil
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {overview?.enterpriseOpsSummary?.documents?.map((d: any) => (
                      <div key={d.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-indigo-700">{d.documentCode}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                            {d.certificateType}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800 mt-1">{d.title}</p>
                        <p className="text-[10px] font-mono text-slate-500 truncate mt-1">
                          SHA-256: {d.sha256Hash}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 08: EXTENSÃO DE EVENTOS, BILHETERIA E PORTAL DO PRODUTOR */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              {overview?.eventsList?.map((evt: any) => (
                <div key={evt.id} className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700">
                          {evt.code}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          {evt.status}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 mt-1">{evt.title}</h2>
                      <p className="text-xs text-slate-500">
                        Produtor: <strong>{evt.producer?.legalName}</strong> (CNPJ: {evt.producer?.taxId} • PIX:{' '}
                        {evt.producer?.pixKeyForPayout})
                      </p>
                    </div>

                    <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 text-right">
                      <p className="text-xs font-medium text-blue-800">
                        Saldo Líquido Disponível ao Produtor (Borderô)
                      </p>
                      <p className="text-2xl font-bold font-mono text-blue-900 tabular-nums mt-0.5">
                        {formatBRL(evt.availableBalance)}
                      </p>
                    </div>
                  </div>

                  {/* Indicadores do Borderô do Evento */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[11px] text-slate-500">Vendas Valor de Face (Custódia)</p>
                      <p className="text-sm font-bold font-mono text-slate-900 mt-1">
                        {formatBRL(evt.grossTicketSales)}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <p className="text-[11px] text-emerald-800">Taxas de Conveniência (Receita ERP)</p>
                      <p className="text-sm font-bold font-mono text-emerald-900 mt-1">
                        {formatBRL(evt.totalServiceFees)}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[11px] text-slate-500">Taxas de Adquirência (MDR/PIX)</p>
                      <p className="text-sm font-bold font-mono text-rose-700 mt-1">
                        - {formatBRL(evt.totalAcquirerFees)}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[11px] text-slate-500">Antecipações Realizadas</p>
                      <p className="text-sm font-bold font-mono text-amber-700 mt-1">
                        - {formatBRL(evt.totalAdvanced)}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[11px] text-slate-500">Repasses Liquidados</p>
                      <p className="text-sm font-bold font-mono text-slate-800 mt-1">
                        - {formatBRL(evt.totalPaidOut)}
                      </p>
                    </div>
                  </div>

                  {/* Lotes de Ingressos e Solicitação de Repasse/Antecipação */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900">
                          Lotes de Ingressos & PDV Online (Split Contábil Automático)
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span>Qtd:</span>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={ticketQuantity}
                            onChange={(e) => setTicketQuantity(e.target.value)}
                            className="w-16 border border-slate-200 rounded px-2 py-1 font-mono text-xs"
                          />
                        </div>
                      </div>
                      {evt.ticketBatches?.map((batch: any) => (
                        <div
                          key={batch.id}
                          className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                        >
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{batch.name}</h4>
                            <p className="text-xs font-mono text-slate-600 mt-0.5">
                              Face: {formatBRL(batch.faceValue)} + Taxa: {formatBRL(batch.serviceFee)}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Vendidos: {batch.soldQuantity} / {batch.totalQuota}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRecordTicketSale(evt.id, batch.id)}
                            className="px-3 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold"
                          >
                            + Vender {ticketQuantity}x (PIX)
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Portal do Produtor — Solicitar Repasse ou Antecipação
                        </h3>
                        <p className="text-xs text-slate-500">
                          Gera automaticamente título em Contas a Pagar e instância no Motor de Workflow da EMP-02
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Valor Solicitado (R$)
                          </label>
                          <input
                            type="number"
                            step="100"
                            value={payoutAmount}
                            onChange={(e) => setPayoutAmount(e.target.value)}
                            className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Modalidade
                          </label>
                          <select
                            value={isAdvancePayout ? 'ADVANCE' : 'REGULAR'}
                            onChange={(e) => setIsAdvancePayout(e.target.value === 'ADVANCE')}
                            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
                          >
                            <option value="ADVANCE">
                              Antecipação (Taxa {evt.producer?.advanceFeePct}%)
                            </option>
                            <option value="REGULAR">Repasse Regular Pós-Evento (0%)</option>
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRequestProducerPayout(evt.id)}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                      >
                        Solicitar Transferência PIX ao Produtor
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ABA 08: AUDITORIA & OUTBOX */}
          {activeTab === 'audit' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Trilha de Auditoria Imutável (core_audit_logs)
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Registro automático de usuário, empresa, ação e valores anteriores/novos
                </p>
                <div className="space-y-2.5">
                  {overview?.auditLogs?.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-700">
                          [{log.moduleCode}] {log.action} — {log.entityName}
                        </span>
                        <span className="font-mono text-slate-400">
                          {new Date(log.occurredAt).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                      <pre className="mt-1.5 text-[11px] font-mono text-slate-600 bg-white p-2 rounded border border-slate-100 overflow-x-auto">
                        {JSON.stringify({ before: log.previousValues, after: log.newValues }, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Eventos de Domínio — Transactional Outbox (core_outbox_events)
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Garantia ACID de entrega de eventos entre módulos
                </p>
                <div className="space-y-2.5">
                  {overview?.outboxEvents?.map((evt: any) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-emerald-700">{evt.eventType}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                          {evt.status}
                        </span>
                      </div>
                      <pre className="mt-1.5 text-[11px] font-mono text-slate-600 bg-white p-2 rounded border border-slate-100 overflow-x-auto">
                        {JSON.stringify(evt.payload, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
