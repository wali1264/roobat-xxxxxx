export const SOFTWARE_VERSION = '1.0.0';
export const STRATEGY_VERSION = 'SMC-MTF-V1.0';
export const PROMPT_VERSION = 'TRADING-PROMPT-V1.0';
export const PROTOCOL_VERSION = 'V1.0';

export const DEFAULT_STRATEGY_WEIGHTS = {
  marketStructure: 25,
  displacement: 20,
  fvg: 15,
  orderBlock: 15,
  liquidity: 10,
  supportResistance: 10,
  news: 5
};

export const DEFAULT_RISK_PARAMS = {
  minScoreToQualify: 80,
  minRiskRewardRatio: 1.5,
  maxRiskPerTradePercent: 1.0,
  maxLotSize: 5.0,
  maxOpenPositions: 3,
  maxDailyLossPercent: 3.0,
  maxDrawdownPercent: 6.0,
  newsBlockBeforeMinutes: 15,
  newsBlockAfterMinutes: 15,
  partialClosePercent: 50,
  protectionTriggerR: 1.5,
  staleDecisionSeconds: 60
};
