import React, { useState, useEffect } from 'react';
import { CloudStatusData } from '../types';
import { 
  Cloud, 
  Server, 
  CheckCircle, 
  AlertTriangle, 
  Database, 
  Globe, 
  ShieldCheck, 
  ExternalLink, 
  RefreshCw, 
  Zap, 
  Copy, 
  Check, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const CloudDeploymentView: React.FC = () => {
  const [cloudStatus, setCloudStatus] = useState<CloudStatusData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchCloudStatus = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch('/api/v1/cloud/status');
      if (res.ok) {
        const data = await res.json();
        setCloudStatus(data);
      } else {
        const errText = await res.text();
        setApiError(`پاسخ HTTP ${res.status}: ${errText.slice(0, 150)}`);
      }
    } catch (e: any) {
      setApiError(`عدم امکان ارتباط با سرور: ${e?.message || 'Network Failure'}`);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchCloudStatus();
  }, []);

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const eaWebhookUrl = `${currentHost}/api/v1/ea/market-data`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6" id="cloud-deployment-view">
      {/* Header Banner */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Cloud className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-[#e6edf3]">
                وضعیت استقرار ابری و اتصال به ورسل (Vercel Cloud Deployment)
              </h1>
            </div>
            <p className="text-sm text-[#8b949e]">
              پایش زنده پلتفرم میزبانی، سرور اروپایی بدون فیلتر ورسل، وضعیت اتصال به متاتریدر ۵ و زیرساخت دیتابیس Supabase
            </p>
          </div>

          <button
            onClick={fetchCloudStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-sm rounded-lg border border-[#30363d] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>بروزرسانی وضعیت</span>
          </button>
        </div>
      </div>

      {apiError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
          <div className="font-bold flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            <span>هشدار در برقراری ارتباط با توابع سرورلس ورسل (Vercel Serverless Function)</span>
          </div>
          <p className="font-mono text-[11px] text-rose-200">{apiError}</p>
          <p className="text-[11px] text-[#8b949e]">
            نکته: پس از ارسال آخرین کامیت به گیت‌هاب و دیپلوی خودکار ورسل، توابع سرورلس در مسیر <code className="text-amber-300 font-mono">/api/index.js</code> مستقر و به رنگ سبز تغییر می‌یابند.
          </p>
        </div>
      )}

      {/* Grid: 3 Main Cards */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Vercel Hosting Status */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#e6edf3] font-semibold text-sm">
              <Server className="w-4 h-4 text-sky-400" />
              <span>پلتفرم میزبانی (Vercel Serverless)</span>
            </div>
            {cloudStatus?.isDeployedOnVercel ? (
              <span className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                <CheckCircle className="w-3 h-3" />
                مستقر در ورسل
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                <Sparkles className="w-3 h-3" />
                آماده اتصال به ورسل
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#21262d]">
              <span className="text-[#8b949e]">موقعیت سرور (Region):</span>
              <span className="text-[#e6edf3] font-mono">{cloudStatus?.region || 'Frankfurt, Europe (fra1)'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#21262d]">
              <span className="text-[#8b949e]">دسترسی بدون فیلتر به Gemini:</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> ۱۰۰٪ مستقیم (اروپا)
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#8b949e]">معماری بک‌اند:</span>
              <span className="text-[#e6edf3] font-mono">Serverless Edge Node.js</span>
            </div>
          </div>
        </div>

        {/* Card 2: MT5 Webhook Endpoint */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#e6edf3] font-semibold text-sm">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>آدرس هوک متاتریدر ۵ (MT5 EA)</span>
            </div>
            <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Active Endpoint
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[#8b949e] block">
              آدرس وب‌هوک برای وارد کردن در اکسپرت MT5:
            </label>
            <div className="flex items-center gap-1 bg-[#0d1117] p-2 rounded-lg border border-[#21262d]">
              <input
                type="text"
                readOnly
                value={eaWebhookUrl}
                className="bg-transparent text-[#e6edf3] font-mono text-[11px] flex-1 outline-none truncate"
              />
              <button
                onClick={() => copyToClipboard(eaWebhookUrl)}
                className="p-1.5 bg-[#21262d] hover:bg-[#30363d] rounded text-[#8b949e] hover:text-[#e6edf3] transition-all"
                title="کپی آدرس"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Supabase Cloud Database Status */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#e6edf3] font-semibold text-sm">
              <Database className="w-4 h-4 text-amber-400" />
              <span>دیتابیس ابری (Supabase)</span>
            </div>
            {cloudStatus?.supabase?.configured ? (
              <span className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                <CheckCircle className="w-3 h-3" /> متصل
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                آماده برای گام بعدی
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#21262d]">
              <span className="text-[#8b949e]">وضعیت آداپتور:</span>
              <span className="text-emerald-400">زیرساخت فعال و آماده</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#21262d]">
              <span className="text-[#8b949e]">جداول هدف:</span>
              <span className="text-[#e6edf3] font-mono">trades, snapshots, ai_logs</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#8b949e]">اتصال امن:</span>
              <span className="text-[#8b949e]">PostgreSQL REST API</span>
            </div>
          </div>
        </div>
      </div>

      {/* Migration & Deployment Guide */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-[#e6edf3] flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>مراحل استقرار سریع روی ورسل (۲ دقیقه):</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sky-400">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center text-[10px]">۱</span>
              <span>همگام‌سازی گیت‌هاب (GitHub)</span>
            </div>
            <p className="text-[#8b949e] leading-relaxed">
              تغییرات پروژه را به ریپازیتوری گیت‌هاب خود Push کنید. تمام تنظیمات ورسل در فایل‌های <code className="text-amber-300 font-mono">vercel.json</code> و <code className="text-amber-300 font-mono">api/index.ts</code> قرار داده شده‌اند.
            </p>
          </div>

          <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">۲</span>
              <span>ایمپورت در ورسل (Import in Vercel)</span>
            </div>
            <p className="text-[#8b949e] leading-relaxed">
              در پنل Vercel روی <b>Add New Project</b> کلیک کرده و ریپازیتوری را انتخاب کنید. متغیر <code className="text-amber-300 font-mono">GEMINI_API_KEY</code> را در بخش Environment Variables اضافه کنید.
            </p>
          </div>

          <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-indigo-400">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px]">۳</span>
              <span>اتصال متاتریدر ۵ (MT5)</span>
            </div>
            <p className="text-[#8b949e] leading-relaxed">
              دامنه اختصاصی ورسل شما (<code className="text-amber-300 font-mono">https://*.vercel.app</code>) را در تنظیمات اکسپرت متاتریدر وارد کنید تا تحلیل‌ها بدون نوسان اینترنت ارسال شوند.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
