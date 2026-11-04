import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

function createPrismaClientOptions() {
  const connectionString = process.env.DATABASE_URL || '';
  if (connectionString.includes('neon.tech')) {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    return { adapter };
  }
  return undefined;
}

/**
 * PrismaService Centralizado (Data Access Layer)
 * Suporta tanto conexão TCP local (Docker) quanto conexão HTTPS/WebSocket (porta 443) via Neon Driver Adapter,
 * além de Row-Level Security (RLS) por Tenant e Company.
 */
export class PrismaService extends PrismaClient {
  constructor() {
    super(createPrismaClientOptions() as any);
  }

  /**
   * Executa uma transação atômica injetando o contexto de Tenant e Empresa na sessão PostgreSQL
   * para suportar Row-Level Security (RLS) nativo além dos filtros da camada de repositório.
   */
  async executeInTenantTransaction<T>(
    tenantId: string,
    companyId: string,
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
  ): Promise<T> {
    if (!tenantId || !companyId) {
      throw new Error('TENANT_ISOLATION_VIOLATION: tenantId e companyId são obrigatórios para transações de domínio.');
    }

    return this.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_company_id', $1, true)`, companyId);
      return fn(tx);
    });
  }
}
