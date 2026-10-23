import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Alert } from '@copilot/shared';
import type { LLMMessage } from '@copilot/agent';
import { ApprovalStore } from '../approvals/store.js';

export interface DbConversation {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

export class AppDatabase {
  private db: Database.Database;
  public approvalStore: ApprovalStore;

  constructor(dbPath: string = ':memory:') {
    if (dbPath !== ':memory:') {
      mkdirSync(dirname(dbPath), { recursive: true });
    }
    this.db = new Database(dbPath);
    this.init();
    this.approvalStore = new ApprovalStore(dbPath);
  }

  private init(): void {
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT,
        name TEXT,
        tool_call_id TEXT,
        tool_calls_json TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        app_name TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        evidence_ids_json TEXT
      );

      CREATE TABLE IF NOT EXISTS metric_samples (
        id TEXT PRIMARY KEY,
        app_name TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        cpu_percent REAL NOT NULL,
        memory_mb REAL NOT NULL,
        memory_percent REAL NOT NULL
      );
    `);
  }

  // Conversation repositories
  createConversation(id: string, title = 'گفتگوی جدید'): DbConversation {
    const now = Date.now();
    this.db
      .prepare('INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)')
      .run(id, title, now, now);
    return { id, title, created_at: now, updated_at: now };
  }

  getConversation(id: string): DbConversation | undefined {
    return this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as
      DbConversation | undefined;
  }

  listConversations(): DbConversation[] {
    return this.db
      .prepare('SELECT * FROM conversations ORDER BY updated_at DESC')
      .all() as DbConversation[];
  }

  // Messages repositories
  saveMessage(conversationId: string, message: LLMMessage): void {
    const now = Date.now();
    const id = `msg_${now}_${Math.random().toString(36).slice(2, 7)}`;
    this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, role, content, name, tool_call_id, tool_calls_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        conversationId,
        message.role,
        message.content || null,
        message.name || null,
        message.tool_call_id || null,
        message.tool_calls ? JSON.stringify(message.tool_calls) : null,
        now,
      );

    this.db
      .prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')
      .run(now, conversationId);
  }

  getMessages(conversationId: string): LLMMessage[] {
    const rows = this.db
      .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
      .all(conversationId) as {
      role: 'system' | 'user' | 'assistant' | 'tool';
      content: string | null;
      name: string | null;
      tool_call_id: string | null;
      tool_calls_json: string | null;
    }[];

    return rows.map((r) => ({
      role: r.role,
      content: r.content ?? undefined,
      name: r.name ?? undefined,
      tool_call_id: r.tool_call_id ?? undefined,
      tool_calls: r.tool_calls_json ? JSON.parse(r.tool_calls_json) : undefined,
    }));
  }

  // Alerts repository
  saveAlert(alert: Alert): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO alerts (id, app_name, severity, title, message, status, timestamp, evidence_ids_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        alert.id,
        alert.appName,
        alert.severity,
        alert.title,
        alert.message,
        alert.status,
        alert.timestamp,
        alert.evidenceIds ? JSON.stringify(alert.evidenceIds) : null,
      );
  }

  getActiveAlert(appName: string, ruleTitle: string): Alert | undefined {
    const row = this.db
      .prepare(
        "SELECT * FROM alerts WHERE app_name = ? AND title = ? AND status = 'active' LIMIT 1",
      )
      .get(appName, ruleTitle) as
      | {
          id: string;
          app_name: string;
          severity: 'info' | 'warning' | 'critical';
          title: string;
          message: string;
          status: 'active' | 'investigating' | 'resolved';
          timestamp: number;
          evidence_ids_json: string | null;
        }
      | undefined;

    if (!row) return undefined;
    return {
      id: row.id,
      appName: row.app_name,
      severity: row.severity,
      title: row.title,
      message: row.message,
      status: row.status,
      timestamp: row.timestamp,
      evidenceIds: row.evidence_ids_json ? JSON.parse(row.evidence_ids_json) : undefined,
    };
  }

  listAlerts(limit = 50): Alert[] {
    const rows = this.db
      .prepare('SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as {
      id: string;
      app_name: string;
      severity: 'info' | 'warning' | 'critical';
      title: string;
      message: string;
      status: 'active' | 'investigating' | 'resolved';
      timestamp: number;
      evidence_ids_json: string | null;
    }[];

    return rows.map((r) => ({
      id: r.id,
      appName: r.app_name,
      severity: r.severity,
      title: r.title,
      message: r.message,
      status: r.status,
      timestamp: r.timestamp,
      evidenceIds: r.evidence_ids_json ? JSON.parse(r.evidence_ids_json) : undefined,
    }));
  }

  resolveAlert(id: string): void {
    this.db.prepare("UPDATE alerts SET status = 'resolved' WHERE id = ?").run(id);
  }

  deleteAlert(id: string): void {
    this.db.prepare('DELETE FROM alerts WHERE id = ?').run(id);
  }

  clearResolvedAlerts(): void {
    this.db.prepare("DELETE FROM alerts WHERE status = 'resolved'").run();
  }

  clearAlerts(): void {
    this.db.prepare('DELETE FROM alerts').run();
  }

  close(): void {
    this.approvalStore.close();
    this.db.close();
  }
}
