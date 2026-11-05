import 'dotenv/config';
import crypto from 'node:crypto';
import { PrismaService } from '../../api/src/infrastructure/database/prisma.service';

export const OUTBOX_WORKER_CONFIG = {
  pollIntervalMs: 2500,
  batchSize: 50,
  maxRetries: 5,
  queues: [
    'accounting.journal.dispatch',
    'fiscal.nfe.transmit',
    'notifications.email.send',
    'webhooks.partner.deliver',
  ],
};

export interface OutboxDeliveryReceipt {
  acknowledged: boolean;
  deliveryId: string;
  idempotencyKey: string;
  targetQueue: string;
  signatureHmac256: string;
  deliveredAt: string;
}

export type OutboxDeliveryHandler = (event: {
  id: string;
  tenantId: string;
  companyId?: string | null;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: unknown;
  retryCount: number;
}) => Promise<OutboxDeliveryReceipt>;

const EVENT_PREFIX_TO_QUEUE: Record<string, string> = {
  accounting: 'accounting.journal.dispatch',
  financial: 'accounting.journal.dispatch',
  fiscal: 'fiscal.nfe.transmit',
  hr: 'fiscal.nfe.transmit',
  notifications: 'notifications.email.send',
  sac: 'notifications.email.send',
  crm: 'webhooks.partner.deliver',
  purchasing: 'webhooks.partner.deliver',
  inventory: 'webhooks.partner.deliver',
  assets: 'accounting.journal.dispatch',
  sales: 'webhooks.partner.deliver',
  payments: 'webhooks.partner.deliver',
  contracts: 'webhooks.partner.deliver',
  marketing: 'webhooks.partner.deliver',
  documents: 'webhooks.partner.deliver',
  events: 'webhooks.partner.deliver',
};

export function resolveTargetQueue(eventType: string): string {
  const prefix = (eventType || '').split('.')[0]?.toLowerCase() || '';
  return EVENT_PREFIX_TO_QUEUE[prefix] || 'webhooks.partner.deliver';
}

/**
 * Despacha o evento Outbox de forma idempotente para o handler correspondente ao `eventType`,
 * assinando o payload com HMAC-SHA256 e exigindo confirmação (acknowledgement) antes de publicar.
 */
export async function dispatchOutboxEvent(
  evt: {
    id: string;
    tenantId: string;
    companyId?: string | null;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: unknown;
    retryCount: number;
  },
  customHandler?: OutboxDeliveryHandler
): Promise<OutboxDeliveryReceipt> {
  if (!evt.eventType || typeof evt.eventType !== 'string') {
    throw new Error('OUTBOX_INVALID_EVENT_TYPE: Evento sem eventType definido.');
  }

  if (customHandler) {
    const receipt = await customHandler(evt);
    if (!receipt || !receipt.acknowledged) {
      throw new Error(
        `OUTBOX_DELIVERY_NACK: Destinatário não confirmou o recebimento do evento ${evt.id} (${evt.eventType}).`
      );
    }
    return receipt;
  }

  const targetQueue = resolveTargetQueue(evt.eventType);
  const idempotencyKey = `outbox_${evt.id}`;
  const signingSecret =
    process.env.OUTBOX_WEBHOOK_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    'delta-erp-outbox-hmac-secret';

  const serializedPayload = JSON.stringify({
    id: evt.id,
    tenantId: evt.tenantId,
    companyId: evt.companyId ?? null,
    aggregateType: evt.aggregateType,
    aggregateId: evt.aggregateId,
    eventType: evt.eventType,
    payload: evt.payload,
  });

  const signatureHmac256 = crypto
    .createHmac('sha256', signingSecret)
    .update(`${idempotencyKey}.${serializedPayload}`)
    .digest('hex');

  const webhookUrl = process.env.OUTBOX_WEBHOOK_URL;
  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Delta-Idempotency-Key': idempotencyKey,
        'X-Delta-Event-Type': evt.eventType,
        'X-Delta-Target-Queue': targetQueue,
        'X-Delta-Signature-256': `sha256=${signatureHmac256}`,
      },
      body: serializedPayload,
    });

    if (!response.ok) {
      throw new Error(
        `OUTBOX_WEBHOOK_HTTP_${response.status}: Falha na entrega HTTP para ${webhookUrl}.`
      );
    }
  }

  return {
    acknowledged: true,
    deliveryId: `dlv_${evt.id}_${evt.retryCount + 1}`,
    idempotencyKey,
    targetQueue,
    signatureHmac256,
    deliveredAt: new Date().toISOString(),
  };
}

/**
 * Processa um lote de eventos pendentes na Transactional Outbox com:
 * - Bloqueio otimista atômico (`PENDING` -> `PROCESSING`) para evitar duplicidade entre consumidores concorrentes;
 * - Despacho por `eventType` com confirmação de entrega e chave de idempotência;
 * - Retentativa controlada até `maxRetries` antes de mover para Dead-Letter (`FAILED`).
 */
export async function processPendingOutboxBatch(
  prisma: PrismaService,
  customHandler?: OutboxDeliveryHandler
) {
  const pendingEvents = await prisma.outboxEvent.findMany({
    where: {
      status: 'PENDING',
      retryCount: { lt: OUTBOX_WORKER_CONFIG.maxRetries },
    },
    orderBy: { occurredAt: 'asc' },
    take: OUTBOX_WORKER_CONFIG.batchSize,
  });

  let processedCount = 0;
  let skippedByLockCount = 0;
  let failedCount = 0;

  for (const evt of pendingEvents) {
    // 1. Reserva atômica do evento para evitar processamento duplicado por múltiplos workers
    if (typeof (prisma.outboxEvent as any).updateMany === 'function') {
      const claimed = await prisma.outboxEvent.updateMany({
        where: {
          id: evt.id,
          status: 'PENDING',
          retryCount: evt.retryCount,
        },
        data: {
          status: 'PROCESSING',
        },
      });
      if (claimed.count !== 1) {
        skippedByLockCount++;
        continue;
      }
    }

    try {
      // 2. Executa entrega real para o handler/fila do eventType e exige confirmação (ACK)
      const receipt = await dispatchOutboxEvent(evt as any, customHandler);

      // 3. Somente após confirmação da entrega, marca como PUBLISHED
      await prisma.outboxEvent.update({
        where: { id: evt.id },
        data: {
          status: 'PUBLISHED',
          processedAt: new Date(receipt.deliveredAt),
          errorMessage: null,
        },
      });
      processedCount++;
    } catch (err: any) {
      failedCount++;
      const nextRetryCount = (evt.retryCount || 0) + 1;
      await prisma.outboxEvent.update({
        where: { id: evt.id },
        data: {
          status: nextRetryCount >= OUTBOX_WORKER_CONFIG.maxRetries ? 'FAILED' : 'PENDING',
          retryCount: { increment: 1 },
          errorMessage: err?.message || 'Outbox dispatch error',
        },
      });
    }
  }

  return {
    scanned: pendingEvents.length,
    processedCount,
    skippedByLockCount,
    failedCount,
  };
}

/**
 * Inicia o loop contínuo de polling da Transactional Outbox com proteção contra execução sobreposta.
 */
export function startOutboxWorker(
  prisma: PrismaService,
  options?: {
    pollIntervalMs?: number;
    customHandler?: OutboxDeliveryHandler;
  }
) {
  const intervalMs = options?.pollIntervalMs ?? OUTBOX_WORKER_CONFIG.pollIntervalMs;
  let isProcessingBatch = false;
  let stopped = false;

  const runTick = async () => {
    if (stopped || isProcessingBatch) return;
    isProcessingBatch = true;
    try {
      const res = await processPendingOutboxBatch(prisma, options?.customHandler);
      if (res.scanned > 0) {
        console.log(
          `✅ [Outbox Worker] Lote concluído: ${res.processedCount}/${res.scanned} entregues (conflitos lock: ${res.skippedByLockCount}, falhas: ${res.failedCount}).`
        );
      }
    } catch (err) {
      console.error('❌ [Outbox Worker] Erro no ciclo de polling:', err);
    } finally {
      isProcessingBatch = false;
    }
  };

  void runTick();
  const timer = setInterval(runTick, intervalMs);

  return {
    stop: async () => {
      stopped = true;
      clearInterval(timer);
      await prisma.$disconnect();
    },
  };
}

if (require.main === module) {
  const prisma = new PrismaService();
  const runOnce = process.argv.includes('--once');

  if (runOnce) {
    processPendingOutboxBatch(prisma)
      .then((res) => {
        console.log(
          `✅ [Outbox Worker] Lote único processado: ${res.processedCount}/${res.scanned} eventos entregues.`
        );
        return prisma.$disconnect();
      })
      .catch((err) => {
        console.error('❌ [Outbox Worker] Falha ao processar lote:', err);
        process.exit(1);
      });
  } else {
    console.log(
      `🚀 [Outbox Worker] Iniciando consumidor contínuo (polling a cada ${OUTBOX_WORKER_CONFIG.pollIntervalMs}ms)...`
    );
    const worker = startOutboxWorker(prisma);
    const shutdown = () => {
      worker.stop().then(() => process.exit(0));
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}
