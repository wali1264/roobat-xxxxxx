import {
  ScoreBreakdownSchema,
  MarketSnapshot
} from '../shared/schemas';
import { DEFAULT_STRATEGY_WEIGHTS } from '../shared/constants';
import { z } from 'zod';

export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

export class StrategyEngine {
  /**
   * Calculates the 0-100 Setup Score deterministically according to the 7 strategy components
   */
  public calculateSetupScore(
    snapshot: Partial<MarketSnapshot>,
    customWeights = DEFAULT_STRATEGY_WEIGHTS
  ): ScoreBreakdown {
    // 1. Market Structure (0 - 25)
    let msScore = 0;
    const htfBias = snapshot.multiTimeframe?.higherTimeframe?.bias || 'NEUTRAL';
    const mtfBias = snapshot.multiTimeframe?.middleTimeframe?.bias || 'NEUTRAL';
    const ltfBias = snapshot.multiTimeframe?.lowerTimeframe?.bias || 'NEUTRAL';

    if (htfBias === mtfBias && mtfBias === ltfBias && htfBias !== 'NEUTRAL') {
      msScore = customWeights.marketStructure; // Perfect MTF alignment (25)
    } else if (htfBias === mtfBias && htfBias !== 'NEUTRAL') {
      msScore = customWeights.marketStructure * 0.8; // HTF + MTF alignment (20)
    } else if (mtfBias === ltfBias && mtfBias !== 'NEUTRAL') {
      msScore = customWeights.marketStructure * 0.5; // MTF + LTF alignment (12.5)
    }

    // 2. Displacement (0 - 20)
    let dispScore = 0;
    const dispType = snapshot.displacement?.type || 'NONE';
    if (dispType === 'STRONG_DISPLACEMENT') dispScore = customWeights.displacement; // 20
    else if (dispType === 'NORMAL') dispScore = customWeights.displacement * 0.6; // 12
    else if (dispType === 'WEAK') dispScore = customWeights.displacement * 0.3; // 6

    // 3. Fair Value Gap (0 - 15)
    let fvgScore = 0;
    const validFVG = snapshot.fvgs?.find(f => f.status === 'VALID_CANDIDATE' || f.status === 'DETECTED');
    if (validFVG) {
      fvgScore = customWeights.fvg; // 15
    }

    // 4. Order Block (0 - 15)
    let obScore = 0;
    const validOB = snapshot.orderBlocks?.find(o => o.status === 'VALID_CANDIDATE' || o.status === 'DETECTED');
    if (validOB) {
      obScore = customWeights.orderBlock; // 15
    }

    // 5. Liquidity (0 - 10)
    let liqScore = 0;
    const hasSweep = snapshot.liquidity?.some(l => l.isSwept);
    if (hasSweep) {
      liqScore = customWeights.liquidity; // 10
    } else if (snapshot.liquidity && snapshot.liquidity.length > 0) {
      liqScore = customWeights.liquidity * 0.5; // 5
    }

    // 6. Support / Resistance (0 - 10)
    let srScore = 0;
    const srZones = snapshot.srZones || [];
    if (srZones.some(s => s.rejectionCount >= 2)) {
      srScore = customWeights.supportResistance; // 10
    } else if (srZones.length > 0) {
      srScore = customWeights.supportResistance * 0.5; // 5
    }

    // 7. News Context (0 - 5)
    let newsScore = customWeights.news; // Default safe (5)
    const activeNews = snapshot.newsContext?.some(n => n.isWithinBlockWindow);
    if (activeNews) {
      newsScore = 0; // High impact news active!
    }

    const totalScore = Math.min(
      100,
      Math.round(msScore + dispScore + fvgScore + obScore + liqScore + srScore + newsScore)
    );

    const qualifies = totalScore >= 80;

    return {
      marketStructureScore: Math.round(msScore),
      displacementScore: Math.round(dispScore),
      fvgScore: Math.round(fvgScore),
      orderBlockScore: Math.round(obScore),
      liquidityScore: Math.round(liqScore),
      srScore: Math.round(srScore),
      newsScore: Math.round(newsScore),
      totalScore,
      qualifies
    };
  }
}

export const strategyEngine = new StrategyEngine();
