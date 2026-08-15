import React from 'react';
import { MarketSnapshot, GeminiDecisionResponse, RiskValidation, TradeRecord } from '../../shared/schemas';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Layers,
  ShieldCheck,
  Bot,
  Activity,
  Maximize2,
  Lock,
  Unlock,
  Cpu
} from 'lucide-react';

interface DashboardOverviewProps {
  snapshot: MarketSnapshot | null;
  aiDecision: GeminiDecisionResponse | null;
  riskValidation: RiskValidation | null;
  trades: TradeRecord[];
  onTriggerAnalysis?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  snapshot,
  aiDecision,
  riskValidation,
  trades,
  onTriggerAnalysis
}) => {
  const [analyzing, setAnalyzing] = React.useState(false);
  const [manualResult, setManualResult] = React.useState<string | null>(null);

  const handleInstantAnalyze = async () => {
    setAnalyzing(true);
    setManualResult(null);
    try {
      const res = await fetch('/api/v1/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Analyze the current live Gold market (XAUUSD). Live Bid: ${snapshot?.bid || 4380.50}, Ask: ${snapshot?.ask || 4380.80}, Timeframe: M5. Provide immediate SMC trading bias (BULLISH/BEARISH/NEUTRAL), key Order Block zone, FVG, recommended entry, SL and TP in Persian.`
        })
      });
      const data = await res.json();
      if (data.success && data.response) {
        setManualResult(data.response);
      } else {
        setManualResult(data.message || 'خطا در تحلیل');
      }
    } catch (e: any) {
      setManualResult('خطا در برقراری ارتباط با هوش مصنوعی: ' + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const score = snapshot?.score;
  const totalScore = score?.totalScore ?? 0;
  const mtfBias = snapshot?.multiTimeframe?.higherTimeframe?.bias || 'NEUTRAL';

  const openTrades = trades.filter(t => t.status === 'OPEN' || t.status === 'PARTIALLY_CLOSED');

  return (
    <div className="space-y-6">
      {/* Top Banner Alert */}
      {snapshot?.autoTradingEnabled === false && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-300 text-sm">حالت دستیار و تحلیل‌گر فعال است (AutoTrading = False)</h4>
              <p className="text-xs text-amber-200/80 mt-0.5">
                سیستم بازار را تحلیل کرده و پیشنهادات هوش مصنوعی را نمایش می‌دهد، اما هیچ سفارشی به صورت خودکار ثبت نخواهد شد.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstantAnalyze}
              disabled={analyzing}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? 'در حال تحلیل Gemini...' : '⚡ تحلیل آنی طلا با AI'}
            </button>
            <span className="text-xs px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-medium">MODE_ASSISTANT</span>
          </div>
        </div>
      )}

      {/* Manual Instant AI Analysis Result Modal/Card if Triggered */}
      {manualResult && (
        <div className="bg-indigo-950/30 border border-indigo-500/50 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <Zap className="w-4 h-4" />
              <span>تحلیل فوری بازار توسط Gemini 3.7 Flash:</span>
            </div>
            <button
              onClick={() => setManualResult(null)}
              className="text-xs text-[#8b949e] hover:text-white"
            >
              بستن ×
            </button>
          </div>
          <div className="text-xs text-[#e6edf3] leading-relaxed whitespace-pre-wrap bg-[#0d1117] p-3.5 rounded-xl border border-[#30363d] font-mono">
            {manualResult}
          </div>
        </div>
      )}

      {/* Main Grid: Area A & Area B */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ========================================================= */}
        {/* AREA A — بخش تحلیل‌گر و توصیه‌دهنده بازار (ANALYSIS & ADVISOR) */}
        {/* ========================================================= */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              <h2 className="font-bold text-base text-[#e6edf3]">بخش A: تحلیل‌گر و توصیه‌دهنده بازار</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-md bg-[#21262d] text-[#8b949e]">
                نماد: {snapshot?.symbol || 'XAUUSD'} (M5)
              </span>
              {snapshot?.bid && (
                <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Bid: {snapshot.bid}
                </span>
              )}
            </div>
          </div>

          {/* Market Bias & Setup Score Overview */}
          <div className="grid grid-cols-2 gap-4">
            {/* Market Bias Card */}
            <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-[#8b949e]">روند کلی بازار (HTF)</span>
              <div className="flex items-center gap-2 mt-2">
                {mtfBias === 'BULLISH' && <TrendingUp className="w-6 h-6 text-emerald-400" />}
                {mtfBias === 'BEARISH' && <TrendingDown className="w-6 h-6 text-rose-400" />}
                {mtfBias === 'NEUTRAL' && <Minus className="w-6 h-6 text-amber-400" />}
                <span className={`text-xl font-extrabold ${
                  mtfBias === 'BULLISH' ? 'text-emerald-400' : mtfBias === 'BEARISH' ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {mtfBias === 'BULLISH' ? 'صعودی (BULLISH)' : mtfBias === 'BEARISH' ? 'نزولی (BEARISH)' : 'خنثی (NEUTRAL)'}
                </span>
              </div>
              <div className="text-[11px] text-[#8b949e] mt-2">
                همراستایی تایم‌فریم‌ها: {snapshot?.multiTimeframe?.alignment ? 'تایید شده (H4-M15-M5)' : 'مختلف'}
              </div>
            </div>

            {/* Setup Score Card */}
            <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#8b949e]">امتیاز کیفیت Setup</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  totalScore >= 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {totalScore >= 80 ? 'واجد شرایط (Qualifies)' : 'فاقد شرایط (No Trade)'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-white">{totalScore}</span>
                <span className="text-sm text-[#8b949e]">/ 100</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-[#21262d] h-2 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-500 ${
                    totalScore >= 80 ? 'bg-emerald-400' : totalScore >= 60 ? 'bg-amber-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${totalScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Strategy Component Checklist */}
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-[#8b949e] uppercase tracking-wider">مولفه‌های ۷ گانه استراتژی (Score Components)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-[#161b22] p-2.5 rounded-lg border border-[#30363d]">
                <div className="text-[#8b949e]">Market Structure</div>
                <div className="font-bold text-[#e6edf3] mt-1">{score?.marketStructureScore || 0} / 25</div>
              </div>
              <div className="bg-[#161b22] p-2.5 rounded-lg border border-[#30363d]">
                <div className="text-[#8b949e]">Displacement</div>
                <div className="font-bold text-[#e6edf3] mt-1">{score?.displacementScore || 0} / 20</div>
              </div>
              <div className="bg-[#161b22] p-2.5 rounded-lg border border-[#30363d]">
                <div className="text-[#8b949e]">FVG Gap</div>
                <div className="font-bold text-[#e6edf3] mt-1">{score?.fvgScore || 0} / 15</div>
              </div>
              <div className="bg-[#161b22] p-2.5 rounded-lg border border-[#30363d]">
                <div className="text-[#8b949e]">Order Block</div>
                <div className="font-bold text-[#e6edf3] mt-1">{score?.orderBlockScore || 0} / 15</div>
              </div>
              <div className="bg-[#161b22] p-2.5 rounded-lg border border-[#30363d]">
                <div className="text-[#8b949e]">Liquidity Sweep</div>
                <div className="font-bold text-[#e6edf3] mt-1">{score?.liquidityScore || 0} / 10</div>
              </div>
              <div className="bg-[#161b22] p-2.5 rounded-lg border border-[#30363d]">
                <div className="text-[#8b949e]">Support/Resistance</div>
                <div className="font-bold text-[#e6edf3] mt-1">{score?.srScore || 0} / 10</div>
              </div>
              <div className="bg-[#161b22] p-2.5 rounded-lg border border-[#30363d] col-span-2">
                <div className="text-[#8b949e]">News Filter</div>
                <div className="font-bold text-[#e6edf3] mt-1">{score?.newsScore || 0} / 5</div>
              </div>
            </div>
          </div>

          {/* AI Recommendation Card */}
          <div className="bg-[#0d1117] border border-indigo-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-indigo-400" />
                پاسخ و تحلیل ساختار‌یافته هوش مصنوعی Gemini
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                سطح اطمینان: {aiDecision?.confidenceLabel || 'MEDIUM'}
              </span>
            </div>

            <div className="flex items-center gap-3 bg-[#161b22] p-3 rounded-lg border border-[#30363d]">
              <div className={`px-4 py-2 rounded-lg font-black text-lg ${
                aiDecision?.decision === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                aiDecision?.decision === 'SELL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {aiDecision?.decision || 'NO_TRADE'}
              </div>
              <div className="text-xs space-y-1">
                <div><span className="text-[#8b949e]">پیشنهاد ورود:</span> <span className="font-bold text-[#e6edf3]">{aiDecision?.suggestedTrade?.action || 'عدم ورود'}</span></div>
                <div><span className="text-[#8b949e]">حد ضرر (SL):</span> <span className="font-mono text-rose-400">{aiDecision?.suggestedTrade?.suggestedSL || 0}</span> | <span className="text-[#8b949e]">حد سود (TP):</span> <span className="font-mono text-emerald-400">{aiDecision?.suggestedTrade?.suggestedTP || 0}</span></div>
              </div>
            </div>

            {/* Dynamic Probability Bar in Dashboard */}
            <div className="space-y-1.5 bg-[#161b22] p-2.5 rounded-lg border border-[#30363d]">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-emerald-400 font-bold">صعودی: {aiDecision?.bullishProbability ?? (aiDecision?.decision === 'BUY' ? 75 : 50)}%</span>
                <span className="text-rose-400 font-bold">نزولی: {aiDecision?.bearishProbability ?? (aiDecision?.decision === 'SELL' ? 75 : 50)}%</span>
              </div>
              <div className="w-full bg-[#21262d] h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-700 ease-out"
                  style={{ width: `${aiDecision?.bullishProbability ?? (aiDecision?.decision === 'BUY' ? 75 : 50)}%` }}
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-700 ease-out"
                  style={{ width: `${aiDecision?.bearishProbability ?? (aiDecision?.decision === 'SELL' ? 75 : 50)}%` }}
                />
              </div>
            </div>

            {/* Reasons List */}
            {aiDecision?.reasonsFa && aiDecision.reasonsFa.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-bold text-[#8b949e]">دلایل تحلیل:</div>
                <ul className="text-xs space-y-1 list-disc list-inside text-[#c9d1d9]">
                  {aiDecision.reasonsFa.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* AREA B — بخش معامله‌گر خودکار و نظارت اجرایی (AUTOTRADER) */}
        {/* ========================================================= */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-base text-[#e6edf3]">بخش B: معامله‌گر خودکار و اجرای ریسک</h2>
            </div>
            <div className="flex items-center gap-2">
              {snapshot?.autoTradingEnabled ? (
                <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium flex items-center gap-1">
                  <Unlock className="w-3.5 h-3.5" /> فعال (AutoTrading)
                </span>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> غیرفعال (Assistant Only)
                </span>
              )}
            </div>
          </div>

          {/* Active Positions Widget */}
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-[#8b949e] uppercase tracking-wider">پوزیشن‌های باز جاری (Active Positions)</h3>
              <span className="text-xs text-[#8b949e] font-mono">{openTrades.length} پوزیشن</span>
            </div>

            {openTrades.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#8b949e] border border-dashed border-[#30363d] rounded-lg">
                در حال حاضر هیچ پوزیشن باری وجود ندارد.
              </div>
            ) : (
              <div className="space-y-2">
                {openTrades.map(trade => (
                  <div key={trade.tradeId} className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold px-2 py-0.5 rounded ${
                          trade.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {trade.type} {trade.lots} Lot
                        </span>
                        <span className="font-mono text-[#8b949e]">#{trade.ticket}</span>
                        {trade.isRunner && (
                          <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-[10px] border border-purple-500/30">
                            Runner (۵۰٪ فری ریسک)
                          </span>
                        )}
                      </div>
                      <div className="text-[#8b949e] font-mono">
                        ورود: {trade.openPrice} | SL: {trade.sl} | TP: {trade.tp}
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <div className={`font-bold text-sm ${
                        (trade.pnlUSD || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {(trade.pnlUSD || 0) >= 0 ? `+${trade.pnlUSD}` : trade.pnlUSD} USD
                      </div>
                      <div className="text-[11px] text-[#8b949e]">{trade.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deterministic Risk Checklist */}
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-[#8b949e] uppercase tracking-wider">بررسی ۱۲ گانه موتور ریسک قطعی (Risk Checklist)</h3>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${
                riskValidation?.approved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {riskValidation?.approved ? 'تایید ریسک (APPROVED)' : 'رد ریسک (REJECTED)'}
              </span>
            </div>

            {riskValidation && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-[#c9d1d9]">
                  {riskValidation.checks.autoTradingCheck ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>تنظیمات AutoTrading</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#c9d1d9]">
                  {riskValidation.checks.scoreCheck ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>حدنصاب امتیاز (امتیاز حداقل ۸۰)</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#c9d1d9]">
                  {riskValidation.checks.spreadCheck ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>اسپرد مجاز نماد</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#c9d1d9]">
                  {riskValidation.checks.newsCheck ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>عدم تداخل با اخبار پرریسک</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#c9d1d9]">
                  {riskValidation.checks.rrCheck ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>حداقل RR ({riskValidation.riskRewardRatio})</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#c9d1d9]">
                  {riskValidation.checks.stopDistanceCheck ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>حد ضرر ساختاری معتبر</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#c9d1d9]">
                  {riskValidation.checks.maxRiskCheck ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>حجم لات مجاز ({riskValidation.calculatedLotSize} Lot)</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#c9d1d9]">
                  {riskValidation.checks.maxPositionsCheck ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>سقف پوزیشن‌های همزمان</span>
                </div>
              </div>
            )}

            {/* Rejection reasons if present */}
            {riskValidation && riskValidation.rejectionReasonsFa.length > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-xs text-rose-300 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> دلایل عدم تایید یا رد معامله:
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {riskValidation.rejectionReasonsFa.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
