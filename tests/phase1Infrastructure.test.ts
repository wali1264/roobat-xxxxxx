import fs from 'fs';
import path from 'path';
import { DatabaseStore } from '../server/db';
import { validateEaAuth } from '../server/middleware/eaAuth';
import { generateDeterministicFallback } from '../server/geminiGateway';
import { riskEngine } from '../server/riskEngine';
import { MarketSnapshot } from '../shared/schemas';

async function runPhase1InfrastructureTests() {
  console.log('==================================================');
  console.log('--- RUNNING REMEDIATION PHASE 1 INTEGRITY TESTS ---');
  console.log('==================================================');

  // 1. Database Persistence Test
  const testDbPath = path.join(process.cwd(), 'data', `test_db_${Date.now()}.db`);
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  const db1 = new DatabaseStore(testDbPath);
  await db1.waitReady();

  // Verify initial state is completely clean (NO demo data)
  const initialTrades = db1.getTrades();
  if (initialTrades.length !== 0) {
    throw new Error(`❌ DB Persistence Test FAILED: Expected 0 initial trades, found ${initialTrades.length}`);
  }
  console.log('✅ DB Test 1 PASSED: Database starts completely clean with 0 demo trades.');

  // Add a real trade record and verify insertion
  const sampleTrade: any = {
    tradeId: 'trd-test-101',
    ticket: 100001,
    installationId: 'ea-inst-test',
    symbol: 'XAUUSD',
    timeframe: 'M5',
    type: 'BUY',
    lots: 0.1,
    openPrice: 2420.0,
    openTime: Date.now(),
    sl: 2410.0,
    tp: 2440.0,
    status: 'OPEN',
    partialClosedLots: 0,
    isRunner: false,
    scoreAtEntry: 88,
    aiDecisionId: 'dec-test-1',
    snapshotId: 'snp-test-1',
    correlationId: 'corr-test-1',
    strategyVersion: 'SMC-V1',
    promptVersion: 'P-V1',
    softwareVersion: '1.0.0'
  };

  db1.addTrade(sampleTrade);
  db1.addRiskValidation('corr-test-1', {
    approved: true,
    rejectionReasonsFa: [],
    calculatedLotSize: 0.1,
    riskAmountUSD: 100,
    riskPercent: 1.0,
    riskRewardRatio: 2.0,
    stopLossDistancePts: 100,
    takeProfitDistancePts: 200,
    checks: {} as any
  });

  // Verify trade in db1
  const tradesAfterAdd = db1.getTrades();
  if (tradesAfterAdd.length !== 1 || tradesAfterAdd[0].tradeId !== 'trd-test-101') {
    throw new Error('❌ DB Persistence Test FAILED: Trade insertion failed in active instance');
  }

  // Close db1 and instantiate db2 on same path to verify true persistence
  db1.close();
  const db2 = new DatabaseStore(testDbPath);
  await db2.waitReady();

  const reloadedTrades = db2.getTrades();
  if (reloadedTrades.length !== 1 || reloadedTrades[0].tradeId !== 'trd-test-101') {
    throw new Error(`❌ DB Persistence Test FAILED: Reloaded instance expected 1 trade, found ${reloadedTrades.length}`);
  }
  console.log('✅ DB Test 2 PASSED: Trade records persist across database restarts.');

  // Clean up test DB file
  db2.close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  // 2. EA Authentication Middleware Test
  let nextCalled = false;
  const mockReqValid: any = {
    headers: { 'x-ea-secret': process.env.EA_API_SECRET || 'smart_ea_secret_key_2026' }
  };
  const mockRes: any = {
    status: (code: number) => ({
      json: (data: any) => ({ statusCode: code, data })
    })
  };

  validateEaAuth(mockReqValid, mockRes, () => { nextCalled = true; });
  if (!nextCalled) {
    throw new Error('❌ EA Auth Test FAILED: Valid EA secret was rejected');
  }
  console.log('✅ EA Auth Test 1 PASSED: Valid EA secret accepted.');

  let rejectedCode = 0;
  const mockReqInvalid: any = { headers: { 'x-ea-secret': 'WRONG_SECRET' } };
  const mockResInvalid: any = {
    status: (code: number) => {
      rejectedCode = code;
      return { json: (data: any) => ({ statusCode: code, data }) };
    }
  };

  validateEaAuth(mockReqInvalid, mockResInvalid, () => {
    throw new Error('❌ EA Auth Test FAILED: Invalid secret called next()');
  });

  if (rejectedCode !== 401) {
    throw new Error(`❌ EA Auth Test FAILED: Expected HTTP 401, got ${rejectedCode}`);
  }
  console.log('✅ EA Auth Test 2 PASSED: Invalid EA secret correctly rejected with 401 Unauthorized.');

  // 3. Gemini Fail-Closed Test
  const mockSnapshot: MarketSnapshot = {
    snapshotId: 'snp-fail-closed',
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
    score: { marketStructureScore: 25, displacementScore: 20, fvgScore: 15, orderBlockScore: 15, liquidityScore: 10, srScore: 10, newsScore: 5, totalScore: 100, qualifies: true },
    autoTradingEnabled: true,
    account: { balance: 10000, equity: 10000, margin: 0, freeMargin: 10000, openPositionsCount: 0, dailyPnL: 0, drawdownPercent: 0 }
  };

  const fallback = generateDeterministicFallback(mockSnapshot, 'Gemini API Exhausted');
  if (fallback.decision !== 'NO_TRADE') {
    throw new Error(`❌ Fail-Closed Test FAILED: Fallback decision expected NO_TRADE, got ${fallback.decision}`);
  }
  console.log('✅ Gemini Fail-Closed Test 1 PASSED: Fallback decision is strictly NO_TRADE.');

  const riskResult = riskEngine.validateTrade(mockSnapshot, fallback);
  if (riskResult.approved) {
    throw new Error('❌ Fail-Closed Test FAILED: Risk engine approved a fallback NO_TRADE decision!');
  }
  console.log('✅ Gemini Fail-Closed Test 2 PASSED: Risk Engine rejects trade when Gemini decision is NO_TRADE.');

  console.log('==================================================');
  console.log('🎉 ALL PHASE 1 INTEGRITY TESTS PASSED SUCCESSFULLY');
  console.log('==================================================');
}

runPhase1InfrastructureTests().catch(err => {
  console.error(err);
  process.exit(1);
});
