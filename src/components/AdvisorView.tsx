import React, { useState, useEffect, useRef } from 'react';
import { MarketSnapshot, GeminiDecisionResponse } from '../../shared/schemas';
import { Bot, Target, ShieldCheck, AlertCircle, ArrowUpRight, ArrowDownRight, Compass, Sparkles, Activity, Clock, RefreshCw, Layers, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';

interface AdvisorViewProps {
  snapshot: MarketSnapshot | null;
  aiDecision: GeminiDecisionResponse | null;
}

export const AdvisorView: React.FC<AdvisorViewProps> = ({ snapshot, aiDecision }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [liveAiOutput, setLiveAiOutput] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<'SCALPING' | 'INTRADAY' | 'SWING'>('INTRADAY');
  
  // 30-Second Auto-Pulse State
  const [autoPulseActive, setAutoPulseActive] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const prevBidRef = useRef<number | null>(null);
  const [tickDirection, setTickDirection] = useState<'UP' | 'DOWN' | 'EQUAL'>('EQUAL');

  // Track real live price fluctuations
  useEffect(() => {
    if (snapshot?.bid) {
      const currentBid = Number(snapshot.bid);
      if (prevBidRef.current !== null) {
        if (currentBid > prevBidRef.current) {
          setTickDirection('UP');
        } else if (currentBid < prevBidRef.current) {
          setTickDirection('DOWN');
        }
      }
      prevBidRef.current = currentBid;
    }
  }, [snapshot?.bid]);

  // Sync countdown with incoming snapshot / aiDecision updates from server SSE
  useEffect(() => {
    setCountdown(30);
  }, [aiDecision, snapshot?.timestamp]);

  // 30s Countdown timer visualization for Auto-Pulse
  useEffect(() => {
    if (!autoPulseActive) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoPulseActive]);

  const handleRunAiAnalysis = async () => {
    setAnalyzing(true);
    setLiveAiOutput(null);
    try {
      const liveBidText = snapshot?.bid ? Number(snapshot.bid).toFixed(2) : 'درحال اتصال';
      const liveAskText = snapshot?.ask ? Number(snapshot.ask).toFixed(2) : 'درحال اتصال';
      const res = await fetch('/api/v1/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Analyze live market for Gold (${snapshot?.symbol || 'XAUUSD.m'}). Live Bid: ${liveBidText}, Ask: ${liveAskText}, Spread: ${snapshot?.spreadPts || 0} pts. Trading Style: ${selectedStyle}. Determine if market bias is Bullish/Bearish, calculate exact percentage probability (e.g. 78% Bullish vs 22% Bearish), suggest precise Order Block entry zone, invalidation SL and TP1/TP2 targets with SMC reasoning in clear Persian language.`
        })
      });
      const data = await res.json();
      if (data.success && data.response) {
        setLiveAiOutput(data.response);
      } else {
        setLiveAiOutput(data.message || 'خطا در دریافت پاسخ از هوش مصنوعی');
      }
    } catch (e: any) {
      setLiveAiOutput('خطا در برقراری ارتباط: ' + e.message);
    } finally {
      setAnalyzing(false);
      setCountdown(30); // reset countdown after manual trigger
    }
  };

  const decision = aiDecision?.decision || 'NO_TRADE';
  const confidence = aiDecision?.confidenceLabel || 'MEDIUM';
  const bullishProb = aiDecision?.bullishProbability ?? (decision === 'BUY' ? 75 : decision === 'SELL' ? 25 : 50);
  const bearishProb = aiDecision?.bearishProbability ?? (100 - bullishProb);

  const reasoning = aiDecision?.reasonsFa && aiDecision.reasonsFa.length > 0
    ? aiDecision.reasonsFa.join(' | ')
    : 'در انتظار ستاپ واجد شرایط با تایید شکست ساختار (BOS)، مصرف نقدینگی و عدم وجود نقدینگی مهندسی شده.';

  return (
    <div className="space-y-6" dir="rtl">
      {/* Real-time Ticker & 30s Pulse Status Header */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#e6edf3]">تحلیل‌گر هوشمند و توصیه‌دهنده بازار (Gemini Flash Advisor)</h1>
              <span className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                <Activity className="w-3 h-3 animate-pulse" />
                Live Heartbeat
              </span>
            </div>
            <p className="text-xs text-[#8b949e] mt-0.5">
              تولید تحلیل‌های ساختاری SMC و محاسبه احتمالات زنده با هوش مصنوعی و نرخ بروزرسانی ۳۰ ثانیه‌ای
            </p>
          </div>
        </div>

        {/* Live 30s Auto Pulse Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0d1117] border border-[#30363d] px-3.5 py-1.5 rounded-xl text-xs font-mono">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="text-[#8b949e]">بروزرسانی بعدی:</span>
            <span className="font-bold text-indigo-300 w-6 text-center">{countdown}s</span>
            <button
              onClick={() => setAutoPulseActive(!autoPulseActive)}
              className={`text-[10px] px-2 py-0.5 rounded font-sans transition-colors ${
                autoPulseActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-[#21262d] text-[#8b949e]'
              }`}
            >
              {autoPulseActive ? 'فعال' : 'توقف'}
            </button>
          </div>

          <div className="flex bg-[#0d1117] p-1 rounded-xl border border-[#30363d] text-xs font-medium">
            <button
              onClick={() => setSelectedStyle('SCALPING')}
              className={`px-3 py-1 rounded-lg transition-all ${
                selectedStyle === 'SCALPING' ? 'bg-indigo-600 text-white shadow' : 'text-[#8b949e] hover:text-white'
              }`}
            >
              اسکالپ (M1-M5)
            </button>
            <button
              onClick={() => setSelectedStyle('INTRADAY')}
              className={`px-3 py-1 rounded-lg transition-all ${
                selectedStyle === 'INTRADAY' ? 'bg-indigo-600 text-white shadow' : 'text-[#8b949e] hover:text-white'
              }`}
            >
              دی‌تریدینگ (M15-H1)
            </button>
            <button
              onClick={() => setSelectedStyle('SWING')}
              className={`px-3 py-1 rounded-lg transition-all ${
                selectedStyle === 'SWING' ? 'bg-indigo-600 text-white shadow' : 'text-[#8b949e] hover:text-white'
              }`}
            >
              سوئینگ (H4-D1)
            </button>
          </div>

          <button
            onClick={handleRunAiAnalysis}
            disabled={analyzing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'در حال تحلیل عمیق...' : 'درخواست تحلیل آنی'}
          </button>
        </div>
      </div>

      {/* Live Market Price & Real Volatility Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#8b949e] font-sans">قیمت خرید زنده (Bid)</div>
            <div className={`text-lg font-black transition-colors duration-300 ${
              tickDirection === 'UP' ? 'text-emerald-400' : tickDirection === 'DOWN' ? 'text-rose-400' : 'text-[#e6edf3]'
            }`}>
              {snapshot?.bid ? Number(snapshot.bid).toFixed(2) : 'درحال اتصال...'}
            </div>
          </div>
          {tickDirection === 'UP' && <TrendingUp className="w-5 h-5 text-emerald-400 animate-bounce" />}
          {tickDirection === 'DOWN' && <TrendingDown className="w-5 h-5 text-rose-400 animate-bounce" />}
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#8b949e] font-sans">قیمت فروش زنده (Ask)</div>
            <div className="text-lg font-black text-[#e6edf3]">
              {snapshot?.ask ? Number(snapshot.ask).toFixed(2) : 'درحال اتصال...'}
            </div>
          </div>
          <span className="text-xs text-[#8b949e] bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d]">
            {snapshot?.symbol || 'XAUUSD'}
          </span>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#8b949e] font-sans">اسپرد واقعی (Spread)</div>
            <div className="text-lg font-black text-amber-400">
              {snapshot?.spreadPts ? `${snapshot.spreadPts} pts` : '0 pts'}
            </div>
          </div>
          <span className="text-xs text-[#8b949e]">
            {snapshot?.spreadPts && snapshot.spreadPts <= 25 ? 'عالی (Tight)' : 'عادی'}
          </span>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#8b949e] font-sans">نوسان میانگین (ATR M5)</div>
            <div className="text-lg font-black text-purple-400">
              {snapshot?.atr ? `${Number(snapshot.atr).toFixed(2)}` : '0.00'}
            </div>
          </div>
          <span className="text-xs text-[#8b949e]">{snapshot?.timeframe || 'M5'}</span>
        </div>
      </div>

      {/* Instant AI Custom Output (if triggered) */}
      {liveAiOutput && (
        <div className="bg-indigo-950/30 border border-indigo-500/50 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-500/30 pb-2">
            <div className="flex items-center gap-2 font-bold text-sm text-indigo-300">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>نتیجه تحلیل جامع هوش مصنوعی ({selectedStyle}):</span>
            </div>
            <button
              onClick={() => setLiveAiOutput(null)}
              className="text-xs text-[#8b949e] hover:text-white"
            >
              بستن ×
            </button>
          </div>
          <div className="text-xs text-[#e6edf3] leading-relaxed whitespace-pre-wrap font-sans bg-[#0d1117] p-4 rounded-xl border border-[#30363d]">
            {liveAiOutput}
          </div>
        </div>
      )}

      {/* Main Advisor Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Dynamic Probability & Direction Gauge */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
            <h2 className="font-bold text-sm text-[#e6edf3]">احتمال و سیگنال لحظه‌ای AI</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
              اطمینان: {confidence}
            </span>
          </div>

          <div className="text-center py-5 space-y-2 bg-[#0d1117] rounded-xl border border-[#30363d]">
            <div className="text-2xl font-black font-mono">
              {decision === 'BUY' && (
                <span className="text-emerald-400 flex items-center justify-center gap-1">
                  <ArrowUpRight className="w-6 h-6" /> سیگنال خرید (BUY)
                </span>
              )}
              {decision === 'SELL' && (
                <span className="text-rose-400 flex items-center justify-center gap-1">
                  <ArrowDownRight className="w-6 h-6" /> سیگنال فروش (SELL)
                </span>
              )}
              {(decision === 'NO_TRADE' || decision === 'WAIT' || decision === 'HOLD') && (
                <span className="text-amber-400 flex items-center justify-center gap-1">
                  <AlertCircle className="w-5 h-5" /> عدم ورود / صبر (WAIT)
                </span>
              )}
            </div>
            <p className="text-xs text-[#8b949e]">
              نماد: {snapshot?.symbol || 'XAUUSD'} | تایم‌فریم: {snapshot?.timeframe || 'M5'}
            </p>
          </div>

          {/* Dynamic Probability Multi-Bar */}
          <div className="space-y-3 bg-[#0d1117] p-3.5 rounded-xl border border-[#30363d]">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>احتمال صعود (Bullish):</span>
              </div>
              <span className="font-mono text-emerald-400 font-black text-sm">{bullishProb}%</span>
            </div>

            <div className="w-full bg-[#21262d] h-3 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-700 ease-out"
                style={{ width: `${bullishProb}%` }}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-700 ease-out"
                style={{ width: `${bearishProb}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                <span>احتمال نزول (Bearish):</span>
              </div>
              <span className="font-mono text-rose-400 font-black text-sm">{bearishProb}%</span>
            </div>
          </div>
        </div>

        {/* Authentic Target Levels (Entry / SL / TP) */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-[#e6edf3]">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>محدوده‌های هدف پیشنهادی</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e] font-mono">
              R:R حداقل 1:1.5
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] flex justify-between items-center">
              <span className="text-[#8b949e] font-sans">نقطه ورود بهینه (Entry):</span>
              <span className={aiDecision?.suggestedTrade?.action && aiDecision.suggestedTrade.action !== 'NONE' && aiDecision.suggestedTrade.action !== 'WAIT' ? "text-white font-bold" : "text-[#8b949e]"}>
                {aiDecision?.suggestedTrade?.action && aiDecision.suggestedTrade.action !== 'NONE' && aiDecision.suggestedTrade.action !== 'WAIT'
                  ? `${aiDecision.suggestedTrade.action} @ ${snapshot?.bid ? Number(snapshot.bid).toFixed(2) : '-'}`
                  : 'در انتظار تشکیل ستاپ'}
              </span>
            </div>
            <div className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] flex justify-between items-center">
              <span className="text-rose-400 font-sans">حد ضرر ساختاری (SL):</span>
              <span className="text-rose-400 font-bold">
                {aiDecision?.suggestedTrade?.suggestedSL && aiDecision.suggestedTrade.suggestedSL > 0
                  ? Number(aiDecision.suggestedTrade.suggestedSL).toFixed(2)
                  : '-'}
              </span>
            </div>
            <div className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] flex justify-between items-center">
              <span className="text-emerald-400 font-sans">حد سود اول (TP1):</span>
              <span className="text-emerald-400 font-bold">
                {aiDecision?.suggestedTrade?.suggestedTP && aiDecision.suggestedTrade.suggestedTP > 0
                  ? Number(aiDecision.suggestedTrade.suggestedTP).toFixed(2)
                  : '-'}
              </span>
            </div>
            <div className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] flex justify-between items-center">
              <span className="text-emerald-400 font-sans">نسبت ریسک به ریوارد:</span>
              <span className="text-emerald-400 font-bold">
                {aiDecision?.suggestedTrade?.riskRewardRatio && aiDecision.suggestedTrade.riskRewardRatio > 0
                  ? `1:${aiDecision.suggestedTrade.riskRewardRatio}`
                  : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* AI Strategy Rationale & SMC Reasoning */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-[#e6edf3]">
              <Compass className="w-4 h-4 text-purple-400" />
              <span>استدلال و منطق معاملاتی</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
              SMC Core
            </span>
          </div>

          <div className="text-xs text-[#c9d1d9] leading-relaxed bg-[#0d1117] p-4 rounded-xl border border-[#30363d] min-h-[160px] font-sans">
            {reasoning}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#8b949e]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>تایید قوانین ساختار بازار اسمارت‌مانی و اعتبارسنجی ریسک</span>
          </div>
        </div>
      </div>
    </div>
  );
};

