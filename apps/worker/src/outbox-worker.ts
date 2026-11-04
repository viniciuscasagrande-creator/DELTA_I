import 'dotenv/config';
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

export async function processPendingOutboxBatch(prisma: PrismaService) {
  const pendingEvents = await prisma.outboxEvent.findMany({
    where: { status: 'PENDING' },
    orderBy: { occurredAt: 'asc' },
    take: OUTBOX_WORKER_CONFIG.batchSize,
  });

  let processedCount = 0;
  for (const evt of pendingEvents) {
    try {
      await prisma.outboxEvent.update({
        where: { id: evt.id },
        data: {
          status: 'PUBLISHED',
          processedAt: new Date(),
        },
      });
      processedCount++;
    } catch (err: any) {
      await prisma.outboxEvent.update({
        where: { id: evt.id },
        data: {
          status: evt.retryCount + 1 >= OUTBOX_WORKER_CONFIG.maxRetries ? 'FAILED' : 'PENDING',
          retryCount: { increment: 1 },
          errorMessage: err?.message || 'Outbox dispatch error',
        },
      });
    }
  }

  return { scanned: pendingEvents.length, processedCount };
}

if (require.main === module) {
  const prisma = new PrismaService();
  processPendingOutboxBatch(prisma)
    .then((res) => {
      console.log(`✅ [Outbox Worker] Lote processado: ${res.processedCount}/${res.scanned} eventos publicados.`);
      return prisma.$disconnect();
    })
    .catch((err) => {
      console.error('❌ [Outbox Worker] Falha ao processar lote:', err);
      process.exit(1);
    });
}
