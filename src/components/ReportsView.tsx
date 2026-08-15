import React, { useState, useEffect } from 'react';
import { Download, BarChart2, TrendingUp, Award, Zap, FileSpreadsheet, RefreshCw } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/reports');
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error('Error fetching performance report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportJSON = () => {
    window.open('/api/v1/reports/export', '_blank');
  };

  const summary = report?.summary;
  const aiStats = report?.aiStats;
  const scorePerf = report?.scorePerformance;

  return (
    <div className="space-y-6">
      {/* Top Controls & Export Bar */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg text-[#e6edf3] flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-400" />
            گزارش‌های عملکرد تاریخی و قابلیت خروجی‌گرفتن (Historical Analytics & Export)
          </h2>
          <p className="text-xs text-[#8b949e] mt-1">
            تمامی دادوستدها، تصمیمات هوش مصنوعی و نرخ‌های سودآوری بر اساس بازه‌های امتیاز قابل ارزیابی دقیق می‌باشند.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReports}
            className="flex items-center gap-1.5 bg-[#21262d] hover:bg-[#30363d] text-xs px-3 py-2 rounded-lg font-medium transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> به‌روزرسانی
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-xs px-4 py-2 rounded-lg font-medium transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> دریافت خروجی جامع JSON / CSV
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-1">
          <span className="text-xs text-[#8b949e]">سود خالص کل (Net Profit)</span>
          <div className={`text-2xl font-black ${
            (summary?.netProfitUSD || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {(summary?.netProfitUSD || 0) >= 0 ? `+$${summary?.netProfitUSD}` : `$${summary?.netProfitUSD}`}
          </div>
          <div className="text-[11px] text-[#8b949e]">پرافیت فاکتور: <span className="font-bold text-[#e6edf3]">{summary?.profitFactor || 0}</span></div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-1">
          <span className="text-xs text-[#8b949e]">نرخ برد (Win Rate)</span>
          <div className="text-2xl font-black text-emerald-400">{summary?.winRate || 0}٪</div>
          <div className="text-[11px] text-[#8b949e]">معاملات موفق: <span className="font-bold text-[#e6edf3]">{summary?.winCount || 0}</span> از <span className="font-bold text-[#e6edf3]">{summary?.closedTradesCount || 0}</span></div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-1">
          <span className="text-xs text-[#8b949e]">میانگین سود / زیان (Avg Win/Loss)</span>
          <div className="text-xl font-bold text-[#e6edf3] font-mono">
            +${summary?.avgWinUSD || 0} / -${summary?.avgLossUSD || 0}
          </div>
          <div className="text-[11px] text-[#8b949e]">میانگین RR: <span className="font-bold text-[#e6edf3]">{summary?.averageRR || 0}</span></div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-1">
          <span className="text-xs text-[#8b949e]">حداکثر دروداون ثبت شده (Max Drawdown)</span>
          <div className="text-2xl font-black text-amber-400">{summary?.maxDrawdownPercent || 0}٪</div>
          <div className="text-[11px] text-[#8b949e]">حداکثر مجاز: 6.0٪</div>
        </div>
      </div>

      {/* Performance Matrix by Setup Score Range */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-sm text-[#e6edf3] flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          ماتریس عملکرد بر اساس بازه امتیاز Setup Score
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-amber-300">امتیاز ۸۰ تا ۸۴</span>
              <span className="text-[#8b949e]">تعداد: {scorePerf?.range80_84?.count || 0}</span>
            </div>
            <div className="text-lg font-mono font-bold text-[#e6edf3]">
              P&L: ${scorePerf?.range80_84?.pnl || 0}
            </div>
            <div className="text-[#8b949e]">تعداد سود: {scorePerf?.range80_84?.wins || 0}</div>
          </div>

          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-emerald-300">امتیاز ۸۵ تا ۸۹</span>
              <span className="text-[#8b949e]">تعداد: {scorePerf?.range85_89?.count || 0}</span>
            </div>
            <div className="text-lg font-mono font-bold text-emerald-400">
              P&L: +${scorePerf?.range85_89?.pnl || 0}
            </div>
            <div className="text-[#8b949e]">تعداد سود: {scorePerf?.range85_89?.wins || 0}</div>
          </div>

          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-purple-300">امتیاز ۹۰ تا ۱۰۰ (عالی)</span>
              <span className="text-[#8b949e]">تعداد: {scorePerf?.range90_100?.count || 0}</span>
            </div>
            <div className="text-lg font-mono font-bold text-purple-400">
              P&L: +${scorePerf?.range90_100?.pnl || 0}
            </div>
            <div className="text-[#8b949e]">تعداد سود: {scorePerf?.range90_100?.wins || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
