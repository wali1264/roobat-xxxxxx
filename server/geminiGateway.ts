import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { keyPoolManager, classifyGeminiError } from './geminiKeyPool';
import { GeminiDecisionResponse, GeminiDecisionResponseSchema, MarketSnapshot } from '../shared/schemas';
import { PROMPT_VERSION } from '../shared/constants';

/**
 * Resolves the appropriate model name, guaranteeing that invalid/deprecated model strings
 * (e.g. gemini-2.5-flash which returns 404 in Google GenAI API)
 * are safely translated to the official, fast, high-quota 'gemini-2.0-flash'.
 */
export function getResolvedModelName(): string {
  const rawModel = (process.env.GEMINI_MODEL || '').trim();
  if (!rawModel) return 'gemini-2.0-flash';

  const cleaned = rawModel.replace(/^models\//, '');
  // Translate unofficial or 404-prone identifiers to the official high-quota flash model
  if (cleaned === 'gemini-2.5-flash' || cleaned === '2.5-flash' || cleaned === 'gemini-2.5') {
    return 'gemini-2.0-flash';
  }
  return cleaned;
}

let systemPromptText = '';
try {
  const promptPath = path.join(process.cwd(), 'server', 'ai', 'prompts', 'trading-v1.md');
  systemPromptText = fs.readFileSync(promptPath, 'utf-8');
} catch (e) {
  systemPromptText = `You are a Quantitative AI Analyst. Respond with structured JSON matching the strategy rules.`;
}

export interface AIInteractionRecord {
  id: string;
  timestamp: number;
  source: 'EA_AUTOMATION' | 'MANUAL_ADVISOR' | 'SYSTEM_PING';
  model: string;
  slotIndex?: number;
  maskedKey?: string;
  latencyMs: number;
  success: boolean;
  prompt: string;
  promptPayload?: any;
  rawResponse?: string;
  decision?: GeminiDecisionResponse;
  error?: string;
}

const aiInteractionHistory: AIInteractionRecord[] = [];

export function recordAIInteraction(record: AIInteractionRecord) {
  aiInteractionHistory.unshift(record);
  if (aiInteractionHistory.length > 100) {
    aiInteractionHistory.pop();
  }
}

export function getAIInteractions(): AIInteractionRecord[] {
  return [...aiInteractionHistory];
}

export interface GeminiAnalysisResult {
  success: boolean;
  decision?: GeminiDecisionResponse;
  slotIndex?: number;
  maskedKey?: string;
  latencyMs: number;
  error?: string;
  isFallback: boolean;
  rawResponse?: string;
}

export async function analyzeMarketWithGemini(snapshot: MarketSnapshot): Promise<GeminiAnalysisResult> {
  const startTime = Date.now();
  const poolStatus = keyPoolManager.getPoolStatus();
  const maxAttempts = Math.max(1, Math.min(3, poolStatus.length || 1));

  let lastErrorMsg = 'No key available';
  let lastClassifiedReasonFa = 'کلیدهای هوش مصنوعی در دسترس نیستند';
  let lastAttemptedSlotIndex: number | undefined;
  let lastAttemptedMaskedKey: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const keyInfo = keyPoolManager.getNextKey();
    if (!keyInfo) {
      lastErrorMsg = 'تمامی کلیدها در حالت استندبای موقت (۷۵ ثانیه‌ای) هستند';
      break;
    }

    lastAttemptedSlotIndex = keyInfo.slotIndex;
    lastAttemptedMaskedKey = keyInfo.maskedKey;

    try {
      const ai = new GoogleGenAI({
        apiKey: keyInfo.apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const modelName = getResolvedModelName();

      const promptPayload = {
        task: 'EVALUATE_MARKET_SETUP',
        symbol: snapshot.symbol,
        timeframe: snapshot.timeframe,
        bid: snapshot.bid,
        ask: snapshot.ask,
        spreadPts: snapshot.spreadPts,
        score: snapshot.score,
        multiTimeframe: snapshot.multiTimeframe,
        displacement: snapshot.displacement,
        fvgs: snapshot.fvgs,
        orderBlocks: snapshot.orderBlocks,
        liquidity: snapshot.liquidity,
        srZones: snapshot.srZones,
        newsContext: snapshot.newsContext,
        account: snapshot.account
      };

      const promptText = `Perform rigorous contextual analysis on this MT5 market snapshot:\n${JSON.stringify(promptPayload, null, 2)}`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          { text: promptText }
        ],
        config: {
          systemInstruction: systemPromptText,
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bias: { type: Type.STRING, description: 'BULLISH, BEARISH, NEUTRAL, or NO_TRADE' },
              decision: { type: Type.STRING, description: 'BUY, SELL, WAIT, NO_TRADE, HOLD, EXIT, PARTIAL_CLOSE, MOVE_STOP' },
              setupQuality: { type: Type.NUMBER, description: '0 to 100 quality score' },
              confidenceLabel: { type: Type.STRING, description: 'HIGH, MEDIUM, or LOW' },
              bullishProbability: { type: Type.NUMBER, description: 'Statistical probability 0 to 100 that market will move up' },
              bearishProbability: { type: Type.NUMBER, description: 'Statistical probability 0 to 100 that market will move down' },
              reasonsFa: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Persian explanations of setup rationale'
              },
              warningsFa: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Persian warnings or risk factors'
              },
              invalidatingConditionsFa: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Conditions that cancel this setup'
              },
              suggestedTrade: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING },
                  symbol: { type: Type.STRING },
                  suggestedSL: { type: Type.NUMBER },
                  suggestedTP: { type: Type.NUMBER },
                  riskRewardRatio: { type: Type.NUMBER },
                  notesFa: { type: Type.STRING }
                }
              },
              positionManagement: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING },
                  targetPositionId: { type: Type.STRING },
                  closePercentage: { type: Type.NUMBER },
                  newSL: { type: Type.NUMBER },
                  reasonFa: { type: Type.STRING }
                }
              }
            },
            required: ['bias', 'decision', 'setupQuality', 'confidenceLabel', 'bullishProbability', 'bearishProbability', 'reasonsFa', 'warningsFa', 'invalidatingConditionsFa']
          }
        }
      });

      const latencyMs = Date.now() - startTime;
      const rawText = response.text || '';
      const parsed = JSON.parse(rawText);
      const validated = GeminiDecisionResponseSchema.parse(parsed);

      keyPoolManager.recordResult(keyInfo.slotIndex, true);

      recordAIInteraction({
        id: `ai-log-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        timestamp: Date.now(),
        source: 'EA_AUTOMATION',
        model: modelName,
        slotIndex: keyInfo.slotIndex,
        maskedKey: keyInfo.maskedKey,
        latencyMs,
        success: true,
        prompt: promptText,
        promptPayload,
        rawResponse: rawText,
        decision: validated
      });

      return {
        success: true,
        decision: validated,
        slotIndex: keyInfo.slotIndex,
        maskedKey: keyInfo.maskedKey,
        latencyMs,
        rawResponse: rawText,
        isFallback: false
      };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      lastErrorMsg = errMsg;

      const classification = classifyGeminiError(errMsg);
      lastClassifiedReasonFa = classification.userFriendlyReasonFa;

      keyPoolManager.recordResult(keyInfo.slotIndex, false, classification.type, errMsg);

      // If there are other configured keys, immediately continue to next iteration/key
      if (attempt < maxAttempts) {
        continue;
      }
    }
  }

  // If all attempts failed or pool exhausted, return safe Fail-Closed fallback
  const latencyMs = Date.now() - startTime;
  const fallback = generateDeterministicFallback(snapshot, lastClassifiedReasonFa);

  recordAIInteraction({
    id: `ai-log-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    timestamp: Date.now(),
    source: 'EA_AUTOMATION',
    model: getResolvedModelName(),
    slotIndex: lastAttemptedSlotIndex,
    maskedKey: lastAttemptedMaskedKey,
    latencyMs,
    success: false,
    prompt: `Analyze Market Snapshot for ${snapshot.symbol}`,
    promptPayload: snapshot,
    error: lastErrorMsg,
    decision: fallback
  });

  return {
    success: false,
    decision: fallback,
    slotIndex: lastAttemptedSlotIndex,
    maskedKey: lastAttemptedMaskedKey,
    latencyMs,
    error: lastErrorMsg,
    isFallback: true
  };
}

/**
 * Fail-Closed fallback when Gemini AI is unavailable, key pool exhausted, or error occurs.
 * Enforces NO_TRADE decision so no trade can ever be executed without direct live Gemini AI authorization.
 */
export function generateDeterministicFallback(snapshot: MarketSnapshot, reason: string): GeminiDecisionResponse {
  const htfBias = snapshot.multiTimeframe?.higherTimeframe?.bias || 'NEUTRAL';
  const score = snapshot.score?.totalScore || 0;
  
  let bullishProb = 50;
  let bearishProb = 50;
  if (htfBias === 'BULLISH') {
    bullishProb = Math.min(85, Math.max(52, Math.round(50 + (score / 100) * 32)));
    bearishProb = 100 - bullishProb;
  } else if (htfBias === 'BEARISH') {
    bearishProb = Math.min(85, Math.max(52, Math.round(50 + (score / 100) * 32)));
    bullishProb = 100 - bearishProb;
  }

  return {
    bias: 'NO_TRADE',
    decision: 'NO_TRADE',
    setupQuality: score,
    confidenceLabel: 'LOW',
    bullishProbability: bullishProb,
    bearishProbability: bearishProb,
    reasonsFa: [
      'عدم دسترسی به سرویس هوش مصنوعی Gemini (قانون Fail-Closed).',
      `علت: ${reason}`
    ],
    warningsFa: [
      'سرویس هوش مصنوعی در دسترس نیست یا تمامی کلیدهای API منقضی/محدود شده‌اند.',
      'بر اساس الزامات امنیتی سیستم، معامله بدون تایید صریح هوش مصنوعی قدغن است (Fail-Closed).'
    ],
    invalidatingConditionsFa: ['عدم دریافت پاسخ معتبر از Gemini AI Gateway'],
    suggestedTrade: {
      action: 'NONE',
      symbol: snapshot.symbol,
      suggestedSL: 0,
      suggestedTP: 0,
      riskRewardRatio: 0,
      notesFa: 'معامله لغو شد: عدم پاسخگویی هوش مصنوعی (Fail-Closed Enforcement)'
    }
  };
}
