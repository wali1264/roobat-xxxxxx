import React, { useState } from 'react';
import { EventEnvelope } from '../../shared/schemas';
import { Radio, Bot, Cpu, ShieldCheck, ShieldAlert, ArrowLeftRight, Clock, Filter, Sparkles, CheckCircle2 } from 'lucide-react';

interface LiveConsoleProps {
  events: EventEnvelope[];
}

export const LiveConsole: React.FC<LiveConsoleProps> = ({ events }) => {
  const [filterSource, setFilterSource] = useState<'ALL' | 'EA' | 'GEMINI_GATEWAY' | 'BACKEND'>('ALL');

  const filteredEvents = filterSource === 'ALL'
    ? events
    : events.filter((e) => e.source === filterSource);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <ArrowLeftRight className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#e6edf3]">کنسول مکالمه زنده و تبادلات دوطرفه (MT5 EA ↔ Gemini AI Live Dialogue)</h1>
            <p className="text-xs text-[#8b949e]">
              نمایش شفاف و گام‌به‌گام داده‌های ارسالی اکسپرت، تحلیل‌های صادره از Gemini 3.7 و تصمیمات اجرایی
            </p>
          </div>
        </div>

        {/* Source Filters */}
        <div className="flex items-center gap-2 bg-[#0d1117] p-1 rounded-xl border border-[#30363d] text-xs">
          <button
            onClick={() => setFilterSource('ALL')}
            className={`px-3 py-1 rounded-lg transition-all ${
              filterSource === 'ALL' ? 'bg-[#30363d] text-white font-bold' : 'text-[#8b949e] hover:text-white'
            }`}
          >
            همه رویدادها ({events.length})
          </button>
          <button
            onClick={() => setFilterSource('EA')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${
              filterSource === 'EA' ? 'bg-emerald-600 text-white font-bold' : 'text-[#8b949e] hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            اکسپرت MT5
          </button>
          <button
            onClick={() => setFilterSource('GEMINI_GATEWAY')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${
              filterSource === 'GEMINI_GATEWAY' ? 'bg-indigo-600 text-white font-bold' : 'text-[#8b949e] hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            هوش مصنوعی Gemini
          </button>
          <button
            onClick={() => setFilterSource('BACKEND')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-all ${
              filterSource === 'BACKEND' ? 'bg-purple-600 text-white font-bold' : 'text-[#8b949e] hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            موتور ریسک
          </button>
        </div>
      </div>

      {/* Dialogue Stream Container */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#21262d] pb-3 text-xs text-[#8b949e]">
          <span>جریان زنده تعاملات داده‌ای در شبکه محلی:</span>
          <span>پروتکل: REST JSON + SSE Stream</span>
        </div>

        <div className="space-y-4 max-h-[650px] overflow-y-auto pr-1">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-16 text-[#8b949e] bg-[#0d1117] border border-dashed border-[#30363d] rounded-xl space-y-2">
              <Radio className="w-8 h-8 text-[#484f58] mx-auto animate-pulse" />
              <p className="text-xs">در حال شنود پورت ۳۰۰۰ و منتظر برقراری مکالمه جدید میان MT5 و هوش مصنوعی...</p>
            </div>
          ) : (
            filteredEvents.map((evt) => {
              const timeStr = new Date(evt.timestamp).toLocaleTimeString('fa-IR');
              const isEA = evt.source === 'EA';
              const isGemini = evt.source === 'GEMINI_GATEWAY';
              const isBackend = evt.source === 'BACKEND';

              return (
                <div
                  key={evt.eventId}
                  className={`p-4 rounded-2xl border transition-all ${
                    isGemini
                      ? 'bg-indigo-950/20 border-indigo-500/40 mr-4'
                      : isEA
                      ? 'bg-emerald-950/20 border-emerald-500/40 ml-4'
                      : 'bg-[#0d1117] border-[#30363d]'
                  }`}
                >
                  {/* Header info */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      {isEA && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                          <Cpu className="w-4 h-4" />
                          <span>پیام ارسالی از اکسپرت متاتریدر ۵ (MQL5 EA)</span>
                        </div>
                      )}
                      {isGemini && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs">
                          <Bot className="w-4 h-4" />
                          <span>پاسخ و استدلال تحلیلی Gemini 3.7 Flash</span>
                        </div>
                      )}
                      {isBackend && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-400 font-bold text-xs">
                          <ShieldCheck className="w-4 h-4" />
                          <span>اعتبارسنجی موتور ریسک سرور (Risk Engine)</span>
                        </div>
                      )}

                      <span className="text-[11px] font-mono text-[#8b949e] px-2 py-0.5 rounded bg-[#21262d]">
                        {evt.eventType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#8b949e] font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{timeStr}</span>
                    </div>
                  </div>

                  {/* High-level readable summary */}
                  {evt.eventType === 'MARKET_SNAPSHOT' && (
                    <div className="text-xs text-[#e6edf3] mb-2 font-sans bg-[#0d1117] p-2.5 rounded-lg border border-[#21262d]">
                      📤 <strong>ارسال اسنپ‌شات بازار:</strong> نماد <span className="font-mono text-amber-300">{evt.symbol}</span> | قیمت Bid: <span className="font-mono text-emerald-400">{evt.payload?.bid || '-'}</span> | قیمت Ask: <span className="font-mono text-rose-400">{evt.payload?.ask || '-'}</span> | نمره ستاپ استراتژی: <span className="font-mono text-indigo-400 font-bold">{evt.payload?.score?.totalScore ?? '-'}/100</span>
                    </div>
                  )}

                  {evt.eventType === 'AI_DECISION' && (
                    <div className="text-xs text-[#e6edf3] mb-2 font-sans bg-[#0d1117] p-2.5 rounded-lg border border-[#21262d]">
                      🧠 <strong>تصمیم هوش مصنوعی:</strong> سیگنال <span className="font-mono font-bold text-indigo-300">{evt.payload?.decision?.decision}</span> | سطح اطمینان: <span className="font-mono text-emerald-400">{evt.payload?.decision?.confidence}</span> | زمان پردازش: <span className="font-mono text-cyan-300">{evt.payload?.latencyMs}ms</span>
                      <div className="mt-1 text-[#8b949e] text-[11px]">
                        استدلال: {evt.payload?.reasoning || evt.payload?.decision?.reasoning}
                      </div>
                    </div>
                  )}

                  {evt.eventType === 'HEARTBEAT' && (
                    <div className="text-xs text-[#8b949e] mb-2 font-sans bg-[#0d1117] p-2 rounded-lg border border-[#21262d]">
                      💓 پالس ارتباطی (Heartbeat) از متاتریدر ۵ دریافت شد. ترید خودکار در ترمینال: {evt.payload?.autoTradingEnabled ? 'فعال' : 'غیرفعال'}
                    </div>
                  )}

                  {/* Raw Payload JSON */}
                  <div className="bg-[#0d1117] p-2 rounded-lg border border-[#21262d] overflow-x-auto text-[11px] font-mono text-[#79c0ff]">
                    <pre>{JSON.stringify(evt.payload, null, 2)}</pre>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
