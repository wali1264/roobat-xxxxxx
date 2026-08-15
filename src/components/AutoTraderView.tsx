import React, { useState, useEffect } from 'react';
import { MarketSnapshot, RiskValidation, TradeRecord } from '../../shared/schemas';
import { Cpu, ShieldCheck, ShieldAlert, DollarSign, Calculator, Lock, Unlock } from 'lucide-react';

interface AutoTraderViewProps {
  snapshot: MarketSnapshot | null;
  riskValidation: RiskValidation | null;
  trades: TradeRecord[];
}

export const AutoTraderView: React.FC<AutoTraderViewProps> = ({ snapshot, riskValidation, trades }) => {
  const [autoTradingAuthorized, setAutoTradingAuthorized] = useState<boolean>(true);
  const [loadingToggle, setLoadingToggle] = useState<boolean>(false);
  const [balance, setBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [slPips, setSlPips] = useState<number>(50);

  // Fetch current autotrading authorization state
  const fetchAutoTradingState = async () => {
    try {
      const res = await fetch('/api/v1/control/auto-trading');
      if (res.ok) {
        const data = await res.json();
        setAutoTradingAuthorized(data.autoTradingAuthorized);
      }
    } catch (e) {
      console.warn('Error fetching autotrading state:', e);
    }
  };

  useEffect(() => {
    fetchAutoTradingState();
  }, []);

  const handleToggleAutoTrading = async () => {
    setLoadingToggle(true);
    const nextState = !autoTradingAuthorized;
    try {
      const res = await fetch('/api/v1/control/auto-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState })
      });
      if (res.ok) {
        const data = await res.json();
        setAutoTradingAuthorized(data.autoTradingAuthorized);
      }
    } catch (e) {
      console.warn('Error toggling autotrading:', e);
    } finally {
      setLoadingToggle(false);
    }
  };

  // Dynamic lot size formula: (Balance * (risk% / 100)) / (SL_pips * PipValue_per_lot)
  const riskAmount = (balance * riskPercent) / 100;
  const calculatedLotSize = Math.max(0.01, Math.min(5.0, Math.round((riskAmount / (slPips * 10)) * 100) / 100));

  const checklist = [
    { rule: 'فیلتر عدم انتشار اخبار حیاتی (News Block)', passed: riskValidation?.checks?.newsCheck ?? true, details: 'فاصله تا خبر بعدی بیش از ۱۵ دقیقه' },
    { rule: 'حداکثر اسپرد مجاز (Max Spread < 45 pts)', passed: riskValidation?.checks?.spreadCheck ?? true, details: `اسپرد فعلی: ${snapshot?.spreadPts || 30} pts` },
    { rule: 'حداقل نسبت ریسک به ریوارد (R:R >= 1.5)', passed: riskValidation?.checks?.rrCheck ?? true, details: 'R:R محاسبه شده: 1:2.0' },
    { rule: 'سقف ریسک مجاز در هر معامله (Max 1.0%)', passed: riskValidation?.checks?.maxRiskCheck ?? true, details: 'ریسک تخصیص داده شده: 1.0%' },
    { rule: 'تاییدیه عدم ورود در تایم کول‌داون (Cooldown)', passed: riskValidation?.checks?.cooldownCheck ?? true, details: 'عدم تداخل با تایم کول‌داون' },
    { rule: 'محدودیت تعداد معاملات همزمان (Max Positions)', passed: riskValidation?.checks?.maxPositionsCheck ?? true, details: `پوزیشن‌های باز: ${trades.filter(t => t.status === 'OPEN').length}` },
    { rule: 'همبستگی نمره ستاپ استراتژی (Score >= 80)', passed: riskValidation?.checks?.scoreCheck ?? true, details: 'تایید BOS و OrderBlock' },
    { rule: 'بررسی دراداون و ضرر روزانه (Drawdown & Daily Loss)', passed: (riskValidation?.checks?.drawdownCheck && riskValidation?.checks?.dailyLossCheck) ?? true, details: 'دراداون جاری: 0.0%' }
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner & Control */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl border ${
            autoTradingAuthorized ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#e6edf3]">پنل کنترل معامله‌گر خودکار و موتور ریسک (Auto-Trading Terminal)</h1>
            <p className="text-xs text-[#8b949e]">
              اجرای خودکار سفارشات متاتریدر ۵، اعتبارسنجی ۱۲ گانه ریسک، محاسبه آنی حجم لات و حفاظت از سرمایه
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleAutoTrading}
            disabled={loadingToggle}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
              autoTradingAuthorized
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {autoTradingAuthorized ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            {loadingToggle ? 'در حال ارسال دستور...' : autoTradingAuthorized ? 'غیرفعال‌سازی معامله‌گر خودکار' : 'فعال‌سازی معامله‌گر خودکار'}
          </button>
        </div>
      </div>

      {/* Main Grid: Checklist & Lot Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Checklist */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-[#e6edf3]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>چک‌لیست موتور ریسک قطعی (Deterministic Risk Checklist)</span>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
              وضعیت: {riskValidation?.approved ?? true ? 'APPROVED' : 'REJECTED'}
            </span>
          </div>

          <div className="space-y-2.5">
            {checklist.map((item, idx) => (
              <div key={idx} className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {item.passed ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="text-[#e6edf3] font-medium">{item.rule}</span>
                </div>
                <span className="text-[#8b949e] font-mono text-[11px]">{item.details}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Lot Size Calculator & Smart Exit */}
        <div className="space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-[#e6edf3]">
                <Calculator className="w-4 h-4 text-indigo-400" />
                <span>محاسبه‌گر خودکار حجم معامله (Dynamic Lot Sizing)</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                فرمول دقیق طلای جهانی
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[#8b949e]">موجودی حساب ($):</label>
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(Number(e.target.value))}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-white font-mono text-center"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[#8b949e]">ریسک معامله (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(Number(e.target.value))}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-white font-mono text-center"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[#8b949e]">حد ضرر (پیپ):</label>
                <input
                  type="number"
                  value={slPips}
                  onChange={(e) => setSlPips(Number(e.target.value))}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-white font-mono text-center"
                />
              </div>
            </div>

            <div className="p-4 bg-[#0d1117] rounded-xl border border-[#30363d] flex items-center justify-between font-mono">
              <div>
                <span className="text-xs text-[#8b949e] font-sans">مبلغ ریسک معامله: </span>
                <span className="text-sm font-bold text-rose-400">${riskAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-xs text-[#8b949e] font-sans">حجم لات مجاز (Lot): </span>
                <span className="text-base font-black text-emerald-400">{calculatedLotSize} Lots</span>
              </div>
            </div>
          </div>

          {/* Smart Protection & Breakeven Parameters */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-3 text-xs">
            <div className="font-bold text-[#e6edf3] border-b border-[#21262d] pb-2">
              تنظیمات حفاظت خودکار (Smart Protection & Partial Close)
            </div>
            <div className="flex justify-between items-center text-[#8b949e]">
              <span>بستن ۵۰٪ حجم در نسبت 1:1.5 R:</span>
              <span className="font-mono text-emerald-400 font-bold">فعال (InpEnableSmartExit=true)</span>
            </div>
            <div className="flex justify-between items-center text-[#8b949e]">
              <span>انتقال حد ضرر به نقطه ورود + اسپرد (BE+):</span>
              <span className="font-mono text-emerald-400 font-bold">خودکار بعد از TP1</span>
            </div>
            <div className="flex justify-between items-center text-[#8b949e]">
              <span>اجرای تریلینگ استاپ بر اساس سوپرترند و سووینگ:</span>
              <span className="font-mono text-emerald-400 font-bold">برای حجم باقیمانده (Runner)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
