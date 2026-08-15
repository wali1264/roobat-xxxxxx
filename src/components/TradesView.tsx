import React from 'react';
import { TradeRecord } from '../../shared/schemas';
import { Activity, CheckCircle2, TrendingUp, TrendingDown, DollarSign, Clock, ShieldCheck } from 'lucide-react';

interface TradesViewProps {
  trades: TradeRecord[];
}

export const TradesView: React.FC<TradesViewProps> = ({ trades }) => {
  const openTrades = trades.filter((t) => t.status === 'OPEN' || t.status === 'PARTIALLY_CLOSED');
  const closedTrades = trades.filter((t) => t.status === 'CLOSED');

  const totalFloatingPnl = openTrades.reduce((acc, t) => acc + (t.pnlUSD || 0), 0);
  const totalRealizedPnl = closedTrades.reduce((acc, t) => acc + (t.pnlUSD || 0), 0);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Summary */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#e6edf3]">مدیریت زنده معاملات و پوزیشن‌های متاتریدر ۵</h1>
            <p className="text-xs text-[#8b949e]">
              ردیابی زنده تیکت‌های باز طلا، مدیریت ریسک پوزیشن، بستن جزئی و تاریخچه معاملات اجرا شده
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-4 py-2 rounded-xl bg-[#0d1117] border border-[#30363d]">
            <span className="text-[#8b949e] font-sans">سود/زیان شناور (Floating): </span>
            <span className={`font-bold ${totalFloatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${totalFloatingPnl.toFixed(2)}
            </span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-[#0d1117] border border-[#30363d]">
            <span className="text-[#8b949e] font-sans">سود محقق شده (Realized): </span>
            <span className={`font-bold ${totalRealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${totalRealizedPnl.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Active Open Positions */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
          <div className="flex items-center gap-2 font-bold text-sm text-[#e6edf3]">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>پوزیشن‌های باز جاری (ACTIVE OPEN POSITIONS)</span>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
            {openTrades.length} پوزیشن فعال
          </span>
        </div>

        {openTrades.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#8b949e] bg-[#0d1117] border border-dashed border-[#30363d] rounded-xl">
            در حال حاضر هیچ پوزیشن بازی در متاتریدر ۵ وجود ندارد. سیستم در حال رصد ستاپ‌های جدید است.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right font-mono">
              <thead className="bg-[#0d1117] text-[#8b949e] border-b border-[#30363d]">
                <tr>
                  <th className="p-3">تیکت (Ticket)</th>
                  <th className="p-3">نماد</th>
                  <th className="p-3">نوع</th>
                  <th className="p-3">حجم (Lots)</th>
                  <th className="p-3">قیمت ورود</th>
                  <th className="p-3">حد ضرر (SL)</th>
                  <th className="p-3">حد سود (TP)</th>
                  <th className="p-3">سود/زیان ($)</th>
                  <th className="p-3">امتیاز ستاپ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d]">
                {openTrades.map((t) => (
                  <tr key={t.tradeId} className="hover:bg-[#21262d]/50 transition-colors">
                    <td className="p-3 font-bold text-[#e6edf3]">#{t.ticket}</td>
                    <td className="p-3">{t.symbol}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        t.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="p-3">{t.lots}</td>
                    <td className="p-3 text-[#e6edf3] font-bold">{t.openPrice}</td>
                    <td className="p-3 text-rose-400">{t.sl}</td>
                    <td className="p-3 text-emerald-400">{t.tp}</td>
                    <td className={`p-3 font-bold ${(t.pnlUSD || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${(t.pnlUSD || 0).toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                        {t.scoreAtEntry}/100
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Closed Trade History */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
          <div className="flex items-center gap-2 font-bold text-sm text-[#e6edf3]">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            <span>تاریخچه معاملات بسته شده (CLOSED TRADES HISTORY)</span>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#21262d] text-[#8b949e] font-mono">
            {closedTrades.length} معامله ثبت شده
          </span>
        </div>

        {closedTrades.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#8b949e] bg-[#0d1117] border border-dashed border-[#30363d] rounded-xl">
            هنوز معامله بسته‌شده‌ای در این سشن ثبت نگردیده است.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right font-mono">
              <thead className="bg-[#0d1117] text-[#8b949e] border-b border-[#30363d]">
                <tr>
                  <th className="p-3">تیکت</th>
                  <th className="p-3">نماد</th>
                  <th className="p-3">نوع</th>
                  <th className="p-3">حجم</th>
                  <th className="p-3">ورود</th>
                  <th className="p-3">خروج</th>
                  <th className="p-3">سود/زیان نهایی</th>
                  <th className="p-3">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d]">
                {closedTrades.map((t) => (
                  <tr key={t.tradeId} className="hover:bg-[#21262d]/50 transition-colors">
                    <td className="p-3 text-[#8b949e]">#{t.ticket}</td>
                    <td className="p-3">{t.symbol}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        t.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="p-3">{t.lots}</td>
                    <td className="p-3">{t.openPrice}</td>
                    <td className="p-3">{t.closePrice || '-'}</td>
                    <td className={`p-3 font-bold ${(t.pnlUSD || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${(t.pnlUSD || 0).toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e]">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
