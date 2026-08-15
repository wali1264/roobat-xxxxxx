import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Copy, 
  Download, 
  Check, 
  Bot, 
  Activity, 
  Key, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Sparkles
} from 'lucide-react';
import { SystemHealthData } from '../types';
import { getStandaloneMql5Source } from '../lib/mql5Source';

interface VisibleDefectsViewProps {
  healthData?: SystemHealthData | null;
  health?: SystemHealthData | null;
  onRefreshHealth: () => void;
}

interface DiagnosticTestResult {
  id: string;
  name: string;
  category: 'BACKEND' | 'GEMINI' | 'MT5' | 'SSE' | 'DATABASE';
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
  details?: string;
  latencyMs?: number;
  solution?: string;
  rawResponse?: any;
}

export const VisibleDefectsView: React.FC<VisibleDefectsViewProps> = ({ 
  healthData, 
  health, 
  onRefreshHealth 
}) => {
  const currentHealth = healthData || health || null;

  const [isRunningScan, setIsRunningScan] = useState(false);
  const [testResults, setTestResults] = useState<DiagnosticTestResult[]>([]);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isAiTesting, setIsAiTesting] = useState(false);
  const [aiTestOutput, setAiTestOutput] = useState<{
    status: 'success' | 'error';
    message: string;
    latencyMs?: number;
    maskedKey?: string;
    model?: string;
    rawText?: string;
  } | null>(null);
  const [showMql5Code, setShowMql5Code] = useState(false);

  const currentBackendUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.vercel.app';
  const standaloneMql5Code = getStandaloneMql5Source(currentBackendUrl);

  const toggleDetails = (id: string) => {
    setExpandedDetails(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Run comprehensive real-time diagnostic scan
  const runDiagnosticScan = async () => {
    setIsRunningScan(true);
    const results: DiagnosticTestResult[] = [];

    // 1. Check Backend Gateway API
    const startBackend = performance.now();
    try {
      const res = await fetch('/api/v1/health');
      const latency = Math.round(performance.now() - startBackend);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        results.push({
          id: 'test-backend',
          name: 'سرور اصلی و دروازه API (Backend Gateway)',
          category: 'BACKEND',
          status: 'SUCCESS',
          message: `اتصال به درگاه سرور برقرار است (HTTP ${res.status} OK)`,
          details: `زمان پاسخ‌دهی: ${latency} میلی‌ثانیه | نسخه نرم‌افزار: ${data?.softwareVersion || '1.0.0'}`,
          latencyMs: latency,
          rawResponse: data
        });

        // 2. Check Gemini Key Pool
        const healthyKeys = data?.keyPoolSummary?.healthyCount ?? 0;
        const totalKeys = data?.keyPoolSummary?.totalConfigured ?? 0;
        if (healthyKeys > 0) {
          results.push({
            id: 'test-gemini',
            name: 'مخزن کلیدهای هوش مصنوعی (Gemini Key Pool)',
            category: 'GEMINI',
            status: 'SUCCESS',
            message: `${healthyKeys} کلید فعال و معتبر در سرور آماده پردازش است.`,
            details: `تعداد کل کلیدها: ${totalKeys} | کلیدهای فعال: ${healthyKeys} | در حال خنک‌سازی: ${data?.keyPoolSummary?.cooldownCount ?? 0} | اتمام سهمیه: ${data?.keyPoolSummary?.quotaExhaustedCount ?? 0}`
          });
        } else {
          results.push({
            id: 'test-gemini',
            name: 'مخزن کلیدهای هوش مصنوعی (Gemini Key Pool)',
            category: 'GEMINI',
            status: 'WARNING',
            message: 'هیچ کلید هوش مصنوعی در سرور لود نشده است (0 کلید پیکربندی‌شده).',
            details: 'متغیر محیطی GEMINI_API_KEY در تنظیمات هاست (Vercel) یافت نشد.',
            solution: 'در پنل مدیریت Vercel در مسیر Settings > Environment Variables یک متغیر با نام GEMINI_API_KEY ایجاد نموده و کلید دریافتی از Google AI Studio را ذخیره و برنامه را Redeploy فرمایید.'
          });
        }

        // 3. Check EA Connection
        const isEaConnected = data?.components?.eaConnection === 'CONNECTED';
        if (isEaConnected) {
          results.push({
            id: 'test-mt5',
            name: 'اتصال متاتریدر ۵ (MetaTrader 5 EA)',
            category: 'MT5',
            status: 'SUCCESS',
            message: 'پالس زنده (Heartbeat) از متاتریدر ۵ در ۳۰ ثانیه اخیر دریافت شده است.',
            details: 'اکسپرت در متاتریدر ۵ فعال و متصل به درگاه است.'
          });
        } else {
          results.push({
            id: 'test-mt5',
            name: 'اتصال متاتریدر ۵ (MetaTrader 5 EA)',
            category: 'MT5',
            status: 'WARNING',
            message: 'هنوز اکسپرت متاتریدر ۵ پالس ضربان یا دیتایی ارسال نکرده است.',
            details: 'سیستم منتظر دریافت اولین پالس Heartbeat از متاتریدر ۵ است.',
            solution: 'فایل اکسپرت SmartTraderEA.mq5 را در MetaEditor کامپایل کرده و آدرس درگاه سرور را در منوی Tools > Options > Expert Advisors در متاتریدر اضافه نمایید.'
          });
        }

        // 4. Check Database / Storage
        const isDbReady = data?.components?.database === 'HEALTHY' || data?.components?.database === 'READY';
        results.push({
          id: 'test-db',
          name: 'پایگاه داده و موتور ذخیره‌سازی (Storage Engine)',
          category: 'DATABASE',
          status: isDbReady ? 'SUCCESS' : 'WARNING',
          message: isDbReady ? 'موتور ذخیره‌سازی آماده ثبت و رهگیری معاملات است.' : 'دیتابیس در حالت حافظه سریع (In-Memory Store) فعال است.',
          details: 'محیط سرورلس به صورت خودکار روی ساختار داده‌ای امن با قابلیت گزارش‌گیری فعال است.'
        });

      } else {
        results.push({
          id: 'test-backend',
          name: 'سرور اصلی و دروازه API (Backend Gateway)',
          category: 'BACKEND',
          status: 'ERROR',
          message: `خطای سرور HTTP ${res.status}`,
          details: `پاسخ ناموفق از سرور با تاخیر ${latency} میلی‌ثانیه دریافت شد.`,
          solution: 'لاگ‌های اجرای توابع در پنل Vercel را بررسی کنید و مطمئن شوید توابع سرورلس به درستی مستقر شده‌اند.'
        });
      }
    } catch (err: any) {
      results.push({
        id: 'test-backend',
        name: 'سرور اصلی و دروازه API (Backend Gateway)',
        category: 'BACKEND',
        status: 'ERROR',
        message: 'عدم امکان برقراری ارتباط با سرور (Network / CORS Error)',
        details: err?.message || String(err),
        solution: 'مطمئن شوید آدرس دامنه صحیح است و تداخل فایروال یا شبکه وجود ندارد.'
      });
    }

    // 5. Test SSE Real-Time Stream
    try {
      const sseRes = await fetch('/api/v1/events/stream');
      if (sseRes.ok) {
        results.push({
          id: 'test-sse',
          name: 'جریان زنده وقایع (Real-Time SSE Stream)',
          category: 'SSE',
          status: 'SUCCESS',
          message: 'کانال بلادرنگ (Server-Sent Events) فعال و باز است.',
          details: 'مرورگر قادر است تغییرات قیمت و تصمیمات AI را بدون نیاز به رفرش دریافت کند.'
        });
      } else {
        results.push({
          id: 'test-sse',
          name: 'جریان زنده وقایع (Real-Time SSE Stream)',
          category: 'SSE',
          status: 'WARNING',
          message: 'کانال SSE پاسخ غیر 200 داد (Fallback Polling فعال است).',
          details: `وضعیت پاسخ: HTTP ${sseRes.status}`
        });
      }
    } catch (e: any) {
      results.push({
        id: 'test-sse',
        name: 'جریان زنده وقایع (Real-Time SSE Stream)',
        category: 'SSE',
        status: 'WARNING',
        message: 'کانال وقایع به حالت Polling خودکار تغییر وضعیت داد.',
        details: 'ارتباط بلادرنگ از طریق درخواست‌های دوره‌ای هدایت می‌شود.'
      });
    }

    setTestResults(results);
    setLastScanTime(new Date().toLocaleTimeString('fa-IR'));
    setIsRunningScan(false);
    if (typeof onRefreshHealth === 'function') {
      onRefreshHealth();
    }
  };

  useEffect(() => {
    runDiagnosticScan();
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(standaloneMql5Code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentBackendUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 3000);
  };

  const handleDownloadMql5 = () => {
    const blob = new Blob([standaloneMql5Code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'SmartTraderEA.mq5';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Real-time direct diagnostic call to Gemini AI API
  const handleTestGeminiAi = async () => {
    setIsAiTesting(true);
    setAiTestOutput(null);
    try {
      const res = await fetch('/api/v1/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Quantitative Diagnostic Ping. Validate Gemini API connectivity and return JSON: {"status":"READY","timestamp":' + Date.now() + '}'
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        setAiTestOutput({
          status: 'success',
          message: `اتصال به Gemini AI با موفقیت تأیید شد! کلید شماره ${data?.slotIndex ?? 1} (${data?.maskedKey || 'فعال'}) پاسخ داد.`,
          latencyMs: data?.latencyMs,
          maskedKey: data?.maskedKey,
          model: data?.model,
          rawText: typeof data?.response === 'string' ? data.response : JSON.stringify(data?.response, null, 2)
        });
      } else {
        setAiTestOutput({
          status: 'error',
          message: data?.message || data?.error || `خطا در دریافت پاسخ از هوش مصنوعی (HTTP ${res.status})`,
          latencyMs: data?.latencyMs,
          maskedKey: data?.maskedKey
        });
      }
    } catch (e: any) {
      setAiTestOutput({
        status: 'error',
        message: `خطای ارتباط شبکه: ${e?.message || String(e)}`
      });
    } finally {
      setIsAiTesting(false);
      if (typeof onRefreshHealth === 'function') {
        onRefreshHealth();
      }
    }
  };

  const errorCount = testResults.filter(r => r.status === 'ERROR').length;
  const warningCount = testResults.filter(r => r.status === 'WARNING').length;
  const successCount = testResults.filter(r => r.status === 'SUCCESS').length;

  return (
    <div className="space-y-6">
      {/* Header & Quick Scan Bar */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                عیوب قابل مشاهده و عیب‌یابی سامانه
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                  Live System Diagnostics
                </span>
              </h2>
              <p className="text-xs text-[#8b949e] mt-0.5">
                بررسی بلادرنگ وضعیت سلامت درگاه سرور، کلیدهای Gemini AI، پالس‌های متاتریدر ۵ و عیوب ارتباطی
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runDiagnosticScan}
            disabled={isRunningScan}
            className="flex items-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition shadow cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRunningScan ? 'animate-spin' : ''}`} />
            <span>{isRunningScan ? 'در حال اسکن عیوب...' : 'اسکن مجدد سلامت سیستم'}</span>
          </button>
          {lastScanTime && (
            <span className="text-xs text-[#8b949e] bg-[#21262d] px-3 py-2 rounded-lg border border-[#30363d]">
              آخرین بررسی: {lastScanTime}
            </span>
          )}
        </div>
      </div>

      {/* Direct MT5 Error 4014 & AI Key Resolution Action Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MT5 WebRequest Configuration Card */}
        <div className="p-4 rounded-xl bg-[#161b22] border border-amber-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>تنظیم ارتباط متاتریدر ۵ (Localhost یا سرور)</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
              اقدام در MT5
            </span>
          </div>
          <p className="text-xs text-[#c9d1d9] leading-relaxed">
            جهت اتصال متاتریدر ۵ و رفع خطای ۴۰۱۴ در لاگ Experts:
          </p>
          <ol className="text-xs text-[#8b949e] space-y-1.5 list-decimal list-inside">
            <li>در متاتریدر ۵ کلید <span className="text-amber-300 font-mono">Ctrl + O</span> را بزنید (منوی Tools &gt; Options).</li>
            <li>به تب <span className="text-amber-300 font-semibold">Expert Advisors</span> بروید.</li>
            <li>تیک گزینه <span className="text-amber-300 font-semibold">Allow WebRequest for listed URL</span> را فعال کنید.</li>
            <li>آدرس سرور را اضافه کرده و <span className="text-amber-300 font-semibold">OK</span> کنید:</li>
          </ol>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs font-mono text-indigo-300">
            <span className="truncate">{currentBackendUrl}</span>
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-white text-[11px] rounded transition cursor-pointer"
            >
              {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedUrl ? 'کپی شد' : 'کپی URL'}</span>
            </button>
          </div>
        </div>

        {/* Localhost & Gemini Key Management Card */}
        <div className="p-4 rounded-xl bg-[#161b22] border border-emerald-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Key className="w-4 h-4" />
              <span>اجرای لوکال با یک کلیک (start-trader.bat)</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              ویندوز / لوکال
            </span>
          </div>
          <p className="text-xs text-[#c9d1d9] leading-relaxed">
            برای اجرای سریع، پرسرعت و پایدار روی سیستم شخصی خودتان:
          </p>
          <ol className="text-xs text-[#8b949e] space-y-1.5 list-decimal list-inside">
            <li>فایل <span className="text-emerald-300 font-mono">.env</span> را در ریشه پروژه با کلیدهای خود پر کنید.</li>
            <li>روی فایل <span className="text-emerald-300 font-bold font-mono">start-trader.bat</span> دابل‌کلیک کنید.</li>
            <li>داشبورد روی <span className="text-emerald-300 font-mono">http://localhost:3000</span> باز می‌شود.</li>
            <li>هنگام اتمام کار، با بستن پنجره کنسول کل برنامه خاموش می‌شود.</li>
          </ol>
          <div className="p-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-[#8b949e] flex items-center justify-between">
            <span>فرمت کلیدها: <span className="font-mono text-emerald-400 font-bold">GEMINI_API_KEY_1 تا 30</span></span>
            <span className="text-[11px] text-emerald-400">مدل: Gemini 3.7 Flash</span>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{successCount}</div>
            <div className="text-xs text-[#8b949e]">سرویس‌های سالم و فعال</div>
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-amber-400">{warningCount}</div>
            <div className="text-xs text-[#8b949e]">هشدارها / نیاز به اقدام</div>
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-rose-400">{errorCount}</div>
            <div className="text-xs text-[#8b949e]">عیوب بحرانی و قطعی</div>
          </div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-indigo-400">
              {currentHealth?.keyPoolSummary?.healthyCount ?? 0} / {currentHealth?.keyPoolSummary?.totalConfigured ?? 0}
            </div>
            <div className="text-xs text-[#8b949e]">کلیدهای فعال Gemini AI</div>
          </div>
        </div>
      </div>

      {/* Main Diagnostic Checklist */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 bg-[#21262d] border-b border-[#30363d] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            نتایج اسکن زنده مؤلفه‌های سیستم
          </h3>
          <span className="text-xs text-[#8b949e]">وضعیت واقعی و متصل به درگاه</span>
        </div>

        <div className="divide-y divide-[#30363d]">
          {testResults.map((test) => {
            const isExpanded = !!expandedDetails[test.id];
            return (
              <div key={test.id} className="p-4 transition hover:bg-[#1f242c]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {test.status === 'SUCCESS' && (
                        <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                      {test.status === 'WARNING' && (
                        <div className="p-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                      {test.status === 'ERROR' && (
                        <div className="p-1.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <XCircle className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{test.name}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          test.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                          test.status === 'WARNING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}>
                          {test.status}
                        </span>
                        {test.latencyMs !== undefined && (
                          <span className="text-[10px] text-[#8b949e] font-mono">
                            {test.latencyMs}ms
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#c9d1d9] mt-1">{test.message}</p>
                      {test.details && (
                        <p className="text-[11px] text-[#8b949e] mt-0.5 font-mono">{test.details}</p>
                      )}
                      {test.solution && (
                        <div className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                          <div>
                            <span className="font-semibold">راهکار برطرف‌سازی عیب: </span>
                            {test.solution}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {(test.details || test.solution || test.rawResponse) && (
                    <button
                      onClick={() => toggleDetails(test.id)}
                      className="text-xs text-[#8b949e] hover:text-white p-1.5 rounded hover:bg-[#30363d] transition cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {isExpanded && test.rawResponse && (
                  <div className="mt-3 p-3 bg-[#0d1117] rounded-lg border border-[#30363d] text-[11px] font-mono text-[#7ee787] overflow-x-auto">
                    <pre>{JSON.stringify(test.rawResponse, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live AI Test Engine Box */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">تست زنده فراخوانی مدل هوش مصنوعی (Gemini Live Test)</h3>
              <p className="text-xs text-[#8b949e]">یک درخواست واقعی به موتور هوش مصنوعی ارسال می‌کند و زمان پاسخ و وضعیت کلید را می‌سنجد</p>
            </div>
          </div>

          <button
            onClick={handleTestGeminiAi}
            disabled={isAiTesting}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition shadow cursor-pointer"
          >
            <Sparkles className={`w-4 h-4 ${isAiTesting ? 'animate-spin' : ''}`} />
            <span>{isAiTesting ? 'در حال ارسال درخواست به Gemini...' : 'تست زنده هوش مصنوعی'}</span>
          </button>
        </div>

        {aiTestOutput && (
          <div className={`p-4 rounded-xl border text-xs ${
            aiTestOutput.status === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <div className="flex items-center justify-between font-bold text-sm mb-1">
              <span className="flex items-center gap-2">
                {aiTestOutput.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                {aiTestOutput.status === 'success' ? 'پاسخ زنده Gemini دریافت شد' : 'خطای ارتباط با Gemini'}
              </span>
              {aiTestOutput.latencyMs !== undefined && (
                <span className="font-mono text-xs opacity-80">تاخیر: {aiTestOutput.latencyMs}ms</span>
              )}
            </div>
            <p className="mt-1">{aiTestOutput.message}</p>
            {aiTestOutput.rawText && (
              <div className="mt-2 p-2 bg-[#0d1117] rounded border border-[#30363d] text-emerald-400 font-mono text-[11px] overflow-x-auto">
                <pre>{aiTestOutput.rawText}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MetaTrader 5 Standalone MQL5 Code Deployment Card */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">سورس کد نهایی اکسپرت متاتریدر ۵ (SmartTraderEA.mq5)</h3>
              <p className="text-xs text-[#8b949e]">
                نسخه تک‌فایلی مستقل، کامپایل با ۰ خطا در MetaEditor بدون نیاز به هیچ کتابخانه جانبی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-xs font-semibold rounded-lg border border-[#30363d] transition cursor-pointer"
              title="کپی آدرس درگاه سرور"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'آدرس کپی شد' : 'کپی آدرس سرور'}</span>
            </button>

            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-xs font-semibold rounded-lg border border-[#30363d] transition cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'کد کپی شد' : 'کپی کامل سورس'}</span>
            </button>

            <button
              onClick={handleDownloadMql5}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold rounded-lg transition shadow cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود فایل SmartTraderEA.mq5</span>
            </button>
          </div>
        </div>

        {/* Integration Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-1">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <span>۱. کپی به پوشه Experts</span>
            </div>
            <p className="text-[#8b949e]">
              فایل دانلود شده را در متاتریدر ۵ در مسیر <span className="text-[#c9d1d9] font-mono">File &gt; Open Data Folder &gt; MQL5/Experts</span> قرار دهید.
            </p>
          </div>

          <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-1">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span>۲. کامپایل در MetaEditor</span>
            </div>
            <p className="text-[#8b949e]">
              کلید <span className="text-[#c9d1d9] font-mono">F7</span> را بزنید. سورس با ۰ خطا و ۰ اخطار کامپایل می‌گردد.
            </p>
          </div>

          <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-1">
            <div className="font-bold text-indigo-400 flex items-center gap-1.5">
              <span>۳. مجاز کردن WebRequest</span>
            </div>
            <p className="text-[#8b949e]">
              در <span className="text-[#c9d1d9] font-mono">Tools &gt; Options &gt; Expert Advisors</span> آدرس سرور <span className="text-indigo-300 font-mono">{currentBackendUrl}</span> را اضافه کنید.
            </p>
          </div>
        </div>

        {/* Toggle View Source Code */}
        <div className="pt-2">
          <button
            onClick={() => setShowMql5Code(!showMql5Code)}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer"
          >
            {showMql5Code ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>{showMql5Code ? 'بستن پیش‌نمایش سورس کد MQL5' : 'مشاهده سورس کد کامل MQL5'}</span>
          </button>

          {showMql5Code && (
            <div className="mt-3 p-4 bg-[#0d1117] rounded-xl border border-[#30363d] max-h-96 overflow-y-auto text-left font-mono text-[11px] text-[#c9d1d9]" dir="ltr">
              <pre>{standaloneMql5Code}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
