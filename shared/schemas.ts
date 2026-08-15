import { z } from 'zod';

// Market Bias Enum
export const MarketBiasSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    const clean = val.replace(/^BIAS_/, '').toUpperCase();
    if (['BULLISH', 'BEARISH', 'NEUTRAL', 'NO_TRADE'].includes(clean)) {
      return clean;
    }
  }
  return val;
}, z.enum(['BULLISH', 'BEARISH', 'NEUTRAL', 'NO_TRADE']));
export type MarketBias = z.infer<typeof MarketBiasSchema>;

// AI Action Decision Enum
export const AIDecisionSchema = z.enum([
  'BUY',
  'SELL',
  'WAIT',
  'NO_TRADE',
  'HOLD',
  'EXIT',
  'PARTIAL_CLOSE',
  'MOVE_STOP'
]);
export type AIDecision = z.infer<typeof AIDecisionSchema>;

// Confidence Label
export const ConfidenceLabelSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

// Structure Event Schema
export const StructureEventSchema = z.object({
  id: z.string(),
  type: z.enum(['SWING_HIGH', 'SWING_LOW', 'BOS_BULLISH', 'BOS_BEARISH', 'MSS_BULLISH', 'MSS_BEARISH']),
  timeframe: z.string(),
  price: z.number(),
  timestamp: z.number(),
  referencePrice: z.number().optional(),
  confidence: z.number().min(0).max(100)
});

// FVG Item Schema
export const FVGSchema = z.object({
  id: z.string(),
  type: z.enum(['BULLISH', 'BEARISH']),
  timeframe: z.string(),
  topPrice: z.number(),
  bottomPrice: z.number(),
  midPrice: z.number(),
  widthPts: z.number(),
  creationTime: z.number(),
  status: z.enum(['DETECTED', 'VALID_CANDIDATE', 'MITIGATED', 'INVALIDATED', 'EXPIRED']),
  fillPercentage: z.number().min(0).max(100)
});

// Order Block Schema
export const OrderBlockSchema = z.object({
  id: z.string(),
  type: z.enum(['BULLISH', 'BEARISH']),
  timeframe: z.string(),
  highPrice: z.number(),
  lowPrice: z.number(),
  creationTime: z.number(),
  status: z.enum(['DETECTED', 'VALID_CANDIDATE', 'MITIGATED', 'INVALIDATED', 'EXPIRED']),
  strengthScore: z.number().min(0).max(100)
});

// Displacement Event Schema
export const DisplacementSchema = z.object({
  type: z.enum(['NONE', 'WEAK', 'NORMAL', 'STRONG_DISPLACEMENT']),
  timeframe: z.string(),
  atrMultiple: z.number(),
  candleBodyRatio: z.number(),
  impulseSpeedPtsPerSec: z.number(),
  direction: z.enum(['BULLISH', 'BEARISH', 'NEUTRAL'])
});

// Liquidity Condition Schema
export const LiquiditySchema = z.object({
  type: z.enum(['EQUAL_HIGHS', 'EQUAL_LOWS', 'SWING_HIGH_LIQUIDITY', 'SWING_LOW_LIQUIDITY', 'LIQUIDITY_SWEEP']),
  price: z.number(),
  timeframe: z.string(),
  isSwept: z.boolean(),
  sweepTimestamp: z.number().optional()
});

// Support / Resistance Zone Schema
export const SRZoneSchema = z.object({
  id: z.string(),
  type: z.enum(['SUPPORT', 'RESISTANCE']),
  priceMin: z.number(),
  priceMax: z.number(),
  rejectionCount: z.number(),
  timeframe: z.string(),
  proximityPts: z.number()
});

// News Context Schema
export const NewsEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  currency: z.string(),
  impact: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  eventTimestamp: z.number(),
  affectedSymbols: z.array(z.string()),
  isHighImpact: z.boolean(),
  minutesUntil: z.number(),
  isWithinBlockWindow: z.boolean()
});

// Score Breakdown Schema (0-100 total)
export const ScoreBreakdownSchema = z.object({
  marketStructureScore: z.number().min(0).max(25),
  displacementScore: z.number().min(0).max(20),
  fvgScore: z.number().min(0).max(15),
  orderBlockScore: z.number().min(0).max(15),
  liquidityScore: z.number().min(0).max(10),
  srScore: z.number().min(0).max(10),
  newsScore: z.number().min(0).max(5),
  totalScore: z.number().min(0).max(100),
  qualifies: z.boolean() // totalScore >= 80
});

// Multi-Timeframe Analysis Summary
export const MultiTimeframeSummarySchema = z.object({
  higherTimeframe: z.object({
    timeframe: z.string().default('H4'), // H4 or H1
    bias: MarketBiasSchema.default('NEUTRAL'),
    structure: z.string().default('TRENDING'),
    keyLevel: z.number().optional()
  }).default({ timeframe: 'H4', bias: 'NEUTRAL', structure: 'TRENDING' }),
  middleTimeframe: z.object({
    timeframe: z.string().default('M15'), // M15
    bias: MarketBiasSchema.default('NEUTRAL'),
    activeZone: z.string().optional().default('ORDER_BLOCK_ZONE')
  }).default({ timeframe: 'M15', bias: 'NEUTRAL', activeZone: 'ORDER_BLOCK_ZONE' }),
  lowerTimeframe: z.object({
    timeframe: z.string().default('M5'), // M5 or M1
    bias: MarketBiasSchema.default('NEUTRAL'),
    entryTrigger: z.string().optional().default('CONFIRMED')
  }).default({ timeframe: 'M5', bias: 'NEUTRAL', entryTrigger: 'CONFIRMED' }),
  alignment: z.boolean().default(false)
});

// Market Snapshot sent by EA
export const MarketSnapshotSchema = z.object({
  snapshotId: z.string().optional().default(() => `snp-${Date.now()}`),
  installationId: z.string().optional().default('ea-inst-gold-01'),
  symbol: z.string().default('XAUUSD'),
  timeframe: z.string().default('PERIOD_M5'),
  timestamp: z.number().optional().default(() => Date.now()),
  bid: z.coerce.number(),
  ask: z.coerce.number(),
  spreadPts: z.coerce.number(),
  atr: z.coerce.number().default(1.5),
  multiTimeframe: MultiTimeframeSummarySchema.optional().default({
    higherTimeframe: { timeframe: 'H4', bias: 'NEUTRAL', structure: 'TRENDING' },
    middleTimeframe: { timeframe: 'M15', bias: 'NEUTRAL', activeZone: 'ORDER_BLOCK_ZONE' },
    lowerTimeframe: { timeframe: 'M5', bias: 'NEUTRAL', entryTrigger: 'CONFIRMED' },
    alignment: false
  }),
  structureEvents: z.array(StructureEventSchema).optional().default([]),
  displacement: DisplacementSchema.optional().default({
    type: 'NONE',
    timeframe: 'M5',
    atrMultiple: 1.0,
    candleBodyRatio: 0.5,
    impulseSpeedPtsPerSec: 1.0,
    direction: 'NEUTRAL'
  }),
  fvgs: z.array(FVGSchema).optional().default([]),
  orderBlocks: z.array(OrderBlockSchema).optional().default([]),
  liquidity: z.array(LiquiditySchema).optional().default([]),
  srZones: z.array(SRZoneSchema).optional().default([]),
  newsContext: z.array(NewsEventSchema).optional().default([]),
  score: ScoreBreakdownSchema.optional(),
  autoTradingEnabled: z.boolean().optional().default(false),
  account: z.object({
    balance: z.coerce.number().default(0),
    equity: z.coerce.number().default(0),
    margin: z.coerce.number().default(0),
    freeMargin: z.coerce.number().default(0),
    openPositionsCount: z.coerce.number().default(0),
    dailyPnL: z.coerce.number().default(0),
    drawdownPercent: z.coerce.number().default(0)
  }).optional()
});
export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;

// Gemini Structured AI Output Schema
export const GeminiDecisionResponseSchema = z.object({
  bias: MarketBiasSchema,
  decision: AIDecisionSchema,
  setupQuality: z.number().min(0).max(100),
  confidenceLabel: ConfidenceLabelSchema,
  bullishProbability: z.number().min(0).max(100).optional().default(50),
  bearishProbability: z.number().min(0).max(100).optional().default(50),
  reasonsFa: z.array(z.string()), // Persian reasons
  warningsFa: z.array(z.string()), // Persian warnings
  invalidatingConditionsFa: z.array(z.string()), // Invalidation conditions
  suggestedTrade: z.object({
    action: z.enum(['BUY', 'SELL', 'WAIT', 'NONE']),
    symbol: z.string(),
    suggestedSL: z.number(),
    suggestedTP: z.number(),
    riskRewardRatio: z.number(),
    notesFa: z.string().optional()
  }).optional(),
  positionManagement: z.object({
    action: z.enum(['HOLD', 'EXIT', 'PARTIAL_CLOSE', 'MOVE_STOP', 'NONE']),
    targetPositionId: z.string().optional(),
    closePercentage: z.number().optional(), // e.g. 50
    newSL: z.number().optional(),
    reasonFa: z.string().optional()
  }).optional()
});
export type GeminiDecisionResponse = z.infer<typeof GeminiDecisionResponseSchema>;

// Deterministic Risk Validation Result
export const RiskValidationSchema = z.object({
  approved: z.boolean(),
  rejectionReasonsFa: z.array(z.string()),
  calculatedLotSize: z.number(),
  riskAmountUSD: z.number(),
  riskPercent: z.number(),
  riskRewardRatio: z.number(),
  stopLossDistancePts: z.number(),
  takeProfitDistancePts: z.number(),
  checks: z.object({
    autoTradingCheck: z.boolean(),
    scoreCheck: z.boolean(),
    spreadCheck: z.boolean(),
    newsCheck: z.boolean(),
    rrCheck: z.boolean(),
    stopDistanceCheck: z.boolean(),
    maxRiskCheck: z.boolean(),
    maxPositionsCheck: z.boolean(),
    dailyLossCheck: z.boolean(),
    drawdownCheck: z.boolean(),
    cooldownCheck: z.boolean(),
    duplicateCheck: z.boolean()
  })
});
export type RiskValidation = z.infer<typeof RiskValidationSchema>;

// Trade Record Schema
export const TradeRecordSchema = z.object({
  tradeId: z.string(),
  ticket: z.number(),
  installationId: z.string(),
  symbol: z.string(),
  timeframe: z.string(),
  type: z.enum(['BUY', 'SELL']),
  lots: z.number(),
  openPrice: z.number(),
  openTime: z.number(),
  sl: z.number(),
  tp: z.number(),
  closePrice: z.number().optional(),
  closeTime: z.number().optional(),
  pnlUSD: z.number().optional(),
  pnlPercent: z.number().optional(),
  status: z.enum(['OPEN', 'PARTIALLY_CLOSED', 'CLOSED', 'CANCELLED']),
  partialClosedLots: z.number().default(0),
  isRunner: z.boolean().default(false),
  scoreAtEntry: z.number(),
  aiDecisionId: z.string(),
  snapshotId: z.string(),
  correlationId: z.string(),
  strategyVersion: z.string(),
  promptVersion: z.string(),
  softwareVersion: z.string()
});
export type TradeRecord = z.infer<typeof TradeRecordSchema>;

// Event Envelope Schema
export const EventEnvelopeSchema = z.object({
  eventId: z.string(),
  eventType: z.enum([
    'MARKET_SNAPSHOT',
    'TECHNICAL_ANALYSIS',
    'SETUP_DETECTED',
    'SCORE_CALCULATED',
    'NEWS_UPDATE',
    'AI_REQUEST',
    'AI_RESPONSE',
    'AI_DECISION',
    'RISK_VALIDATION',
    'EXECUTION_REQUEST',
    'EXECUTION_RESULT',
    'POSITION_OPENED',
    'POSITION_UPDATED',
    'PARTIAL_CLOSE',
    'STOP_MOVED',
    'POSITION_CLOSED',
    'HEARTBEAT',
    'ERROR',
    'WARNING',
    'SYNC',
    'SYSTEM_HEALTH'
  ]),
  timestamp: z.number(),
  source: z.enum(['EA', 'BACKEND', 'GEMINI_GATEWAY', 'UI', 'ELECTRON']),
  sessionId: z.string(),
  installationId: z.string(),
  symbol: z.string().optional(),
  timeframe: z.string().optional(),
  correlationId: z.string(),
  causationId: z.string().optional(),
  strategyVersion: z.string(),
  softwareVersion: z.string(),
  payload: z.record(z.string(), z.any()),
  severity: z.enum(['INFO', 'WARN', 'ERROR', 'CRITICAL'])
});
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

// API Key Health Status Schema
export const APIKeySlotStatusSchema = z.object({
  slotIndex: z.number(),
  keyMasked: z.string(),
  isConfigured: z.boolean(),
  status: z.enum(['HEALTHY', 'COOLDOWN', 'QUOTA_EXHAUSTED', 'AUTH_ERROR', 'DISABLED']),
  requestCount: z.number(),
  successCount: z.number(),
  failureCount: z.number(),
  lastUsedTimestamp: z.number().optional(),
  cooldownExpiresAt: z.number().optional(),
  lastError: z.string().optional()
});
