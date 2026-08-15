import React from 'react';
import { MarketSnapshot } from '../../shared/schemas';
import { TrendingUp, Layers, Activity, Eye, ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';

interface MarketAnalysisViewProps {
  snapshot: MarketSnapshot | null;
}

export const MarketAnalysisView: React.FC<MarketAnalysisViewProps> = ({ snapshot }) => {
  const mtf = snapshot?.multiTimeframe;
  const htf = mtf?.higherTimeframe;
  const itf = mtf?.middleTimeframe;
  const ltf = mtf?.lowerTimeframe;

  const score = snapshot?.score;
  const obList = snapshot?.orderBlocks || [];
  const fvgList = snapshot?.fvgs || [];
  const structEvents = snapshot?.structureEvents || [];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Info */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#e6edf3]">تحلیل جامع چندتایم‌فریمه ساختار بازار (Market Structure Analysis)</h1>
            <p className="text-xs text-[#8b949e]">
              دیدگاه جریان سفارشات اسمارت‌مانی (SMC)، اردربلاک‌ها، خلأهای نقدینگی و سطوح عرضه/تقاضا برای نماد {snapshot?.symbol || 'XAUUSD'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#0d1117] border border-[#30363d] text-xs font-mono">
            <span className="text-[#8b949e]">قیمت Bid: </span>
            <span className={snapshot?.bid ? "text-emerald-400 font-bold" : "text-[#8b949e]"}>
              {snapshot?.bid ? Number(snapshot.bid).toFixed(2) : 'در انتظار MT5...'}
            </span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-[#0d1117] border border-[#30363d] text-xs font-mono">
            <span className="text-[#8b949e]">قیمت Ask: </span>
            <span className={snapshot?.ask ? "text-rose-400 font-bold" : "text-[#8b949e]"}>
              {snapshot?.ask ? Number(snapshot.ask).toFixed(2) : 'در انتظار MT5...'}
            </span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-[#0d1117] border border-[#30363d] text-xs font-mono">
            <span className="text-[#8b949e]">اسپرد: </span>
            <span className={snapshot?.spreadPts ? "text-amber-400 font-bold" : "text-[#8b949e]"}>
              {snapshot?.spreadPts ? `${snapshot.spreadPts} pts` : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Timeframe Alignment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* HTF (H1) */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-[#e6edf3]">تایم‌فریم اصلی (H1)</span>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-md font-mono font-bold ${
              htf?.bias === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-300' :
              htf?.bias === 'BEARISH' ? 'bg-rose-500/20 text-rose-300' :
              'bg-[#21262d] text-[#8b949e]'
            }`}>
              {htf?.bias || 'NEUTRAL'}
            </span>
          </div>
          <div className="text-xs text-[#8b949e] space-y-1">
            <div className="flex justify-between">
              <span>ساختار روند:</span>
              <span className="font-mono text-[#c9d1d9]">{htf?.structure || 'RANGING'}</span>
            </div>
            <div className="flex justify-between">
              <span>سطح کلیدی (Key Level):</span>
              <span className="font-mono text-[#c9d1d9]">{htf?.keyLevel || snapshot?.bid || '-'}</span>
            </div>
          </div>
        </div>

        {/* ITF (M15) */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-[#e6edf3]">تایم‌فریم میانی (M15)</span>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-md font-mono font-bold ${
              itf?.bias === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-300' :
              itf?.bias === 'BEARISH' ? 'bg-rose-500/20 text-rose-300' :
              'bg-[#21262d] text-[#8b949e]'
            }`}>
              {itf?.bias || 'NEUTRAL'}
            </span>
          </div>
          <div className="text-xs text-[#8b949e] space-y-1">
            <div className="flex justify-between">
              <span>ناحیه فعال:</span>
              <span className="font-mono text-[#c9d1d9]">{itf?.activeZone || 'OB_ZONE'}</span>
            </div>
            <div className="flex justify-between">
              <span>همگرایی روند:</span>
              <span className="font-mono text-emerald-400">{mtf?.alignment ? 'تایید همگرایی' : 'در انتظار تایید'}</span>
            </div>
          </div>
        </div>

        {/* LTF (M5) */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-[#e6edf3]">تایم‌فریم ورود (M5)</span>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-md font-mono font-bold ${
              ltf?.bias === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-300' :
              ltf?.bias === 'BEARISH' ? 'bg-rose-500/20 text-rose-300' :
              'bg-[#21262d] text-[#8b949e]'
            }`}>
              {ltf?.bias || 'NEUTRAL'}
            </span>
          </div>
          <div className="text-xs text-[#8b949e] space-y-1">
            <div className="flex justify-between">
              <span>تریگر ورود:</span>
              <span className="font-mono text-[#c9d1d9]">{ltf?.entryTrigger || 'DISPLACEMENT_CONFIRMED'}</span>
            </div>
            <div className="flex justify-between">
              <span>نمره ساختار:</span>
              <span className="font-mono text-indigo-400">{score?.marketStructureScore ?? 0}/25</span>
            </div>
          </div>
        </div>
      </div>

      {/* SMC Details Grid: OrderBlocks, FVG, Liquidity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Blocks */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-[#e6edf3]">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>اردربلاک‌های فعال (Order Blocks)</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e] font-mono">
              امتیاز: {score?.orderBlockScore ?? 0}/15
            </span>
          </div>

          {obList.length === 0 ? (
            <div className="p-4 bg-[#0d1117] rounded-xl text-center text-xs text-[#8b949e] border border-dashed border-[#30363d]">
              در حال حاضر اردربلاک فعالی روی تایم‌فریم ۵ دقیقه شکل نگرفته است.
            </div>
          ) : (
            <div className="space-y-2">
              {obList.map((ob, idx) => (
                <div key={idx} className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    {ob.type === 'BULLISH' ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="font-bold text-[#e6edf3]">{ob.type} OB</span>
                    <span className="text-[#8b949e]">({ob.timeframe})</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[#8b949e]">محدوده: </span>
                    <span className="text-amber-300 font-bold">{ob.lowPrice} - {ob.highPrice}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fair Value Gaps (FVG) */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-[#e6edf3]">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>شکاف‌های ارزش منصفانه (Fair Value Gaps - FVG)</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e] font-mono">
              امتیاز: {score?.fvgScore ?? 0}/15
            </span>
          </div>

          {fvgList.length === 0 ? (
            <div className="p-4 bg-[#0d1117] rounded-xl text-center text-xs text-[#8b949e] border border-dashed border-[#30363d]">
              در حال حاضر هیچ FVG باز یا پر نشده‌ای در تایم‌فریم جاری وجود ندارد.
            </div>
          ) : (
            <div className="space-y-2">
              {fvgList.map((fvg, idx) => (
                <div key={idx} className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      fvg.type === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {fvg.type}
                    </span>
                    <span className="text-[#8b949e]">وضعیت: {fvg.status}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-amber-300 font-bold">{fvg.bottomPrice} - {fvg.topPrice}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
