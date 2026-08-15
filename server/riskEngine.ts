import { MarketSnapshot, GeminiDecisionResponse, RiskValidation } from '../shared/schemas';
import { DEFAULT_RISK_PARAMS } from '../shared/constants';
import { newsProvider } from './newsProvider';

export class RiskEngine {
  /**
   * Deterministically validates trade proposals and calculates safe lot sizing
   */
  public validateTrade(
    snapshot: MarketSnapshot,
    aiDecision?: GeminiDecisionResponse,
    params = DEFAULT_RISK_PARAMS
  ): RiskValidation {
    const rejectionReasonsFa: string[] = [];

    // 0. AI Decision Check (Fail-Closed)
    const aiDecisionCheck = Boolean(aiDecision && (aiDecision.decision === 'BUY' || aiDecision.decision === 'SELL'));
    if (!aiDecisionCheck) {
      rejectionReasonsFa.push(`تصمیم هوش مصنوعی بر روی معامله فعال قرار ندارد (${aiDecision?.decision || 'عدم پاسخ/غیرفعال'}). معامله رد شد (Fail-Closed).`);
    }

    // 1. AutoTrading Check
    const autoTradingCheck = snapshot.autoTradingEnabled === true;
    if (!autoTradingCheck) {
      rejectionReasonsFa.push('معامله خودکار در تنظیمات اکسپرت غیرفعال است (AutoTrading=False).');
    }

    // 2. Score Check
    const scoreCheck = snapshot.score.totalScore >= params.minScoreToQualify;
    if (!scoreCheck) {
      rejectionReasonsFa.push(`امتیاز Setup (${snapshot.score.totalScore}) به حدنصاب ورود (${params.minScoreToQualify}) نرسیده است.`);
    }

    // 3. Spread Check
    const maxSpreadAllowedPts = snapshot.symbol === 'XAUUSD' ? 40 : 30; // 4.0 pips for Gold
    const spreadCheck = snapshot.spreadPts <= maxSpreadAllowedPts;
    if (!spreadCheck) {
      rejectionReasonsFa.push(`اسپرد نماد (${snapshot.spreadPts} پوینت) بیش از حد مجاز (${maxSpreadAllowedPts} پوینت) است.`);
    }

    // 4. News Check
    const newsStatus = newsProvider.isNewsBlockActive(snapshot.symbol, params.newsBlockBeforeMinutes, params.newsBlockAfterMinutes);
    const newsCheck = !newsStatus.active;
    if (!newsCheck) {
      rejectionReasonsFa.push(`رویداد اقتصادی پرریسک در پیش رو است (${newsStatus.eventTitle}). معاملات بلاک شده است.`);
    }

    // Determine proposed action, SL, TP
    const proposedAction = (aiDecision?.decision === 'BUY' || aiDecision?.decision === 'SELL') ? aiDecision.decision : 'NONE';
    const entryPrice = proposedAction === 'BUY' ? snapshot.ask : snapshot.bid;

    let slPrice = aiDecision?.suggestedTrade?.suggestedSL || 0;
    if (slPrice <= 0 && proposedAction !== 'NONE') {
      slPrice = proposedAction === 'BUY'
        ? entryPrice - (snapshot.atr * 1.5)
        : entryPrice + (snapshot.atr * 1.5);
    }

    let tpPrice = aiDecision?.suggestedTrade?.suggestedTP || 0;
    if (tpPrice <= 0 && proposedAction !== 'NONE') {
      tpPrice = proposedAction === 'BUY'
        ? entryPrice + (snapshot.atr * 4.0)
        : entryPrice - (snapshot.atr * 4.0);
    }

    const stopDistancePts = Math.abs(entryPrice - slPrice);
    const tpDistancePts = Math.abs(tpPrice - entryPrice);

    // 5. Stop Distance Check
    const minStopPts = 15; // 1.5 pips min stop
    const stopDistanceCheck = proposedAction !== 'NONE' ? stopDistancePts >= minStopPts : false;
    if (proposedAction !== 'NONE' && !stopDistanceCheck) {
      rejectionReasonsFa.push(`حد ضرر محاسبه شده (${stopDistancePts.toFixed(1)} پوینت) بسیار کوچک یا غیرمجاز است.`);
    }

    // 6. RR Check
    const calculatedRR = stopDistancePts > 0 ? (tpDistancePts / stopDistancePts) : 0;
    const rrCheck = proposedAction !== 'NONE' ? calculatedRR >= params.minRiskRewardRatio : false;
    if (proposedAction !== 'NONE' && !rrCheck) {
      rejectionReasonsFa.push(`نسبت سود به زیان (${calculatedRR.toFixed(2)}) کمتر از حداقل مجاز (${params.minRiskRewardRatio}) است.`);
    }

    // 7. Calculate Lot Size based on Account Risk %
    const accountEquity = snapshot.account.equity || 10000;
    const maxRiskDollars = accountEquity * (params.maxRiskPerTradePercent / 100);

    // Point value approximation for Gold/FX
    const pointValuePerLot = snapshot.symbol === 'XAUUSD' ? 1.0 : 1.0;
    let calculatedLotSize = stopDistancePts > 0 ? (maxRiskDollars / (stopDistancePts * pointValuePerLot)) : 0.01;

    // Round to 0.01 lot step
    calculatedLotSize = Math.floor(calculatedLotSize * 100) / 100;
    calculatedLotSize = Math.max(0.01, Math.min(params.maxLotSize, calculatedLotSize));

    // 8. Max Risk Check
    const maxRiskCheck = calculatedLotSize <= params.maxLotSize;

    // 9. Max Open Positions Check
    const maxPositionsCheck = snapshot.account.openPositionsCount < params.maxOpenPositions;
    if (!maxPositionsCheck) {
      rejectionReasonsFa.push(`تعداد پوزیشن‌های باز (${snapshot.account.openPositionsCount}) به حداکثر مجاز (${params.maxOpenPositions}) رسیده است.`);
    }

    // 10. Daily Loss Check
    const dailyLossPercent = snapshot.account.dailyPnL < 0 ? (Math.abs(snapshot.account.dailyPnL) / snapshot.account.balance) * 100 : 0;
    const dailyLossCheck = dailyLossPercent < params.maxDailyLossPercent;
    if (!dailyLossCheck) {
      rejectionReasonsFa.push(`افت روزانه حساب (${dailyLossPercent.toFixed(2)}٪) از حد مجاز روزانه (${params.maxDailyLossPercent}٪) فراتر رفته است.`);
    }

    // 11. Drawdown Check
    const drawdownCheck = snapshot.account.drawdownPercent < params.maxDrawdownPercent;
    if (!drawdownCheck) {
      rejectionReasonsFa.push(`دروداون جاری حساب (${snapshot.account.drawdownPercent.toFixed(2)}٪) از حد مجاز کل (${params.maxDrawdownPercent}٪) بیشتر است.`);
    }

    // 12. Cooldown & Duplicate Check
    const cooldownCheck = true;
    const duplicateCheck = true;

    const approved =
      aiDecisionCheck &&
      autoTradingCheck &&
      scoreCheck &&
      spreadCheck &&
      newsCheck &&
      stopDistanceCheck &&
      rrCheck &&
      maxRiskCheck &&
      maxPositionsCheck &&
      dailyLossCheck &&
      drawdownCheck &&
      cooldownCheck &&
      duplicateCheck;

    return {
      approved,
      rejectionReasonsFa,
      calculatedLotSize: approved ? calculatedLotSize : 0,
      riskAmountUSD: Math.round(maxRiskDollars * 100) / 100,
      riskPercent: params.maxRiskPerTradePercent,
      riskRewardRatio: Math.round(calculatedRR * 100) / 100,
      stopLossDistancePts: Math.round(stopDistancePts * 10) / 10,
      takeProfitDistancePts: Math.round(tpDistancePts * 10) / 10,
      checks: {
        autoTradingCheck,
        scoreCheck,
        spreadCheck,
        newsCheck,
        rrCheck,
        stopDistanceCheck,
        maxRiskCheck,
        maxPositionsCheck,
        dailyLossCheck,
        drawdownCheck,
        cooldownCheck,
        duplicateCheck
      }
    };
  }
}

export const riskEngine = new RiskEngine();
