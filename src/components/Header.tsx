import React from 'react';
import { NavTab, SystemHealthData } from '../types';
import {
  Activity,
  Bot,
  Terminal,
  BarChart3,
  ShieldCheck,
  Radio,
  Sliders,
  HelpCircle,
  Cpu,
  Zap,
  TrendingUp,
  LayoutDashboard,
  ShieldAlert,
  Cloud
} from 'lucide-react';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  healthData: SystemHealthData | null;
  autoTradingEnabled: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  healthData,
  autoTradingEnabled
}) => {
  const isEaConnected = healthData?.components?.eaConnection === 'CONNECTED';
  const isBackendHealthy = healthData?.components?.backend === 'HEALTHY';
  const isGeminiHealthy = healthData?.components?.geminiKeyPool === 'HEALTHY';

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'داشبورد', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'cloud', label: 'استقرار ابری (Vercel)', icon: <Cloud className="w-4 h-4 text-sky-400" /> },
    { id: 'defects', label: 'عیوب قابل مشاهده', icon: <ShieldAlert className="w-4 h-4 text-rose-400" /> },
    { id: 'analysis', label: 'تحلیل بازار', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'advisor', label: 'تحلیل‌گر و توصیه‌دهنده', icon: <Bot className="w-4 h-4" /> },
    { id: 'autotrader', label: 'معامله‌گر خودکار', icon: <Cpu className="w-4 h-4" /> },
    { id: 'live_chat', label: 'مکالمه زنده', icon: <Radio className="w-4 h-4" /> },
    { id: 'trades', label: 'معاملات و پوزیشن‌ها', icon: <Activity className="w-4 h-4" /> },
    { id: 'reports', label: 'گزارش‌ها و آنالیز', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'debug', label: 'لاگ و عیب‌یابی', icon: <Terminal className="w-4 h-4" /> },
    { id: 'health', label: 'سلامت سیستم', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'settings', label: 'تنظیمات', icon: <Sliders className="w-4 h-4" /> },
    { id: 'about', label: 'درباره سیستم', icon: <HelpCircle className="w-4 h-4" /> }
  ];

  return (
    <header className="bg-[#161b22] border-b border-[#30363d] sticky top-0 z-50">
      {/* Top Status Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between text-xs border-b border-[#21262d]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <Zap className="w-4 h-4 fill-amber-400" />
            <span>سیستم معاملات هوشمند (MT5 EA + Gemini AI)</span>
          </div>
          <span className="text-[#8b949e]">|</span>
          <span className="text-[#8b949e]">نسخه: {healthData?.softwareVersion || '1.0.0'}</span>
        </div>

        <div className="flex items-center gap-4 py-1">
          {/* AutoTrading Mode Badge */}
          <div className={`px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5 ${
            autoTradingEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${autoTradingEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>حالت: {autoTradingEnabled ? 'معامله خودکار (AutoTrading)' : 'تحلیل / دستیار (Assistant)'}</span>
          </div>

          {/* EA Status */}
          <div className="flex items-center gap-1">
            <span className="text-[#8b949e]">اکسپرت MT5:</span>
            <span className={`font-medium ${isEaConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isEaConnected ? 'متصل' : 'قطع'}
            </span>
          </div>

          {/* Key Pool Breakdown */}
          <div className="flex items-center gap-1.5 bg-[#21262d] px-2.5 py-1 rounded-md border border-[#30363d]">
            <span className="text-[#8b949e]">مخزن کلید AI:</span>
            <div className="flex items-center gap-2 font-medium">
              <span className="flex items-center gap-1 text-emerald-400" title="کلیدهای فعال و آماده به کار">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>{healthData?.keyPoolSummary?.healthyCount ?? 0} فعال</span>
              </span>

              {(healthData?.keyPoolSummary?.cooldownCount ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-amber-400" title="کلیدهای در حال استراحت موقت (Cooldown)">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>{healthData?.keyPoolSummary?.cooldownCount} استراحت</span>
                </span>
              )}

              {((healthData?.keyPoolSummary?.quotaExhaustedCount ?? 0) + (healthData?.keyPoolSummary?.disabledCount ?? 0)) > 0 && (
                <span className="flex items-center gap-1 text-rose-400" title="کلیدهای با سهمیه تمام‌شده یا غیرفعال">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <span>{(healthData?.keyPoolSummary?.quotaExhaustedCount ?? 0) + (healthData?.keyPoolSummary?.disabledCount ?? 0)} غیرفعال</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
        <nav className="flex space-x-1 space-x-reverse min-w-max py-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-[#238636] text-white shadow-sm'
                  : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};
