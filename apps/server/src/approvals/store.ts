import Database from 'better-sqlite3';
import type { PendingAction, PendingActionStatus } from '@copilot/shared';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  actor: 'user' | 'agent' | 'monitor' | 'system';
  action: string;
  tool?: string;
  risk?: string;
  conversationId?: string;
  traceId?: string;
  details?: Record<string, unknown>;
  outcome: 'success' | 'failure' | 'pending' | 'rejected';
}

export class ApprovalStore {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.init();
  }

  private init(): void {
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pending_actions (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        tool TEXT NOT NULL,
        args_json TEXT NOT NULL,
        args_hash TEXT NOT NULL,
        card_json TEXT NOT NULL,
        risk TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        status TEXT NOT NULL,
        resolved_at INTEGER,
        executed_at INTEGER,
        error TEXT
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        tool TEXT,
        risk TEXT,
        conversation_id TEXT,
        trace_id TEXT,
        details_json TEXT,
        outcome TEXT NOT NULL
      );
    `);
  }

  savePendingAction(action: PendingAction): void {
    const stmt = this.db.prepare(`
      INSERT INTO pending_actions (
        id, conversation_id, tool, args_json, args_hash, card_json,
        risk, created_at, expires_at, status, resolved_at, executed_at, error
      ) VALUES (
        @id, @conversationId, @tool, @argsJson, @argsHash, @cardJson,
        @risk, @createdAt, @expiresAt, @status, @resolvedAt, @executedAt, @error
      )
    `);

    stmt.run({
      id: action.id,
      conversationId: action.conversationId,
      tool: action.tool,
      argsJson: JSON.stringify(action.args),
      argsHash: action.argsHash,
      cardJson: JSON.stringify(action.card),
      risk: action.risk,
      createdAt: action.createdAt,
      expiresAt: action.expiresAt,
      status: action.status,
      resolvedAt: action.resolvedAt ?? null,
      executedAt: action.executedAt ?? null,
      error: action.error ?? null,
    });
  }

  getPendingAction(id: string): PendingAction | undefined {
    const row = this.db.prepare('SELECT * FROM pending_actions WHERE id = ?').get(id) as
      | {
          id: string;
          conversation_id: string;
          tool: string;
          args_json: string;
          args_hash: string;
          card_json: string;
          risk: 'low' | 'high';
          created_at: number;
          expires_at: number;
          status: PendingActionStatus;
          resolved_at: number | null;
          executed_at: number | null;
          error: string | null;
        }
      | undefined;

    if (!row) return undefined;

    return {
      id: row.id,
      conversationId: row.conversation_id,
      tool: row.tool,
      args: JSON.parse(row.args_json),
      argsHash: row.args_hash,
      card: JSON.parse(row.card_json),
      risk: row.risk,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      status: row.status,
      resolvedAt: row.resolved_at ?? undefined,
      executedAt: row.executed_at ?? undefined,
      error: row.error ?? undefined,
    };
  }

  updateActionStatus(
    id: string,
    status: PendingActionStatus,
    updates: { resolvedAt?: number; executedAt?: number; error?: string } = {},
  ): void {
    const stmt = this.db.prepare(`
      UPDATE pending_actions
      SET status = @status,
          resolved_at = COALESCE(@resolvedAt, resolved_at),
          executed_at = COALESCE(@executedAt, executed_at),
          error = COALESCE(@error, error)
      WHERE id = @id
    `);

    stmt.run({
      id,
      status,
      resolvedAt: updates.resolvedAt ?? null,
      executedAt: updates.executedAt ?? null,
      error: updates.error ?? null,
    });
  }

  addAudit(entry: AuditLogEntry): void {
    const stmt = this.db.prepare(`
      INSERT INTO audit_log (
        id, timestamp, actor, action, tool, risk, conversation_id, trace_id, details_json, outcome
      ) VALUES (
        @id, @timestamp, @actor, @action, @tool, @risk, @conversationId, @traceId, @detailsJson, @outcome
      )
    `);

    stmt.run({
      id: entry.id,
      timestamp: entry.timestamp,
      actor: entry.actor,
      action: entry.action,
      tool: entry.tool ?? null,
      risk: entry.risk ?? null,
      conversationId: entry.conversationId ?? null,
      traceId: entry.traceId ?? null,
      detailsJson: entry.details ? JSON.stringify(entry.details) : null,
      outcome: entry.outcome,
    });
  }

  getAuditLogs(limit = 100): AuditLogEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as {
      id: string;
      timestamp: number;
      actor: 'user' | 'agent' | 'monitor' | 'system';
      action: string;
      tool: string | null;
      risk: string | null;
      conversation_id: string | null;
      trace_id: string | null;
      details_json: string | null;
      outcome: 'success' | 'failure' | 'pending' | 'rejected';
    }[];

    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      actor: r.actor,
      action: r.action,
      tool: r.tool ?? undefined,
      risk: r.risk ?? undefined,
      conversationId: r.conversation_id ?? undefined,
      traceId: r.trace_id ?? undefined,
      details: r.details_json ? JSON.parse(r.details_json) : undefined,
      outcome: r.outcome,
    }));
  }

  getDbForTesting(): Database.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }
}
