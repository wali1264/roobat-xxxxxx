import express from 'express';
import dotenv from 'dotenv';
import { dbStore } from './db';
import { keyPoolManager, classifyGeminiError } from './geminiKeyPool';
import { analyzeMarketWithGemini, getAIInteractions, recordAIInteraction, getResolvedModelName } from './geminiGateway';
import { strategyEngine } from './strategyEngine';
import { riskEngine } from './riskEngine';
import { newsProvider } from './newsProvider';
import { auditLogger } from './auditLogger';
import { realtimeStreamManager } from './realtimeStream';
import { supabaseAdapter } from './supabase';
import { validateEaAuth } from './middleware/eaAuth';
import { MarketSnapshotSchema, GeminiDecisionResponse } from '../shared/schemas';
import { SOFTWARE_VERSION, STRATEGY_VERSION, PROMPT_VERSION } from '../shared/constants';

dotenv.config();

export function createExpressApp() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // Route normalization for local, Docker, and Vercel Serverless
  app.use((req, res, next) => {
    let url = req.url;
    // Strip redundant leading slash repetitions
    url = url.replace(/\/+/g, '/');

    const [pathPart, queryPart] = url.split('?');
    const suffix = queryPart ? '?' + queryPart : '';

    if (pathPart.startsWith('/v1/')) {
      req.url = '/api' + pathPart + suffix;
    } else if (pathPart === '/' || pathPart === '/api' || pathPart === '/api/') {
      req.url = '/api/v1/health' + suffix;
    } else if (pathPart.startsWith('/cloud/status') || pathPart === '/api/cloud/status') {
      req.url = '/api/v1/cloud/status' + suffix;
    } else if (pathPart === '/health' || pathPart === '/api/health') {
      req.url = '/api/v1/health' + suffix;
    } else if (pathPart === '/trades' || pathPart === '/api/trades') {
      req.url = '/api/v1/trades' + suffix;
    } else if (pathPart === '/events' || pathPart === '/api/events') {
      req.url = '/api/v1/events' + suffix;
    } else if (pathPart === '/events/stream' || pathPart === '/api/events/stream') {
      req.url = '/api/v1/events/stream' + suffix;
    } else if (pathPart === '/news' || pathPart === '/api/news') {
      req.url = '/api/v1/news' + suffix;
    } else if (pathPart === '/keypool' || pathPart === '/api/keypool') {
      req.url = '/api/v1/keypool' + suffix;
    } else if (pathPart === '/ai/test' || pathPart === '/api/ai/test') {
      req.url = '/api/v1/ai/test' + suffix;
    }
    next();
  });

  // CORS headers
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Installation-Id, X-EA-Secret');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // Apply EA Authentication Middleware to all EA routes
  app.use('/api/v1/ea', validateEaAuth);

  // Health Endpoint
  app.get('/api/v1/health', (req, res) => {
    const lastHb = dbStore.getLastHeartbeat();
    const isEaConnected = lastHb ? (Date.now() - lastHb.timestamp < 30000) : false;
    const poolStatus = keyPoolManager.getPoolStatus();
    const healthyKeysCount = poolStatus.filter(k => k.status === 'HEALTHY').length;

    res.json({
      status: 'ok',
      softwareVersion: SOFTWARE_VERSION,
      strategyVersion: STRATEGY_VERSION,
      promptVersion: PROMPT_VERSION,
      timestamp: Date.now(),
      components: {
        backend: 'HEALTHY',
        database: 'HEALTHY',
        geminiKeyPool: healthyKeysCount > 0 ? 'HEALTHY' : 'WARNING',
        eaConnection: isEaConnected ? 'CONNECTED' : 'DISCONNECTED'
      },
      keyPoolSummary: {
        activeModel: getResolvedModelName(),
        totalConfigured: poolStatus.length,
        healthyCount: healthyKeysCount,
        cooldownCount: poolStatus.filter(k => k.status === 'COOLDOWN').length,
        quotaExhaustedCount: poolStatus.filter(k => k.status === 'QUOTA_EXHAUSTED').length,
        disabledCount: poolStatus.filter(k => k.status === 'DISABLED' || k.status === 'AUTH_ERROR').length
      }
    });
  });

  // Key Pool Status
  app.get('/api/v1/keypool', (req, res) => {
    res.json({
      timestamp: Date.now(),
      slots: keyPoolManager.getPoolStatus()
    });
  });

  // Cloud Deployment & Supabase Status
  app.get('/api/v1/cloud/status', (req, res) => {
    const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
    const vercelRegion = process.env.VERCEL_REGION || 'fra1 (Frankfurt, Europe)';
    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
    const supabaseStatus = supabaseAdapter.getStatus();

    res.json({
      timestamp: Date.now(),
      platform: isVercel ? 'VERCEL_SERVERLESS' : 'LOCAL_CONTAINER',
      isDeployedOnVercel: isVercel,
      region: isVercel ? vercelRegion : 'Local Container Engine',
      deploymentUrl: vercelUrl || 'http://localhost:3000',
      nodeEnv: process.env.NODE_ENV || 'production',
      features: {
        unfilteredGeminiAccess: true,
        europeLatency: isVercel ? '< 35ms' : 'Direct VPN Proxy',
        failClosedRiskProtection: true,
        mt5DirectWebhook: true
      },
      supabase: supabaseStatus
    });
  });

  // Force reload .env and key pool
  app.post('/api/v1/keypool/reload', (req, res) => {
    keyPoolManager.refreshPool();
    const slots = keyPoolManager.getPoolStatus();
    res.json({
      success: true,
      timestamp: Date.now(),
      totalSlots: slots.length,
      healthySlots: slots.filter(s => s.status === 'HEALTHY').length,
      slots
    });
  });

  // Manually add or test an API key
  app.post('/api/v1/keypool/add', (req, res) => {
    const { apiKey, name } = req.body;
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ success: false, error: 'API key is required' });
    }
    const result = keyPoolManager.addManualKey(apiKey, name);
    res.json({
      ...result,
      timestamp: Date.now(),
      slots: keyPoolManager.getPoolStatus()
    });
  });

  // AI Inspection & Diagnostic History
  app.get('/api/v1/ai/history', (req, res) => {
    res.json({
      timestamp: Date.now(),
      history: getAIInteractions()
    });
  });

  // Direct Live AI Diagnostic Test Endpoint
  app.post('/api/v1/ai/test', async (req, res) => {
    const startTime = Date.now();
    let { prompt, apiKey } = req.body || {};

    if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
      keyPoolManager.addManualKey(apiKey.trim());
    }

    const poolStatus = keyPoolManager.getPoolStatus();
    const healthyKeys = poolStatus.filter(k => k.status === 'HEALTHY');

    if (healthyKeys.length === 0) {
      const errResponse = {
        success: false,
        status: 'error',
        error: 'NO_ACTIVE_KEYS',
        message: 'هیچ کلید فعالی در مخزن Gemini یافت نشد. لطفاً در فایل .env متغیر GEMINI_API_KEY_1 را تنظیم فرمایید یا در این صفحه کلید را وارد کنید.',
        latencyMs: Date.now() - startTime
      };
      recordAIInteraction({
        id: `ai-test-${Date.now()}`,
        timestamp: Date.now(),
        source: 'MANUAL_ADVISOR',
        model: getResolvedModelName(),
        latencyMs: Date.now() - startTime,
        success: false,
        prompt: prompt || 'Diagnostic Ping',
        error: errResponse.message
      });
      return res.status(400).json(errResponse);
    }

    const keyInfo = keyPoolManager.getNextKey();
    if (!keyInfo) {
      const errResponse = {
        success: false,
        status: 'error',
        error: 'POOL_EXHAUSTED',
        message: 'تمامی کلیدهای موجود در حال حاضر در حالت خنک‌سازی (Cooldown) یا محدودیت سهمیه (Quota) هستند.',
        latencyMs: Date.now() - startTime
      };
      recordAIInteraction({
        id: `ai-test-${Date.now()}`,
        timestamp: Date.now(),
        source: 'MANUAL_ADVISOR',
        model: getResolvedModelName(),
        latencyMs: Date.now() - startTime,
        success: false,
        prompt: prompt || 'Diagnostic Ping',
        error: errResponse.message
      });
      return res.status(503).json(errResponse);
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey: keyInfo.apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const modelName = getResolvedModelName();
      const promptText = prompt || 'System Health Diagnostic Ping. Return valid JSON: {"status":"READY","engine":"Gemini","timestamp":' + Date.now() + '}';

      const response = await ai.models.generateContent({
        model: modelName,
        contents: promptText
      });

      const latencyMs = Date.now() - startTime;
      keyPoolManager.recordResult(keyInfo.slotIndex, true);

      recordAIInteraction({
        id: `ai-test-${Date.now()}`,
        timestamp: Date.now(),
        source: 'MANUAL_ADVISOR',
        model: modelName,
        slotIndex: keyInfo.slotIndex,
        maskedKey: keyInfo.maskedKey,
        latencyMs,
        success: true,
        prompt: promptText,
        rawResponse: response.text,
        decision: undefined
      });

      return res.json({
        success: true,
        status: 'success',
        slotIndex: keyInfo.slotIndex,
        maskedKey: keyInfo.maskedKey,
        model: modelName,
        latencyMs,
        response: response.text,
        timestamp: Date.now()
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errMsg = err?.message || String(err);
      const classification = classifyGeminiError(errMsg);

      keyPoolManager.recordResult(
        keyInfo.slotIndex,
        false,
        classification.type,
        errMsg
      );

      recordAIInteraction({
        id: `ai-test-${Date.now()}`,
        timestamp: Date.now(),
        source: 'MANUAL_ADVISOR',
        model: getResolvedModelName(),
        slotIndex: keyInfo.slotIndex,
        maskedKey: keyInfo.maskedKey,
        latencyMs,
        success: false,
        prompt: prompt || 'Diagnostic Ping',
        error: errMsg
      });

      return res.status(502).json({
        success: false,
        status: 'error',
        slotIndex: keyInfo.slotIndex,
        maskedKey: keyInfo.maskedKey,
        latencyMs,
        error: classification.type === 'AUTH' ? 'INVALID_API_KEY' : (classification.type === 'QUOTA' ? 'QUOTA_EXHAUSTED' : 'AI_GATEWAY_ERROR'),
        message: errMsg,
        solution: classification.userFriendlyReasonFa
      });
    }
  });

  // Alias for backward compatibility
  app.post('/api/v1/ai/analyze-context', async (req, res) => {
    const snap = req.body?.snapshot;
    if (!snap) {
      return res.status(400).json({ error: 'Missing market snapshot' });
    }
    const result = await analyzeMarketWithGemini(snap);
    res.json(result);
  });

  // Economic News
  app.get('/api/v1/news', (req, res) => {
    const symbol = (req.query.symbol as string) || 'XAUUSD';
    const events = newsProvider.getUpcomingEvents(symbol, 15, 15);
    res.json({
      symbol,
      events,
      blockActive: newsProvider.isNewsBlockActive(symbol, 15, 15)
    });
  });

  let globalAutoTradingAuthorized = true;

  // AutoTrading Control from Dashboard
  app.post('/api/v1/control/auto-trading', (req, res) => {
    const { enabled } = req.body;
    if (typeof enabled === 'boolean') {
      globalAutoTradingAuthorized = enabled;
    }
    res.json({
      success: true,
      autoTradingAuthorized: globalAutoTradingAuthorized,
      timestamp: Date.now()
    });
  });

  app.get('/api/v1/control/auto-trading', (req, res) => {
    res.json({
      autoTradingAuthorized: globalAutoTradingAuthorized,
      timestamp: Date.now()
    });
  });

  // EA Heartbeat
  app.post('/api/v1/ea/heartbeat', (req, res) => {
    const { installationId, autoTradingEnabled, symbol, timeframe, account } = req.body;
    const instId = installationId || 'ea-inst-default';

    dbStore.recordHeartbeat(instId, autoTradingEnabled ?? false, { symbol, timeframe, account });

    const event = auditLogger.logEvent(
      'HEARTBEAT',
      'EA',
      instId,
      `hb-${Date.now()}`,
      { autoTradingEnabled, symbol, timeframe, account },
      symbol,
      timeframe,
      'INFO'
    );
    realtimeStreamManager.broadcast(event);

    res.json({
      status: 'acknowledged',
      timestamp: Date.now(),
      serverAutoTradingAuthorized: globalAutoTradingAuthorized && (autoTradingEnabled === true)
    });
  });

  let lastAIAnalysisTimestamp = 0;
  let lastCachedAIDecision: GeminiDecisionResponse | null = null;
  let lastCachedRiskValidation: any = null;

  // EA Market Snapshot & Analysis Pipeline
  app.post('/api/v1/ea/market-snapshot', async (req, res) => {
    const correlationId = `corr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const instId = req.headers['x-installation-id'] as string || req.body.installationId || 'ea-inst-gold-01';

    try {
      const parsedSnapshot = MarketSnapshotSchema.parse({
        ...req.body,
        snapshotId: req.body.snapshotId || `snp-${Date.now()}`,
        installationId: instId,
        timestamp: Date.now()
      });

      // 1. Recalculate 0-100 Score deterministically
      const calculatedScore = strategyEngine.calculateSetupScore(parsedSnapshot);
      parsedSnapshot.score = calculatedScore;
      dbStore.addSnapshot(parsedSnapshot);

      // Broadcast the full live snapshot so Bid/Ask and SMC structures update live every second
      const snapEvent = auditLogger.logEvent(
        'MARKET_SNAPSHOT',
        'EA',
        instId,
        correlationId,
        {
          ...parsedSnapshot,
          score: calculatedScore
        },
        parsedSnapshot.symbol,
        parsedSnapshot.timeframe,
        'INFO'
      );
      realtimeStreamManager.broadcast(snapEvent);

      // 2. Trigger Gemini AI Analysis (Every ~30 seconds or if no cached decision exists)
      const now = Date.now();
      const shouldRunAI = (now - lastAIAnalysisTimestamp >= 25000) || !lastCachedAIDecision;

      let aiResult: any = null;
      let riskValidation = lastCachedRiskValidation;

      if (shouldRunAI) {
        lastAIAnalysisTimestamp = now;

        const aiReqEvent = auditLogger.logEvent(
          'AI_REQUEST',
          'BACKEND',
          instId,
          correlationId,
          {
            symbol: parsedSnapshot.symbol,
            bid: parsedSnapshot.bid,
            ask: parsedSnapshot.ask,
            score: calculatedScore.totalScore,
            marketStructure: calculatedScore.marketStructureScore
          },
          parsedSnapshot.symbol,
          parsedSnapshot.timeframe,
          'INFO'
        );
        realtimeStreamManager.broadcast(aiReqEvent);

        // Call Gemini Gateway
        aiResult = await analyzeMarketWithGemini(parsedSnapshot);

        if (aiResult && aiResult.decision) {
          lastCachedAIDecision = aiResult.decision;

          dbStore.addAIInteraction({
            id: `ai-int-${Date.now()}`,
            timestamp: Date.now(),
            correlationId,
            installationId: instId,
            symbol: parsedSnapshot.symbol,
            timeframe: parsedSnapshot.timeframe,
            slotIndex: aiResult.slotIndex,
            maskedKey: aiResult.maskedKey,
            latencyMs: aiResult.latencyMs,
            promptVersion: PROMPT_VERSION,
            softwareVersion: SOFTWARE_VERSION,
            snapshot: parsedSnapshot,
            decision: aiResult.decision,
            isFallback: aiResult.isFallback,
            error: aiResult.error
          });

          const aiRespEvent = auditLogger.logEvent(
            'AI_DECISION',
            'GEMINI_GATEWAY',
            instId,
            correlationId,
            {
              decision: aiResult.decision,
              latencyMs: aiResult.latencyMs,
              slotIndex: aiResult.slotIndex,
              reasoning: aiResult.decision.reasonsFa?.join(' ') || '',
              setupScore: calculatedScore.totalScore
            },
            parsedSnapshot.symbol,
            parsedSnapshot.timeframe,
            'INFO'
          );
          realtimeStreamManager.broadcast(aiRespEvent);

          // 3. Perform Deterministic Risk Validation
          riskValidation = riskEngine.validateTrade(parsedSnapshot, aiResult.decision);
          lastCachedRiskValidation = riskValidation;
          dbStore.addRiskValidation(correlationId, riskValidation);

          const riskEvent = auditLogger.logEvent(
            'RISK_VALIDATION',
            'BACKEND',
            instId,
            correlationId,
            { validation: riskValidation },
            parsedSnapshot.symbol,
            parsedSnapshot.timeframe,
            riskValidation.approved ? 'INFO' : 'WARN'
          );
          realtimeStreamManager.broadcast(riskEvent);
        }
      } else {
        // Use active cached AI decision for inter-cycle ticks
        aiResult = {
          success: true,
          decision: lastCachedAIDecision,
          isCached: true
        };
      }

      res.json({
        correlationId,
        snapshotId: parsedSnapshot.snapshotId,
        calculatedScore,
        aiAnalysis: aiResult?.decision || lastCachedAIDecision,
        riskValidation,
        timestamp: Date.now()
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      res.status(400).json({ error: 'Malformed market snapshot', details: errMsg });
    }
  });

  // Dedicated Advisor On-Demand Real Analysis
  app.post('/api/v1/advisor/analyze', async (req, res) => {
    const correlationId = `advisor-${Date.now()}`;
    const recentSnapshots = dbStore.getSnapshots(1);
    const snap = req.body?.snapshot || (recentSnapshots.length > 0 ? recentSnapshots[0] : null);

    if (!snap) {
      return res.status(400).json({ error: 'No live market snapshot available' });
    }

    try {
      const calculatedScore = strategyEngine.calculateSetupScore(snap);
      snap.score = calculatedScore;

      const aiResult = await analyzeMarketWithGemini(snap);
      if (aiResult?.decision) {
        lastAIAnalysisTimestamp = Date.now();
        lastCachedAIDecision = aiResult.decision;

        const aiRespEvent = auditLogger.logEvent(
          'AI_DECISION',
          'GEMINI_GATEWAY',
          'advisor-manual',
          correlationId,
          {
            decision: aiResult.decision,
            latencyMs: aiResult.latencyMs,
            slotIndex: aiResult.slotIndex,
            reasoning: aiResult.decision.reasonsFa?.join(' ') || '',
            setupScore: calculatedScore.totalScore
          },
          snap.symbol,
          snap.timeframe,
          'INFO'
        );
        realtimeStreamManager.broadcast(aiRespEvent);
      }

      res.json({
        success: aiResult.success,
        decision: aiResult.decision,
        latencyMs: aiResult.latencyMs,
        isFallback: aiResult.isFallback,
        error: aiResult.error
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Advisor analysis failed' });
    }
  });

  // EA Execution Result Callback
  app.post('/api/v1/ea/execution-result', (req, res) => {
    const { correlationId, installationId, symbol, ticket, action, lots, openPrice, sl, tp, success, error } = req.body;
    const instId = installationId || 'ea-inst-gold-01';

    if (!correlationId || !dbStore.hasCorrelationId(correlationId)) {
      return res.status(400).json({
        error: 'Invalid or unapproved trade correlation ID',
        details: 'The specified correlationId was not initiated or approved by the backend risk/analysis engine'
      });
    }

    if (success && ticket) {
      dbStore.addTrade({
        tradeId: `trd-${ticket}`,
        ticket,
        installationId: instId,
        symbol: symbol || 'XAUUSD',
        timeframe: 'M5',
        type: action || 'BUY',
        lots: lots || 0.1,
        openPrice: openPrice || 0,
        openTime: Date.now(),
        sl: sl || 0,
        tp: tp || 0,
        status: 'OPEN',
        partialClosedLots: 0,
        isRunner: false,
        scoreAtEntry: 85,
        aiDecisionId: `dec-${correlationId}`,
        snapshotId: `snp-${correlationId}`,
        correlationId: correlationId || `corr-${Date.now()}`,
        strategyVersion: STRATEGY_VERSION,
        promptVersion: PROMPT_VERSION,
        softwareVersion: SOFTWARE_VERSION
      });
    }

    const event = auditLogger.logEvent(
      'EXECUTION_RESULT',
      'EA',
      instId,
      correlationId || `corr-${Date.now()}`,
      { ticket, action, lots, openPrice, success, error },
      symbol,
      'M5',
      success ? 'INFO' : 'ERROR'
    );
    realtimeStreamManager.broadcast(event);

    res.json({ status: 'recorded', timestamp: Date.now() });
  });

  // Position Management Update
  app.post('/api/v1/ea/position-update', (req, res) => {
    const { ticket, status, partialClosedLots, closePrice, pnlUSD, isRunner, newSL } = req.body;

    dbStore.updateTrade(ticket?.toString(), {
      status,
      partialClosedLots,
      closePrice,
      closeTime: status === 'CLOSED' ? Date.now() : undefined,
      pnlUSD,
      isRunner,
      sl: newSL
    });

    res.json({ status: 'updated' });
  });

  // Event Stream (SSE) for Dashboard
  app.get('/api/v1/events/stream', (req, res) => {
    try {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
      realtimeStreamManager.addClient(res);
    } catch (e) {
      if (!res.headersSent) {
        res.status(200).json({ status: 'fallback_polling' });
      }
    }
  });

  // Recent Events REST
  app.get('/api/v1/events', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    res.json({ events: dbStore.getEvents(limit) });
  });

  // Trades List REST
  app.get('/api/v1/trades', (req, res) => {
    res.json({ trades: dbStore.getTrades() });
  });

  // Trade Traceability
  app.get('/api/v1/trades/:tradeId/traceability', (req, res) => {
    const { tradeId } = req.params;
    const traceability = dbStore.getTradeTraceability(tradeId);
    if (!traceability) {
      return res.status(404).json({ error: 'Trade ID not found in history' });
    }
    res.json(traceability);
  });

  // Performance Reports
  app.get('/api/v1/reports', (req, res) => {
    const start = req.query.start ? parseInt(req.query.start as string) : undefined;
    const end = req.query.end ? parseInt(req.query.end as string) : undefined;
    res.json(dbStore.generatePerformanceReport(start, end));
  });

  // Export Data JSON
  app.get('/api/v1/reports/export', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="smart-trading-export-${Date.now()}.json"`);
    res.send(JSON.stringify(dbStore.exportDataJSON(), null, 2));
  });

  // Catch-all 404 handler for API routes
  app.use('/api', (req, res) => {
    res.status(404).json({
      status: 'error',
      error: 'Endpoint not found',
      path: req.url,
      method: req.method,
      availableEndpoints: [
        '/api/v1/health',
        '/api/v1/keypool',
        '/api/v1/ai/test',
        '/api/v1/news',
        '/api/v1/ea/heartbeat',
        '/api/v1/ea/market-snapshot',
        '/api/v1/ea/execution-result',
        '/api/v1/ea/position-update',
        '/api/v1/trades',
        '/api/v1/events',
        '/api/v1/events/stream',
        '/api/v1/reports'
      ]
    });
  });

  // Global Error Handler for Serverless stability
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Server Error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: err?.message || String(err),
        timestamp: Date.now()
      });
    }
  });

  return app;
}
