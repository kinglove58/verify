import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
declare global { var __verifyPool: Pool | undefined; }

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!global.__verifyPool) {
    global.__verifyPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000
    });
  }
  return global.__verifyPool;
}
export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}
export async function transaction<T>(task: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await task(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function audit(actor: string | null, action: string, entityType: string, entityId: string, metadata: Record<string, unknown> = {}) {
  await query("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5::jsonb)", [actor, action, entityType, entityId, JSON.stringify(metadata)]);
}
