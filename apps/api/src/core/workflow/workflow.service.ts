import { ErpModuleCode, TenantExecutionContext } from '@delta-erp/shared';
import { canApproveAmount } from '@delta-erp/auth-client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CoreSecurityPolicy } from '../permissions/permission.guard';

export interface DecideWorkflowDto {
  workflowId: string;
  decision: 'APPROVED' | 'REJECTED';
  decisionNotes: string;
}

/**
 * Core ERP — WorkflowService (Entrega 2)
 * Motor centralizado de aprovações, tarefas e alçadas financeiras/operacionais.
 */
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async decideWorkflow(context: TenantExecutionContext, dto: DecideWorkflowDto) {
    if (!dto.decisionNotes || dto.decisionNotes.trim().length < 3) {
      throw new Error(
        'WORKFLOW_NOTES_REQUIRED: Informe uma justificativa/observação para aprovar ou rejeitar a alçada.'
      );
    }

    return this.prisma.executeInTenantTransaction(context.tenantId, context.companyId, async (tx) => {
      const wf = await tx.workflowInstance.findUnique({
        where: { id: dto.workflowId },
      });

      if (!wf) {
        throw new Error('WORKFLOW_NOT_FOUND: Solicitação de workflow não encontrada.');
      }

      // Garante isolamento multiempresa (impede aprovar workflow de outra empresa)
      CoreSecurityPolicy.assertTenantAndCompanyIsolation(context, wf.tenantId, wf.companyId);

      if (wf.status !== 'PENDING') {
        throw new Error(
          `WORKFLOW_ALREADY_DECIDED: Este workflow já foi finalizado com status "${wf.status}".`
        );
      }

      const refAmount = Number(wf.referenceAmount);
      if (dto.decision === 'APPROVED' && !canApproveAmount(context, refAmount)) {
        throw new Error(
          `WORKFLOW_APPROVAL_LIMIT_EXCEEDED: Valor da operação (R$ ${refAmount.toFixed(
            2
          )}) excede a alçada máxima do perfil ${context.roleCode} (R$ ${context.maxApprovalAmount.toFixed(
            2
          )}).`
        );
      }

      const updatedWf = await tx.workflowInstance.update({
        where: { id: wf.id },
        data: {
          status: dto.decision,
          decidedById: context.userId,
          decisionNotes: dto.decisionNotes.trim(),
          decidedAt: new Date(),
        },
      });

      // Se vinculado a um AccountPayable, sincroniza o status do título
      if (wf.entityType === 'ACCOUNT_PAYABLE') {
        await tx.accountPayable.update({
          where: { id: wf.entityId },
          data: {
            status: dto.decision === 'APPROVED' ? 'APPROVED' : 'CANCELLED',
            approvedById: dto.decision === 'APPROVED' ? context.userId : null,
            approvedAt: dto.decision === 'APPROVED' ? new Date() : null,
          },
        });
      }

      await tx.outboxEvent.create({
        data: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          aggregateType: 'WorkflowInstance',
          aggregateId: wf.id,
          eventType: `workflow.${wf.entityType.toLowerCase()}.${dto.decision.toLowerCase()}`,
          payload: {
            workflowId: wf.id,
            entityType: wf.entityType,
            entityId: wf.entityId,
            decision: dto.decision,
            referenceAmount: refAmount,
            decidedById: context.userId,
            roleCode: context.roleCode,
            decisionNotes: dto.decisionNotes.trim(),
          },
        },
      });

      await this.auditService.record(
        {
          context,
          moduleCode: ErpModuleCode.WORKFLOW,
          entityName: 'WorkflowInstance',
          entityId: wf.id,
          action: dto.decision === 'APPROVED' ? 'APPROVE' : 'REJECT',
          previousValues: { status: 'PENDING' },
          newValues: {
            status: dto.decision,
            entityType: wf.entityType,
            entityId: wf.entityId,
            referenceAmount: refAmount,
            decisionNotes: dto.decisionNotes.trim(),
          },
        },
        tx
      );

      return updatedWf;
    });
  }
}
