import { strategyEngine } from '../server/strategyEngine';
import { MarketSnapshot } from '../shared/schemas';

function testStrategyEngine() {
  console.log('--- Running Strategy Engine Tests ---');

  const mockSnapshot: Partial<MarketSnapshot> = {
    symbol: 'XAUUSD',
    multiTimeframe: {
      higherTimeframe: { timeframe: 'H4', bias: 'BULLISH', structure: 'BULLISH_BOS' },
      middleTimeframe: { timeframe: 'M15', bias: 'BULLISH', activeZone: 'FVG' },
      lowerTimeframe: { timeframe: 'M5', bias: 'BULLISH', entryTrigger: 'CHOCH' },
      alignment: true
    },
    displacement: {
      type: 'STRONG_DISPLACEMENT',
      timeframe: 'M5',
      atrMultiple: 2.5,
      candleBodyRatio: 0.85,
      impulseSpeedPtsPerSec: 5.0,
      direction: 'BULLISH'
    },
    fvgs: [
      {
        id: 'fvg-1',
        type: 'BULLISH',
        timeframe: 'M5',
        topPrice: 2420,
        bottomPrice: 2415,
        midPrice: 2417.5,
        widthPts: 50,
        creationTime: Date.now(),
        status: 'VALID_CANDIDATE',
        fillPercentage: 0
      }
    ],
    orderBlocks: [
      {
        id: 'ob-1',
        type: 'BULLISH',
        timeframe: 'M15',
        highPrice: 2415,
        lowPrice: 2410,
        creationTime: Date.now(),
        status: 'VALID_CANDIDATE',
        strengthScore: 90
      }
    ],
    liquidity: [{ type: 'LIQUIDITY_SWEEP', price: 2408, timeframe: 'M15', isSwept: true }],
    srZones: [{ id: 'sr-1', type: 'SUPPORT', priceMin: 2405, priceMax: 2410, rejectionCount: 3, timeframe: 'H1', proximityPts: 10 }],
    newsContext: []
  };

  const score = strategyEngine.calculateSetupScore(mockSnapshot as any);
  console.log('Calculated Score:', score);

  if (score.totalScore >= 80 && score.qualifies) {
    console.log('✅ Strategy Engine Test PASSED: Score qualifies for >= 80');
  } else {
    throw new Error('❌ Strategy Engine Test FAILED: Score should be >= 80');
  }
}

testStrategyEngine();
