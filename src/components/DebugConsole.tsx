import React, { useState, useEffect } from 'react';
import { Terminal, Key, ShieldCheck, AlertCircle, Clock, Database, RefreshCw, Send, CheckCircle2, XCircle, Code2, Sparkles, Copy, Check } from 'lucide-react';

export const DebugConsole: React.FC = () => {
  const [keySlots, setKeySlots] = useState<any[]>([]);
  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<{ connected: boolean; message: string; httpCode?: number }>({
    connected: true,
    message: 'در حال بررسی اتصال به سرور...'
  });

  // Manual Test State
  const [customPrompt, setCustomPrompt] = useState('Analyze live XAUUSD setup for Scalping (M1-M5). Bid: 4386.98, Ask: 4387.24. Determine market bias (Bullish/Bearish), calculate exact entry zone, SL, TP1, and SMC confluence rationale in Persian.');
  const [manualApiKey, setManualApiKey] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState('');

  // Trade Traceability State
  const [tradeIdSearch, setTradeIdSearch] = useState('');
  const [traceabilityResult, setTraceabilityResult] = useState<any>(null);
  const [traceError, setTraceError] = useState('');
  const [reloadMsg, setReloadMsg] = useState('');

  const fetchKeyPool = async () => {
    try {
      const res = await fetch('/api/v1/keypool');
      if (res.ok) {
        const data = await res.json();
        setKeySlots(data.slots || []);
        setBackendStatus({
          connected: true,
          message: `بک‌اند آنلاین است (${data.slots?.length || 0} اسلات تعریف شده)`,
          httpCode: res.status
        });
      } else {
        const text = await res.text();
        setBackendStatus({
          connected: false,
          message: `خطای سرور HTTP ${res.status}: ${text.slice(0, 120)}`,
          httpCode: res.status
        });
      }
    } catch (err: any) {
      setBackendStatus({
        connected: false,
        message: `عدم پاسخگویی بک‌اند: ${err?.message || 'Network Request Failed'}`
      });
    }
  };

  const fetchAiHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch('/api/v1/ai/history');
      if (res.ok) {
        const data = await res.json();
        setAiHistory(data.history || []);
        if (!selectedLog && data.history && data.history.length > 0) {
          setSelectedLog(data.history[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };


  useEffect(() => {
    fetchKeyPool();
    fetchAiHistory();
    const interval = setInterval(() => {
      fetchKeyPool();
      fetchAiHistory();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleReloadEnv = async () => {
    setReloadMsg('در حال اسکن مجدد کلیدها و متغیرهای Vercel / .env...');
    try {
      const res = await fetch('/api/v1/keypool/reload', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setKeySlots(data.slots || []);
        setReloadMsg(`اسکن مجدد با موفقیت انجام شد: ${data.healthySlots || 0} کلید فعال از میان ${data.totalSlots || 0} اسلات شناسایی شد.`);
      } else {
        const txt = await res.text();
        setReloadMsg(`خطای سرور HTTP ${res.status}: ${txt.slice(0, 80)}`);
      }
      setTimeout(() => setReloadMsg(''), 5000);
    } catch (e: any) {
      setReloadMsg(`خطا در ارتباط با سرور: ${e?.message || 'Network error'}`);
    }
  };

  const handleRunAiTest = async () => {
    setTestLoading(true);
    setTestError('');
    setTestResult(null);
    try {
      const res = await fetch('/api/v1/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: customPrompt,
          apiKey: manualApiKey.trim() || undefined
        })
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) {
          setTestError(data.message || data.error || 'خطا در ارتباط با Gemini');
        } else {
          setTestResult(data);
          fetchKeyPool();
          fetchAiHistory();
        }
      } else {
        const text = await res.text();
        setTestError(`پاسخ سرور نامعتبر است (HTTP ${res.status}): ${text.slice(0, 100)}`);
      }
    } catch (err: any) {
      setTestError(err.message || 'خطا در برقراری ارتباط');
    } finally {
      setTestLoading(false);
    }
  };

  const handleTraceSearch = async () => {
    if (!tradeIdSearch.trim()) return;
    setTraceError('');
    setTraceabilityResult(null);
    try {
      const res = await fetch(`/api/v1/trades/${tradeIdSearch.trim()}/traceability`);
      if (!res.ok) {
        setTraceError('شناسه معامله پیدا نشد.');
        return;
      }
      const data = await res.json();
      setTraceabilityResult(data);
    } catch (err) {
      setTraceError('خطا در دریافت اطلاعات ردیابی معامله.');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Key Pool Management & Direct Activation */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#21262d] pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-base text-[#e6edf3]">مخزن کلیدهای هوش مصنوعی Gemini (Key Pool Inspector)</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReloadEnv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-amber-300 text-xs transition font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              اسکن مجدد فایل .env
            </button>
            <span className={`text-xs px-2.5 py-1 rounded font-bold ${
              keySlots.filter(s => s.status === 'HEALTHY').length > 0
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {keySlots.filter(s => s.status === 'HEALTHY').length} کلید فعال از {keySlots.length} اسلات
            </span>
          </div>
        </div>

        {/* Server / Backend Connectivity Alert Banner */}
        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
          backendStatus.connected
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-950/30 border-rose-500/50 text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              backendStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`} />
            <div>
              <span className="font-bold">وضعیت ارتباط با بک‌اند (Backend Status): </span>
              <span className="font-mono">{backendStatus.message}</span>
            </div>
          </div>
          {!backendStatus.connected && (
            <button
              onClick={fetchKeyPool}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold"
            >
              تلاش مجدد
            </button>
          )}
        </div>

        {reloadMsg && (

          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{reloadMsg}</span>
          </div>
        )}

        {keySlots.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] text-xs text-[#8b949e] space-y-2">
            <div className="text-rose-400 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              هیچ کلید فعالی در سرور یافت نشد.
            </div>
            <p>
              کلیدهای خود را در فایل <code className="text-amber-300 bg-[#161b22] px-1.5 py-0.5 rounded">.env</code> به صورت <code className="text-emerald-300">GEMINI_API_KEY_1=your_key</code> قرار داده و دکمه «اسکن مجدد فایل .env» را بزنید، یا کلید را در باکس زیر وارد نمایید تا فوراً تست و فعال شود.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {keySlots.map((slot) => (
              <div
                key={slot.slotIndex}
                className={`p-3.5 rounded-xl border font-mono text-xs space-y-1.5 ${
                  slot.status === 'HEALTHY'
                    ? 'bg-emerald-950/10 border-emerald-500/30 text-emerald-200'
                    : slot.status === 'COOLDOWN'
                    ? 'bg-amber-950/10 border-amber-500/30 text-amber-200'
                    : 'bg-rose-950/10 border-rose-500/30 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>اسلات #{slot.slotIndex} ({slot.keyMasked})</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    slot.status === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {slot.status}
                  </span>
                </div>
                <div className="text-[11px] text-[#8b949e]">
                  درخواست‌ها: {slot.requestCount} | موفق: {slot.successCount} | خطا: {slot.failureCount}
                </div>
                {slot.lastError && (
                  <div className="text-[10px] text-rose-300 truncate" title={slot.lastError}>
                    خطا: {slot.lastError}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Interactive AI Prompt & Key Live Tester */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-base text-[#e6edf3]">ارسال تست زنده به هوش مصنوعی (Live AI Request & Response Tester)</h2>
          </div>
          <span className="text-xs text-[#8b949e]">مدل: gemini-3.7-flash</span>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#8b949e] mb-1">
                ورود کلید مستقیم (اختیاری جهت فعال‌سازی آنی):
              </label>
              <input
                type="text"
                placeholder="AQ.Ab8... یا AIzaSy..."
                value={manualApiKey}
                onChange={(e) => setManualApiKey(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8b949e] mb-1">
                الگوهای آماده پرامپت تست:
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setCustomPrompt('Analyze live XAUUSD for Scalping (M1-M5). Bid: 4386.98, Ask: 4387.24. Determine market bias (Bullish/Bearish), calculate exact entry zone, SL, TP1, and SMC confluence rationale in Persian.')}
                  className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[11px] text-indigo-300"
                >
                  تحلیل SMC زنده طلا
                </button>
                <button
                  onClick={() => setCustomPrompt('System Health Diagnostic Ping. Return valid JSON: {"status":"READY","engine":"Gemini"}')}
                  className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[11px] text-emerald-300"
                >
                  تست پینگ و سلامت
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#8b949e] mb-1">
              پرامپت ارسالی به موتور هوش مصنوعی:
            </label>
            <textarea
              rows={3}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-3 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleRunAiTest}
              disabled={testLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/20"
            >
              {testLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  در حال ارسال و دریافت از Gemini...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  ارسال درخواست و ارزیابی پاسخ هوش مصنوعی
                </>
              )}
            </button>
          </div>

          {testError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                خطا در برقراری ارتباط با هوش مصنوعی:
              </div>
              <p className="font-mono text-[11px]">{testError}</p>
            </div>
          )}

          {testResult && (
            <div className="p-4 rounded-xl bg-[#0d1117] border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-[#21262d] pb-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  پاسخ با موفقیت از Gemini دریافت شد ({testResult.latencyMs} میلی‌ثانیه | اسلات #{testResult.slotIndex})
                </div>
                <button
                  onClick={() => copyToClipboard(testResult.response, 'test-res')}
                  className="flex items-center gap-1 text-[11px] text-[#8b949e] hover:text-white"
                >
                  {copiedId === 'test-res' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  کپی خروجی خام
                </button>
              </div>
              <div className="text-xs font-mono text-[#a5d6ff] bg-[#161b22] p-3 rounded-lg border border-[#30363d] overflow-x-auto max-h-64 whitespace-pre-wrap">
                {testResult.response}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Dedicated AI Payload & Transmission Inspector (اطلاعات ارسالی و دریافتی AI) */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#21262d] pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold text-base text-[#e6edf3]">اطلاعات ارسالی و دریافتی هوش مصنوعی (AI Payload & Decision Inspector)</h2>
              <p className="text-xs text-[#8b949e]">بررسی دقیق پرامپت‌ها، داده‌های ارسالی چارت MT5 و پاسخ‌های ساختاریافته هوش مصنوعی</p>
            </div>
          </div>
          <button
            onClick={fetchAiHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-xs text-[#e6edf3] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            بروزرسانی لاگ‌ها
          </button>
        </div>

        {aiHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8b949e] bg-[#0d1117] rounded-xl border border-[#30363d] space-y-2">
            <Clock className="w-6 h-6 mx-auto text-[#8b949e] opacity-50" />
            <div>هنوز درخواستی به هوش مصنوعی ثبت نشده است.</div>
            <p className="text-[11px]">با زدن دکمه «ارسال درخواست» در بخش بالا یا دریافت اسنپ‌شات از متاتریدر ۵، اطلاعات کامل ارسالی و دریافتی در این جدول ظاهر می‌شود.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Logs List */}
            <div className="lg:col-span-5 space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {aiHistory.map((item) => {
                const isSelected = selectedLog?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedLog(item)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#1f242c] border-indigo-500 shadow-md'
                        : 'bg-[#0d1117] border-[#30363d] hover:border-[#484f58]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.source === 'EA_AUTOMATION'
                          ? 'bg-blue-500/20 text-blue-400'
                          : item.source === 'MANUAL_ADVISOR'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {item.source === 'EA_AUTOMATION' ? 'اکسپرت MT5' : 'دستیار تحلیل'}
                      </span>
                      <span className="text-[10px] text-[#8b949e] font-mono">
                        {new Date(item.timestamp).toLocaleTimeString('fa-IR')}
                      </span>
                    </div>

                    <div className="text-white font-medium truncate mb-1" title={item.prompt}>
                      {item.prompt}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#8b949e] font-mono">
                      <span>{item.latencyMs}ms | اسلات #{item.slotIndex ?? 'N/A'}</span>
                      <span className={item.success ? 'text-emerald-400' : 'text-rose-400'}>
                        {item.success ? 'موفق (200 OK)' : 'خطا'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Log Detail Inspector */}
            <div className="lg:col-span-7 bg-[#0d1117] border border-[#30363d] rounded-xl p-4 space-y-4 max-h-[500px] overflow-y-auto">
              {selectedLog ? (
                <>
                  <div className="flex items-center justify-between border-b border-[#21262d] pb-2">
                    <div className="flex items-center gap-2 font-bold text-xs text-[#e6edf3]">
                      <span>جزییات درخواست #{selectedLog.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] ${selectedLog.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {selectedLog.success ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedLog, null, 2), 'log-detail')}
                      className="flex items-center gap-1 text-[11px] text-[#8b949e] hover:text-white"
                    >
                      {copiedId === 'log-detail' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      کپی کامل JSON
                    </button>
                  </div>

                  {/* Header Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <div className="p-2 bg-[#161b22] rounded-lg border border-[#30363d]">
                      <div className="text-[10px] text-[#8b949e]">مدل:</div>
                      <div className="text-[#e6edf3] font-bold truncate">{selectedLog.model}</div>
                    </div>
                    <div className="p-2 bg-[#161b22] rounded-lg border border-[#30363d]">
                      <div className="text-[10px] text-[#8b949e]">زمان پاسخ (Latency):</div>
                      <div className="text-emerald-400 font-bold">{selectedLog.latencyMs} ms</div>
                    </div>
                    <div className="p-2 bg-[#161b22] rounded-lg border border-[#30363d]">
                      <div className="text-[10px] text-[#8b949e]">کلید فعال:</div>
                      <div className="text-amber-400 font-bold">{selectedLog.maskedKey || `Slot #${selectedLog.slotIndex || 1}`}</div>
                    </div>
                  </div>

                  {/* 1. Sent Data Section */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-indigo-300">۱. متن پرامپت و اطلاعات ارسالی به هوش مصنوعی:</div>
                    <div className="bg-[#161b22] p-3 rounded-lg border border-[#30363d] font-mono text-[11px] text-[#a5d6ff] whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {selectedLog.prompt}
                    </div>
                  </div>

                  {/* 2. Structured Decision if available */}
                  {selectedLog.decision && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-emerald-300">۲. تحلیل و استدلال استخراج‌شده اسمارت‌مانی (Persian Rationale):</div>
                      <div className="bg-[#161b22] p-3 rounded-lg border border-[#30363d] text-xs space-y-2">
                        <div className="flex items-center gap-4 text-xs font-bold">
                          <span>جهت بازار: <strong className="text-indigo-400">{selectedLog.decision.bias}</strong></span>
                          <span>تصمیم: <strong className="text-emerald-400">{selectedLog.decision.decision}</strong></span>
                          <span>کیفیت ستاپ: <strong className="text-amber-400">{selectedLog.decision.setupQuality}/100</strong></span>
                        </div>
                        {selectedLog.decision.reasonsFa?.length > 0 && (
                          <div className="text-[11px] text-[#8b949e] space-y-1">
                            <span className="text-[#e6edf3] font-bold">دلایل ورود:</span>
                            <ul className="list-disc list-inside space-y-0.5 text-emerald-200">
                              {selectedLog.decision.reasonsFa.map((r: string, idx: number) => (
                                <li key={idx}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {selectedLog.decision.warningsFa?.length > 0 && (
                          <div className="text-[11px] text-[#8b949e] space-y-1">
                            <span className="text-amber-300 font-bold">هشدارهای ریسک:</span>
                            <ul className="list-disc list-inside space-y-0.5 text-amber-200">
                              {selectedLog.decision.warningsFa.map((w: string, idx: number) => (
                                <li key={idx}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. Raw AI Response text */}
                  {selectedLog.rawResponse && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-[#8b949e]">۳. پاسخ خام متنی (Raw AI Text Output):</div>
                      <div className="bg-[#161b22] p-3 rounded-lg border border-[#30363d] font-mono text-[11px] text-[#8b949e] whitespace-pre-wrap max-h-36 overflow-y-auto">
                        {selectedLog.rawResponse}
                      </div>
                    </div>
                  )}

                  {selectedLog.error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 space-y-1">
                      <div className="font-bold">خطای ثبت‌شده:</div>
                      <div className="font-mono text-[11px]">{selectedLog.error}</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs text-[#8b949e] text-center py-12">یک لاگ را از لیست سمت راست انتخاب کنید.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Trade Traceability Inspector */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-base text-[#e6edf3]">ردیابی کامل چرخه معامله (Trade Traceability Matrix)</h2>
          </div>
        </div>

        <p className="text-xs text-[#8b949e]">
          با وارد کردن شناسه معامله (Trade ID یا شماره تیکت)، کل مسیر تصمیم‌گیری از اسنپ‌شات بازار تا تحلیل AI و ارزیابی ریسک را ردیابی کنید.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="مثال: trd-1001 یا 8841021"
            value={tradeIdSearch}
            onChange={(e) => setTradeIdSearch(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-[#e6edf3] focus:outline-none focus:border-indigo-500 w-64 font-mono"
          />
          <button
            onClick={handleTraceSearch}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-lg font-medium transition"
          >
            جستجو و ردیابی
          </button>
        </div>

        {traceError && (
          <div className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
            {traceError}
          </div>
        )}

        {traceabilityResult && (
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 space-y-3 font-mono text-xs">
            <div className="font-bold text-emerald-400 border-b border-[#21262d] pb-2">
              اطلاعات معامله #{traceabilityResult.trade.ticket} (Trade ID: {traceabilityResult.trade.tradeId})
            </div>
            <div className="grid grid-cols-2 gap-2 text-[#8b949e]">
              <div>نماد: <span className="text-[#e6edf3]">{traceabilityResult.trade.symbol}</span></div>
              <div>تایم‌فریم: <span className="text-[#e6edf3]">{traceabilityResult.trade.timeframe}</span></div>
              <div>نسخه پرامپت: <span className="text-[#e6edf3]">{traceabilityResult.promptVersion}</span></div>
              <div>نسخه نرم‌افزار: <span className="text-[#e6edf3]">{traceabilityResult.softwareVersion}</span></div>
            </div>

            <div className="bg-[#161b22] p-3 rounded-lg border border-[#30363d] overflow-x-auto text-[#a5d6ff]">
              <pre>{JSON.stringify(traceabilityResult, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
