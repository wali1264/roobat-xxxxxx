import React from 'react';
import { HelpCircle, ShieldAlert, Cpu, Bot, Zap } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-[#21262d] pb-4">
        <HelpCircle className="w-6 h-6 text-indigo-400" />
        <div>
          <h2 className="font-bold text-lg text-[#e6edf3]">درباره سیستم معاملات هوشمند (Smart Trading System)</h2>
          <p className="text-xs text-[#8b949e]">سامانه دستیار تحلیل‌گر و معامله‌گر خودکار متاتریدر ۵ مبتنی بر هوش مصنوعی Gemini</p>
        </div>
      </div>

      <div className="space-y-4 text-xs text-[#c9d1d9] leading-relaxed">
        <p>
          این سامانه یک دستیار پیشرفته و سیستم معاملات خودکار برای متاتریدر ۵ است که با ترکیب موتورهای قطعی تحلیل فنی (Smart Money Concepts) و تحلیل سیاقی هوش مصنوعی Gemini طراحی شده است.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <div className="bg-[#0d1117] border border-[#21262d] p-4 rounded-xl space-y-2">
            <div className="font-bold text-sm text-emerald-400 flex items-center gap-2">
              <Bot className="w-4 h-4" /> ۲ حالت عملیاتی مجزا
            </div>
            <p className="text-[#8b949e]">
              حالت دستیار (Assistant Mode) فقط بازار را تحلیل و پیشنهادات هوش مصنوعی را نمایش می‌دهد. حالت معامله‌گر خودکار (AutoTrading Mode) با تاییدیه اکسپرت و کنترل ریسک سفارشات را ثبت می‌کند.
            </p>
          </div>

          <div className="bg-[#0d1117] border border-[#21262d] p-4 rounded-xl space-y-2">
            <div className="font-bold text-sm text-indigo-400 flex items-center gap-2">
              <Zap className="w-4 h-4" /> امنیت لایه سرور
            </div>
            <p className="text-[#8b949e]">
              کلیدهای API Gemini به هیچ عنوان در کد اکسپرت یا مرورگر قرار نگرفته و مستقیماً در Gateway امن سمت سرور مدیریت می‌شوند.
            </p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-amber-200 text-xs space-y-1">
          <div className="font-bold flex items-center gap-2 text-amber-300">
            <ShieldAlert className="w-4 h-4" /> بیانیه مسئولیت و ریسک مالی
          </div>
          <p>
            این سیستم ابزار کمکی تحلیل و مدیریت ریسک است و هیچ‌گونه سودآوری تضمین شده یا درصد موفقیتی را ادعا نمی‌کند. تمامی معاملات مالی متضمن ریسک سرمایه می‌باشند.
          </p>
        </div>
      </div>
    </div>
  );
};
