import React from 'react';
import { Sliders, ShieldCheck, Cpu, Bell, HelpCircle } from 'lucide-react';

export const SettingsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-base text-[#e6edf3]">تنظیمات استراتژی، ریسک و پارامترهای غیرحساس (Strategy & Risk Settings)</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Strategy Scoring Weights */}
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-sm text-[#e6edf3]">وزن‌دهی مولفه‌های امتیاز دهی (0-100 Score Weights)</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[#8b949e]">
                <span>Market Structure (ساختار بازار)</span>
                <span className="font-bold text-[#e6edf3]">25٪</span>
              </div>
              <div className="flex justify-between items-center text-[#8b949e]">
                <span>Displacement (جابه‌جایی پرقدرت)</span>
                <span className="font-bold text-[#e6edf3]">20٪</span>
              </div>
              <div className="flex justify-between items-center text-[#8b949e]">
                <span>Fair Value Gap (شکاف ارزش منصفانه FVG)</span>
                <span className="font-bold text-[#e6edf3]">15٪</span>
              </div>
              <div className="flex justify-between items-center text-[#8b949e]">
                <span>Order Block (بلاک سفارشات)</span>
                <span className="font-bold text-[#e6edf3]">15٪</span>
              </div>
              <div className="flex justify-between items-center text-[#8b949e]">
                <span>Liquidity Sweep (جاروب نقدینگی)</span>
                <span className="font-bold text-[#e6edf3]">10٪</span>
              </div>
              <div className="flex justify-between items-center text-[#8b949e]">
                <span>Support/Resistance (حمایت/مقاومت)</span>
                <span className="font-bold text-[#e6edf3]">10٪</span>
              </div>
              <div className="flex justify-between items-center text-[#8b949e]">
                <span>News Filter (فیلتر اخبار)</span>
                <span className="font-bold text-[#e6edf3]">5٪</span>
              </div>
            </div>
          </div>

          {/* Risk Control Parameters */}
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-sm text-[#e6edf3]">حدود ریسک و انضباط قطعی (Risk Rules)</h3>
            <div className="space-y-2 text-[#8b949e]">
              <div className="flex justify-between items-center">
                <span>حداقل امتیاز حدنصاب ورود</span>
                <span className="font-bold text-emerald-400">80 از 100</span>
              </div>
              <div className="flex justify-between items-center">
                <span>حداقل نسبت سود به زیان (RR)</span>
                <span className="font-bold text-[#e6edf3]">1 : 1.5</span>
              </div>
              <div className="flex justify-between items-center">
                <span>حداکثر ریسک مجاز در هر معامله</span>
                <span className="font-bold text-[#e6edf3]">1.0٪ از بالانس</span>
              </div>
              <div className="flex justify-between items-center">
                <span>سقف پوزیشن‌های باز همزمان</span>
                <span className="font-bold text-[#e6edf3]">۳ پوزیشن</span>
              </div>
              <div className="flex justify-between items-center">
                <span>بلاک اخبار پرریسک (قبل / بعد)</span>
                <span className="font-bold text-[#e6edf3]">۱۵ دقیقه</span>
              </div>
              <div className="flex justify-between items-center">
                <span>مدیریت هوشمند خروج (Smart Exit)</span>
                <span className="font-bold text-purple-400">۵۰٪ تسویه در 1.5R + فری ریسک</span>
              </div>
            </div>
          </div>
        </div>

        {/* EA Inputs Setup Instructions */}
        <div className="bg-[#0d1117] border border-amber-500/30 rounded-xl p-4 space-y-2 text-xs">
          <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            راهنمای تنظیم ورودی‌های اکسپرت متاتریدر ۵ (MT5 EA Inputs)
          </h3>
          <p className="text-[#8b949e]">
            برای اتصال متاتریدر ۵ به این سامانه، فایل <code className="text-amber-200">SmartTraderEA.mq5</code> را در متاتریدر کمپایل کرده و آدرس زیر را در ورودی <code className="text-amber-200">InpBackendUrl</code> وارد نمایید:
          </p>
          <div className="bg-[#161b22] p-2.5 rounded border border-[#30363d] font-mono text-emerald-400 select-all">
            {window.location.origin}
          </div>
          <p className="text-[11px] text-[#8b949e]">
            توجه: کلیدهای API Gemini به هیچ عنوان در متاتریدر ۵ قرار داده نمی‌شوند و در لایه امن سرور محافظت می‌شوند.
          </p>
        </div>
      </div>
    </div>
  );
};
