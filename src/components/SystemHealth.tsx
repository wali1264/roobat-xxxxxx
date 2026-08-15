import React from 'react';
import { SystemHealthData } from '../types';
import { ShieldCheck, Cpu, Server, Key, Radio, CheckCircle, AlertTriangle } from 'lucide-react';

interface SystemHealthProps {
  healthData: SystemHealthData | null;
}

export const SystemHealth: React.FC<SystemHealthProps> = ({ healthData }) => {
  return (
    <div className="space-y-6">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-base text-[#e6edf3]">سلامت و پایش زیرساخت سیستم (System Health & Latency Monitor)</h2>
          </div>
          <span className="text-xs text-[#8b949e]">آخرین به‌روزرسانی: آنلاین</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-[#8b949e]">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>سرور بک‌اند (Backend Gateway)</span>
            </div>
            <div className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> فعال و سالم (Healthy)
            </div>
          </div>

          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#8b949e]">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-400" />
                <span>مخزن کلید هوش مصنوعی</span>
              </div>
              <span className="font-mono text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                {healthData?.keyPoolSummary?.activeModel || 'gemini-2.0-flash'}
              </span>
            </div>
            <div className="text-sm font-bold text-emerald-400 flex flex-wrap items-center gap-2 pt-1">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                {healthData?.keyPoolSummary?.healthyCount || 0} فعال
              </span>
              {(healthData?.keyPoolSummary?.cooldownCount ?? 0) > 0 && (
                <span className="text-amber-400 text-xs font-normal">
                  ({healthData?.keyPoolSummary?.cooldownCount} استراحت)
                </span>
              )}
              {((healthData?.keyPoolSummary?.quotaExhaustedCount ?? 0) + (healthData?.keyPoolSummary?.disabledCount ?? 0)) > 0 && (
                <span className="text-rose-400 text-xs font-normal">
                  ({(healthData?.keyPoolSummary?.quotaExhaustedCount ?? 0) + (healthData?.keyPoolSummary?.disabledCount ?? 0)} اتمام سهمیه)
                </span>
              )}
            </div>
          </div>

          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-[#8b949e]">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>اتصال اکسپرت متاتریدر ۵ (MT5 EA)</span>
            </div>
            <div className={`text-lg font-bold flex items-center gap-1.5 ${
              healthData?.components?.eaConnection === 'CONNECTED' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {healthData?.components?.eaConnection === 'CONNECTED' ? (
                <>
                  <CheckCircle className="w-4 h-4" /> متصل (Connected)
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" /> قطع (Disconnected)
                </>
              )}
            </div>
          </div>

          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-[#8b949e]">
              <Radio className="w-4 h-4 text-purple-400" />
              <span>ارسال داده‌های زنده (Realtime SSE)</span>
            </div>
            <div className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> جریان فعال (Active)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
