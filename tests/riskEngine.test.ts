import { riskEngine } from '../server/riskEngine';
import { MarketSnapshot } from '../shared/schemas';

function testRiskEngine() {
  console.log('--- Running Risk Engine Tests ---');

  const baseSnapshot: MarketSnapshot = {
    snapshotId: 'test-snp-1',
    installationId: 'inst-1',
    symbol: 'XAUUSD',
    timeframe: 'M5',
    timestamp: Date.now(),
    bid: 2420.0,
    ask: 2420.3,
    spreadPts: 3.0,
    atr: 10.0,
    multiTimeframe: {
      higherTimeframe: { timeframe: 'H4', bias: 'BULLISH', structure: 'BULLISH_BOS' },
      middleTimeframe: { timeframe: 'M15', bias: 'BULLISH', activeZone: 'FVG' },
      lowerTimeframe: { timeframe: 'M5', bias: 'BULLISH', entryTrigger: 'CHOCH' },
      alignment: true
    },
    structureEvents: [],
    displacement: { type: 'STRONG_DISPLACEMENT', timeframe: 'M5', atrMultiple: 2, candleBodyRatio: 0.8, impulseSpeedPtsPerSec: 4, direction: 'BULLISH' },
    fvgs: [],
    orderBlocks: [],
    liquidity: [],
    srZones: [],
    newsContext: [],
    score: {
      marketStructureScore: 25,
      displacementScore: 20,
      fvgScore: 15,
      orderBlockScore: 15,
      liquidityScore: 10,
      srScore: 10,
      newsScore: 5,
      totalScore: 100,
      qualifies: true
    },
    autoTradingEnabled: false, // AutoTrading disabled test
    account: {
      balance: 10000,
      equity: 10000,
      margin: 0,
      freeMargin: 10000,
      openPositionsCount: 0,
      dailyPnL: 0,
      drawdownPercent: 0
    }
  };

  // Test 1: AutoTrading disabled should REJECT
  const validation1 = riskEngine.validateTrade(baseSnapshot);
  if (!validation1.approved && validation1.checks.autoTradingCheck === false) {
    console.log('✅ Risk Test 1 PASSED: Correctly rejected when AutoTrading=false');
  } else {
    throw new Error('❌ Risk Test 1 FAILED');
  }

  // Test 2: AutoTrading enabled + valid Gemini BUY decision should APPROVE
  const snapshot2 = { ...baseSnapshot, autoTradingEnabled: true };
  const mockBuyDecision: any = {
    bias: 'BULLISH',
    decision: 'BUY',
    setupQuality: 90,
    confidenceLabel: 'HIGH',
    reasonsFa: ['تایید خرید'],
    warningsFa: [],
    invalidatingConditionsFa: [],
    suggestedTrade: {
      action: 'BUY',
      symbol: 'XAUUSD',
      suggestedSL: 2400.0, // 20.3 pts stop (> 15 pts min)
      suggestedTP: 2460.0, // 39.7 pts tp (RR ~ 2.0)
      riskRewardRatio: 2.0
    }
  };
  const validation2 = riskEngine.validateTrade(snapshot2, mockBuyDecision);
  if (validation2.approved) {
    console.log('✅ Risk Test 2 PASSED: Approved when AutoTrading=true, Gemini BUY decision provided, and all checks pass');
  } else {
    throw new Error(`❌ Risk Test 2 FAILED: ${validation2.rejectionReasonsFa.join(', ')}`);
  }

  // Test 3: Gemini NO_TRADE decision must REJECT (Fail-Closed)
  const mockNoTradeDecision: any = {
    bias: 'NEUTRAL',
    decision: 'NO_TRADE',
    setupQuality: 80,
    confidenceLabel: 'LOW',
    reasonsFa: ['عدم ورود'],
    warningsFa: [],
    invalidatingConditionsFa: []
  };
  const validation3 = riskEngine.validateTrade(snapshot2, mockNoTradeDecision);
  if (!validation3.approved && validation3.rejectionReasonsFa.some(r => r.includes('Fail-Closed'))) {
    console.log('✅ Risk Test 3 PASSED: Correctly rejected when Gemini decision is NO_TRADE (Fail-Closed)');
  } else {
    throw new Error('❌ Risk Test 3 FAILED: Fail-Closed enforcement failed for NO_TRADE decision');
  }
}

testRiskEngine();
