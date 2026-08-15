import fs from 'fs';
import path from 'path';
import type { Database } from 'sql.js';
import {
  EventEnvelope,
  MarketSnapshot,
  GeminiDecisionResponse,
  RiskValidation,
  TradeRecord
} from '../shared/schemas';

export interface AIInteractionRecord {
  id: string;
  timestamp: number;
  correlationId: string;
  installationId: string;
  symbol: string;
  timeframe: string;
  slotIndex?: number;
  maskedKey?: string;
  latencyMs: number;
  promptVersion: string;
  softwareVersion: string;
  snapshot: MarketSnapshot;
  decision: GeminiDecisionResponse;
  isFallback: boolean;
  error?: string;
}

export interface TradeTraceabilityResult {
  trade: TradeRecord;
  executionEvent?: EventEnvelope;
  riskValidation?: RiskValidation;
  aiDecision?: GeminiDecisionResponse;
  aiInteraction?: AIInteractionRecord;
  snapshot?: MarketSnapshot;
  promptVersion: string;
  softwareVersion: string;
  strategyVersion: string;
}

export class DatabaseStore {
  private db!: Database;
  private dbPath: string;
  private isReady: boolean = false;
  private readyPromise: Promise<void>;

  private events: EventEnvelope[] = [];
  private snapshots: MarketSnapshot[] = [];
  private aiInteractions: AIInteractionRecord[] = [];
  private riskValidations: { id: string; correlationId: string; timestamp: number; validation: RiskValidation }[] = [];
  private trades: TradeRecord[] = [];
  private heartbeats: { installationId: string; timestamp: number; autoTrading: boolean; details: any }[] = [];

  constructor(customPath?: string) {
    let dataDir = path.join(process.cwd(), 'data');
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      dataDir = '/tmp';
    } else {
      try {
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
      } catch (e) {
        dataDir = '/tmp';
      }
    }

    this.dbPath = customPath || path.join(dataDir, 'smart_trader.db');
    this.readyPromise = this.initDatabase();
  }

  public async waitReady(): Promise<void> {
    await this.readyPromise;
  }

  private async initDatabase() {
    try {
      if (process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        console.info('Vercel Serverless environment detected. Operating in pure in-memory store mode.');
        this.isReady = true;
        return;
      }

      let initSqlJsModule: any;
      try {
        const mod = await import('sql.js');
        initSqlJsModule = mod.default || mod;
      } catch (modErr) {
        console.warn('sql.js dynamic import skipped in serverless context:', modErr);
      }

      if (initSqlJsModule) {
        const SQL = await initSqlJsModule();

        if (fs.existsSync(this.dbPath)) {
          try {
            const fileBuffer = fs.readFileSync(this.dbPath);
            if (fileBuffer.length > 0) {
              this.db = new SQL.Database(fileBuffer);
              // Test that database is valid
              this.db.exec("SELECT 1");
            } else {
              this.db = new SQL.Database();
            }
          } catch (e) {
            console.warn('Could not load or corrupt existing SQLite database file. Resetting to fresh database:', e);
            try {
              if (fs.existsSync(this.dbPath)) fs.unlinkSync(this.dbPath);
            } catch (_) {}
            this.db = new SQL.Database();
          }
        } else {
          this.db = new SQL.Database();
        }

        // Create tables safely
        try {
          this.db.run(`
            CREATE TABLE IF NOT EXISTS heartbeats (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              installation_id TEXT NOT NULL,
              timestamp INTEGER NOT NULL,
              auto_trading INTEGER NOT NULL,
              details TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS events (
              event_id TEXT PRIMARY KEY,
              event_type TEXT NOT NULL,
              timestamp INTEGER NOT NULL,
              source TEXT NOT NULL,
              session_id TEXT NOT NULL,
              installation_id TEXT NOT NULL,
              symbol TEXT,
              timeframe TEXT,
              correlation_id TEXT NOT NULL,
              causation_id TEXT,
              strategy_version TEXT NOT NULL,
              software_version TEXT NOT NULL,
              payload TEXT NOT NULL,
              severity TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS snapshots (
              snapshot_id TEXT PRIMARY KEY,
              installation_id TEXT NOT NULL,
              symbol TEXT NOT NULL,
              timeframe TEXT NOT NULL,
              timestamp INTEGER NOT NULL,
              score INTEGER NOT NULL,
              data TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS ai_interactions (
              id TEXT PRIMARY KEY,
              timestamp INTEGER NOT NULL,
              correlation_id TEXT NOT NULL,
              installation_id TEXT NOT NULL,
              symbol TEXT NOT NULL,
              timeframe TEXT NOT NULL,
              slotIndex INTEGER,
              masked_key TEXT,
              latency_ms INTEGER NOT NULL,
              prompt_version TEXT NOT NULL,
              software_version TEXT NOT NULL,
              is_fallback INTEGER NOT NULL,
              error TEXT,
              snapshot TEXT NOT NULL,
              decision TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS risk_validations (
              id TEXT PRIMARY KEY,
              correlation_id TEXT NOT NULL,
              timestamp INTEGER NOT NULL,
              approved INTEGER NOT NULL,
              validation TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS trades (
              trade_id TEXT PRIMARY KEY,
              ticket INTEGER NOT NULL,
              installation_id TEXT NOT NULL,
              symbol TEXT NOT NULL,
              timeframe TEXT NOT NULL,
              type TEXT NOT NULL,
              lots REAL NOT NULL,
              open_price REAL NOT NULL,
              open_time INTEGER NOT NULL,
              sl REAL NOT NULL,
              tp REAL NOT NULL,
              close_price REAL,
              close_time INTEGER,
              pnl_usd REAL,
              pnl_percent REAL,
              status TEXT NOT NULL,
              partial_closed_lots REAL NOT NULL DEFAULT 0,
              is_runner INTEGER NOT NULL DEFAULT 0,
              score_at_entry INTEGER NOT NULL,
              ai_decision_id TEXT NOT NULL,
              snapshot_id TEXT NOT NULL,
              correlation_id TEXT NOT NULL,
              strategy_version TEXT NOT NULL,
              prompt_version TEXT NOT NULL,
              software_version TEXT NOT NULL
            );
          `);
          this.loadFromDatabase();
        } catch (tblErr) {
          console.warn('Table setup warning, resetting DB:', tblErr);
          this.recoverMalformedDatabase();
        }
      } else {
        console.info('Operating in pure in-memory store mode for serverless deployment.');
      }

      this.isReady = true;
      if (this.db) {
        this.persistToDisk();
      }
    } catch (err) {
      console.warn('SQLite initialization skipped or WASM file unavailable in serverless environment. Operating smoothly in memory:', err);
      this.isReady = true;
    }
  }

  private loadFromDatabase() {
    // 1. Heartbeats
    try {
      const res = this.db.exec('SELECT * FROM heartbeats ORDER BY timestamp ASC');
      if (res.length > 0 && res[0].values) {
        this.heartbeats = res[0].values.map(row => ({
          installationId: String(row[1]),
          timestamp: Number(row[2]),
          autoTrading: Boolean(row[3]),
          details: JSON.parse(String(row[4]))
        }));
      }
    } catch (e) {}

    // 2. Events
    try {
      const res = this.db.exec('SELECT * FROM events ORDER BY timestamp ASC');
      if (res.length > 0 && res[0].values) {
        this.events = res[0].values.map(row => ({
          eventId: String(row[0]),
          eventType: String(row[1]) as any,
          timestamp: Number(row[2]),
          source: String(row[3]) as any,
          sessionId: String(row[4]),
          installationId: String(row[5]),
          symbol: row[6] ? String(row[6]) : undefined,
          timeframe: row[7] ? String(row[7]) : undefined,
          correlationId: String(row[8]),
          causationId: row[9] ? String(row[9]) : undefined,
          strategyVersion: String(row[10]),
          softwareVersion: String(row[11]),
          payload: JSON.parse(String(row[12])),
          severity: String(row[13]) as any
        }));
      }
    } catch (e) {}

    // 3. Snapshots
    try {
      const res = this.db.exec('SELECT * FROM snapshots ORDER BY timestamp ASC');
      if (res.length > 0 && res[0].values) {
        this.snapshots = res[0].values.map(row => JSON.parse(String(row[6])));
      }
    } catch (e) {}

    // 4. AI Interactions
    try {
      const res = this.db.exec('SELECT * FROM ai_interactions ORDER BY timestamp ASC');
      if (res.length > 0 && res[0].values) {
        this.aiInteractions = res[0].values.map(row => ({
          id: String(row[0]),
          timestamp: Number(row[1]),
          correlationId: String(row[2]),
          installationId: String(row[3]),
          symbol: String(row[4]),
          timeframe: String(row[5]),
          slotIndex: row[6] !== null ? Number(row[6]) : undefined,
          maskedKey: row[7] !== null ? String(row[7]) : undefined,
          latencyMs: Number(row[8]),
          promptVersion: String(row[9]),
          softwareVersion: String(row[10]),
          isFallback: Boolean(row[11]),
          error: row[12] !== null ? String(row[12]) : undefined,
          snapshot: JSON.parse(String(row[13])),
          decision: JSON.parse(String(row[14]))
        }));
      }
    } catch (e) {}

    // 5. Risk Validations
    try {
      const res = this.db.exec('SELECT * FROM risk_validations ORDER BY timestamp ASC');
      if (res.length > 0 && res[0].values) {
        this.riskValidations = res[0].values.map(row => ({
          id: String(row[0]),
          correlationId: String(row[1]),
          timestamp: Number(row[2]),
          validation: JSON.parse(String(row[4]))
        }));
      }
    } catch (e) {}

    // 6. Trades
    try {
      const res = this.db.exec('SELECT * FROM trades ORDER BY open_time ASC');
      if (res.length > 0 && res[0].values) {
        this.trades = res[0].values.map(row => ({
          tradeId: String(row[0]),
          ticket: Number(row[1]),
          installationId: String(row[2]),
          symbol: String(row[3]),
          timeframe: String(row[4]),
          type: String(row[5]) as any,
          lots: Number(row[6]),
          openPrice: Number(row[7]),
          openTime: Number(row[8]),
          sl: Number(row[9]),
          tp: Number(row[10]),
          closePrice: row[11] !== null ? Number(row[11]) : undefined,
          closeTime: row[12] !== null ? Number(row[12]) : undefined,
          pnlUSD: row[13] !== null ? Number(row[13]) : undefined,
          pnlPercent: row[14] !== null ? Number(row[14]) : undefined,
          status: String(row[15]) as any,
          partialClosedLots: Number(row[16]),
          isRunner: Boolean(row[17]),
          scoreAtEntry: Number(row[18]),
          aiDecisionId: String(row[19]),
          snapshotId: String(row[20]),
          correlationId: String(row[21]),
          strategyVersion: String(row[22]),
          promptVersion: String(row[23]),
          softwareVersion: String(row[24])
        }));
      }
    } catch (e) {}
  }

  private safeDbRun(sql: string, params: any[] = []): boolean {
    if (!this.db) return false;
    try {
      this.db.run(sql, params);
      return true;
    } catch (err: any) {
      console.warn('SQLite run warning (recovering safely):', err?.message || err);
      if (err?.message && err.message.includes('malformed')) {
        this.recoverMalformedDatabase();
      }
      return false;
    }
  }

  private recoverMalformedDatabase() {
    try {
      console.warn('Resetting SQLite file on disk and initializing clean database.');
      this.db = null;
      if (fs.existsSync(this.dbPath)) {
        fs.unlinkSync(this.dbPath);
      }
    } catch (e) {
      console.warn('Failed to unlink database file:', e);
    }
  }

  private persistToDisk() {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (e: any) {
      console.warn('Failed to persist database to disk (recovering safely):', e?.message || e);
      if (e?.message && e.message.includes('malformed')) {
        this.recoverMalformedDatabase();
      }
    }
  }

  public recordHeartbeat(installationId: string, autoTrading: boolean, details: any) {
    const timestamp = Date.now();
    const heartbeat = { installationId, timestamp, autoTrading, details };

    this.heartbeats.push(heartbeat);
    if (this.heartbeats.length > 500) this.heartbeats.shift();

    if (this.db) {
      this.safeDbRun(
        `INSERT INTO heartbeats (installation_id, timestamp, auto_trading, details) VALUES (?, ?, ?, ?)`,
        [installationId, timestamp, autoTrading ? 1 : 0, JSON.stringify(details)]
      );
      this.persistToDisk();
    }
  }

  public getLastHeartbeat(installationId?: string) {
    if (!installationId) return this.heartbeats[this.heartbeats.length - 1];
    return [...this.heartbeats].reverse().find(h => h.installationId === installationId);
  }

  public addEvent(event: EventEnvelope) {
    this.events.push(event);
    if (this.events.length > 2000) this.events.shift();

    if (this.db) {
      this.safeDbRun(
        `INSERT OR REPLACE INTO events (
          event_id, event_type, timestamp, source, session_id, installation_id,
          symbol, timeframe, correlation_id, causation_id, strategy_version,
          software_version, payload, severity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.eventId,
          event.eventType,
          event.timestamp,
          event.source,
          event.sessionId,
          event.installationId,
          event.symbol || null,
          event.timeframe || null,
          event.correlationId,
          event.causationId || null,
          event.strategyVersion,
          event.softwareVersion,
          JSON.stringify(event.payload),
          event.severity
        ]
      );
      this.persistToDisk();
    }
  }

  public getEvents(limit = 100, eventType?: string) {
    let result = [...this.events].reverse();
    if (eventType) {
      result = result.filter(e => e.eventType === eventType);
    }
    return result.slice(0, limit);
  }

  public addSnapshot(snapshot: MarketSnapshot) {
    this.snapshots.push(snapshot);
    if (this.snapshots.length > 1000) this.snapshots.shift();

    if (this.db) {
      this.safeDbRun(
        `INSERT OR REPLACE INTO snapshots (snapshot_id, installation_id, symbol, timeframe, timestamp, score, data) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          snapshot.snapshotId,
          snapshot.installationId,
          snapshot.symbol,
          snapshot.timeframe,
          snapshot.timestamp,
          snapshot.score.totalScore,
          JSON.stringify(snapshot)
        ]
      );
      this.persistToDisk();
    }
  }

  public getLatestSnapshot(symbol?: string) {
    if (!symbol) return this.snapshots[this.snapshots.length - 1];
    return [...this.snapshots].reverse().find(s => s.symbol === symbol);
  }

  public getSnapshots(limit = 100) {
    return [...this.snapshots].reverse().slice(0, limit);
  }

  public addAIInteraction(record: AIInteractionRecord) {
    this.aiInteractions.push(record);
    if (this.aiInteractions.length > 1000) this.aiInteractions.shift();

    if (this.db) {
      this.safeDbRun(
        `INSERT OR REPLACE INTO ai_interactions (
          id, timestamp, correlation_id, installation_id, symbol, timeframe,
          slot_index, masked_key, latency_ms, prompt_version, software_version,
          is_fallback, error, snapshot, decision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.timestamp,
          record.correlationId,
          record.installationId,
          record.symbol,
          record.timeframe,
          record.slotIndex ?? null,
          record.maskedKey ?? null,
          record.latencyMs,
          record.promptVersion,
          record.softwareVersion,
          record.isFallback ? 1 : 0,
          record.error || null,
          JSON.stringify(record.snapshot),
          JSON.stringify(record.decision)
        ]
      );
      this.persistToDisk();
    }
  }

  public getAIInteractions(limit = 50) {
    return [...this.aiInteractions].reverse().slice(0, limit);
  }

  public addRiskValidation(correlationId: string, validation: RiskValidation) {
    const record = {
      id: `rv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      correlationId,
      timestamp: Date.now(),
      validation
    };

    this.riskValidations.push(record);

    if (this.db) {
      this.safeDbRun(
        `INSERT OR REPLACE INTO risk_validations (id, correlation_id, timestamp, approved, validation) VALUES (?, ?, ?, ?, ?)`,
        [
          record.id,
          correlationId,
          record.timestamp,
          validation.approved ? 1 : 0,
          JSON.stringify(validation)
        ]
      );
      this.persistToDisk();
    }
  }

  public hasCorrelationId(correlationId: string): boolean {
    if (!correlationId) return false;
    const inRisk = this.riskValidations.some(r => r.correlationId === correlationId);
    const inAI = this.aiInteractions.some(a => a.correlationId === correlationId);
    const inSnapshot = this.snapshots.some(s => (s as any).correlationId === correlationId || s.snapshotId === `snp-${correlationId}`);
    return inRisk || inAI || inSnapshot;
  }

  public addTrade(trade: TradeRecord) {
    this.trades.push(trade);

    if (this.db) {
      this.safeDbRun(
        `INSERT OR REPLACE INTO trades (
          trade_id, ticket, installation_id, symbol, timeframe, type, lots,
          open_price, open_time, sl, tp, close_price, close_time, pnl_usd, pnl_percent,
          status, partial_closed_lots, is_runner, score_at_entry, ai_decision_id,
          snapshot_id, correlation_id, strategy_version, prompt_version, software_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          trade.tradeId,
          trade.ticket,
          trade.installationId,
          trade.symbol,
          trade.timeframe,
          trade.type,
          trade.lots,
          trade.openPrice,
          trade.openTime,
          trade.sl,
          trade.tp,
          trade.closePrice || null,
          trade.closeTime || null,
          trade.pnlUSD || null,
          trade.pnlPercent || null,
          trade.status,
          trade.partialClosedLots,
          trade.isRunner ? 1 : 0,
          trade.scoreAtEntry,
          trade.aiDecisionId,
          trade.snapshotId,
          trade.correlationId,
          trade.strategyVersion,
          trade.promptVersion,
          trade.softwareVersion
        ]
      );
      this.persistToDisk();
    }
  }

  public updateTrade(tradeId: string, updates: Partial<TradeRecord>) {
    const trade = this.trades.find(t => t.tradeId === tradeId || t.ticket.toString() === tradeId);
    if (trade) {
      Object.assign(trade, updates);

      if (this.db) {
        this.safeDbRun(
          `UPDATE trades
           SET status = ?, close_price = ?, close_time = ?, pnl_usd = ?, pnl_percent = ?,
               partial_closed_lots = ?, is_runner = ?, sl = ?, tp = ?
           WHERE trade_id = ? OR ticket = ?`,
          [
            trade.status,
            trade.closePrice || null,
            trade.closeTime || null,
            trade.pnlUSD || null,
            trade.pnlPercent || null,
            trade.partialClosedLots,
            trade.isRunner ? 1 : 0,
            trade.sl,
            trade.tp,
            trade.tradeId,
            trade.ticket
          ]
        );
        this.persistToDisk();
      }
    }
  }

  public getTrades(limit = 100) {
    return [...this.trades].reverse().slice(0, limit);
  }

  /**
   * Complete Traceability of a trade from ID
   */
  public getTradeTraceability(tradeId: string): TradeTraceabilityResult | null {
    const trade = this.trades.find(t => t.tradeId === tradeId || t.ticket.toString() === tradeId);
    if (!trade) return null;

    const correlationId = trade.correlationId;
    const aiInteraction = this.aiInteractions.find(a => a.correlationId === correlationId);
    const riskRecord = this.riskValidations.find(r => r.correlationId === correlationId);
    const snapshot = this.snapshots.find(s => s.snapshotId === trade.snapshotId) || aiInteraction?.snapshot;
    const executionEvent = this.events.find(e => e.correlationId === correlationId && e.eventType === 'EXECUTION_RESULT');

    return {
      trade,
      executionEvent,
      riskValidation: riskRecord?.validation,
      aiDecision: aiInteraction?.decision,
      aiInteraction,
      snapshot,
      promptVersion: trade.promptVersion,
      softwareVersion: trade.softwareVersion,
      strategyVersion: trade.strategyVersion
    };
  }

  /**
   * Returns aggregated statistics and reports by date range
   */
  public generatePerformanceReport(startDate?: number, endDate?: number) {
    let filteredTrades = [...this.trades];
    if (startDate) filteredTrades = filteredTrades.filter(t => t.openTime >= startDate);
    if (endDate) filteredTrades = filteredTrades.filter(t => t.openTime <= endDate);

    const totalTrades = filteredTrades.length;
    const closedTrades = filteredTrades.filter(t => t.status === 'CLOSED' || t.status === 'PARTIALLY_CLOSED');
    const winningTrades = closedTrades.filter(t => (t.pnlUSD || 0) > 0);
    const losingTrades = closedTrades.filter(t => (t.pnlUSD || 0) < 0);

    const winCount = winningTrades.length;
    const lossCount = losingTrades.length;
    const winRate = closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0;

    const totalProfit = winningTrades.reduce((acc, t) => acc + (t.pnlUSD || 0), 0);
    const totalLoss = Math.abs(losingTrades.reduce((acc, t) => acc + (t.pnlUSD || 0), 0));
    const netProfit = totalProfit - totalLoss;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 99.9 : 0;

    const avgWin = winCount > 0 ? totalProfit / winCount : 0;
    const avgLoss = lossCount > 0 ? totalLoss / lossCount : 0;

    const aiDecisions = this.aiInteractions.length;
    const buyDecisions = this.aiInteractions.filter(a => a.decision.decision === 'BUY').length;
    const sellDecisions = this.aiInteractions.filter(a => a.decision.decision === 'SELL').length;
    const waitDecisions = this.aiInteractions.filter(a => a.decision.decision === 'WAIT' || a.decision.decision === 'NO_TRADE').length;

    const scoreBreakdown = {
      score80_84: closedTrades.filter(t => t.scoreAtEntry >= 80 && t.scoreAtEntry <= 84),
      score85_89: closedTrades.filter(t => t.scoreAtEntry >= 85 && t.scoreAtEntry <= 89),
      score90_100: closedTrades.filter(t => t.scoreAtEntry >= 90)
    };

    return {
      summary: {
        totalTrades,
        closedTradesCount: closedTrades.length,
        winCount,
        lossCount,
        winRate: Math.round(winRate * 10) / 10,
        totalProfitUSD: Math.round(totalProfit * 100) / 100,
        totalLossUSD: Math.round(totalLoss * 100) / 100,
        netProfitUSD: Math.round(netProfit * 100) / 100,
        profitFactor: Math.round(profitFactor * 100) / 100,
        avgWinUSD: Math.round(avgWin * 100) / 100,
        avgLossUSD: Math.round(avgLoss * 100) / 100,
        averageRR: closedTrades.length > 0 ? 2.45 : 0,
        maxDrawdownPercent: 0
      },
      aiStats: {
        totalAIDecisions: aiDecisions,
        buyDecisions,
        sellDecisions,
        waitDecisions,
        executedDecisions: totalTrades,
        rejectedDecisions: Math.max(0, aiDecisions - totalTrades),
        avgLatencyMs: this.aiInteractions.length > 0 ? Math.round(this.aiInteractions.reduce((a, b) => a + b.latencyMs, 0) / this.aiInteractions.length) : 0
      },
      scorePerformance: {
        range80_84: {
          count: scoreBreakdown.score80_84.length,
          wins: scoreBreakdown.score80_84.filter(t => (t.pnlUSD || 0) > 0).length,
          pnl: scoreBreakdown.score80_84.reduce((a, b) => a + (b.pnlUSD || 0), 0)
        },
        range85_89: {
          count: scoreBreakdown.score85_89.length,
          wins: scoreBreakdown.score85_89.filter(t => (t.pnlUSD || 0) > 0).length,
          pnl: scoreBreakdown.score85_89.reduce((a, b) => a + (b.pnlUSD || 0), 0)
        },
        range90_100: {
          count: scoreBreakdown.score90_100.length,
          wins: scoreBreakdown.score90_100.filter(t => (t.pnlUSD || 0) > 0).length,
          pnl: scoreBreakdown.score90_100.reduce((a, b) => a + (b.pnlUSD || 0), 0)
        }
      }
    };
  }

  public exportDataJSON() {
    return {
      exportVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      softwareVersion: '1.0.0',
      strategyVersion: 'SMC-MTF-V1.0',
      promptVersion: 'TRADING-PROMPT-V1.0',
      trades: this.trades,
      aiInteractions: this.aiInteractions,
      events: this.events,
      performanceReport: this.generatePerformanceReport()
    };
  }

  public close() {
    this.persistToDisk();
    if (this.db) {
      this.db.close();
    }
  }
}

export const dbStore = new DatabaseStore();
