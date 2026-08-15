import React, { useState, useEffect } from 'react';
import { NavTab, SystemHealthData } from './types';
import { Header } from './components/Header';
import { DashboardOverview } from './components/DashboardOverview';
import { MarketAnalysisView } from './components/MarketAnalysisView';
import { AdvisorView } from './components/AdvisorView';
import { AutoTraderView } from './components/AutoTraderView';
import { TradesView } from './components/TradesView';
import { LiveConsole } from './components/LiveConsole';
import { ReportsView } from './components/ReportsView';
import { DebugConsole } from './components/DebugConsole';
import { SystemHealth } from './components/SystemHealth';
import { CloudDeploymentView } from './components/CloudDeploymentView';
import { SettingsView } from './components/SettingsView';
import { AboutView } from './components/AboutView';
import { VisibleDefectsView } from './components/VisibleDefectsView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EventEnvelope, MarketSnapshot, GeminiDecisionResponse, RiskValidation, TradeRecord } from '../shared/schemas';
import { clientStorage } from './lib/clientStorage';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [events, setEvents] = useState<EventEnvelope[]>([]);
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [aiDecision, setAiDecision] = useState<GeminiDecisionResponse | null>(null);
  const [riskValidation, setRiskValidation] = useState<RiskValidation | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);

  // Load from local storage first (instant client-side offline/long-term memory)
  useEffect(() => {
    async function loadLocalMemory() {
      try {
        const localTrades = await clientStorage.getTrades();
        if (localTrades && localTrades.length > 0) {
          setTrades(localTrades);
        }
        const localEvents = await clientStorage.getEvents();
        if (localEvents && localEvents.length > 0) {
          setEvents(localEvents);
        }
      } catch (e) {
        console.warn('Could not load client offline memory:', e);
      }
    }
    loadLocalMemory();
  }, []);

  // 1. Poll System Health
  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/v1/health');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch (err) {
      // Handled silently
    }
  };

  // 2. Fetch Initial Recent Trades and sync with Client Storage
  const fetchTrades = async () => {
    try {
      const res = await fetch('/api/v1/trades');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const serverTrades: TradeRecord[] = data.trades || [];
        setTrades(serverTrades);
        if (serverTrades.length > 0) {
          clientStorage.saveTrades(serverTrades);
        }
      }
    } catch (err) {
      // Handled silently
    }
  };

  // 3. Connect to SSE Event Stream with graceful fallback and polling
  useEffect(() => {
    fetchHealth();
    fetchTrades();

    const healthInterval = setInterval(fetchHealth, 8000);
    const tradesInterval = setInterval(fetchTrades, 12000);
    let eventSource: EventSource | null = null;

    try {
      // Only initiate SSE if supported and on same origin
      if (typeof window !== 'undefined' && 'EventSource' in window) {
        eventSource = new EventSource('/api/v1/events/stream');

        eventSource.onmessage = (e) => {
          try {
            if (!e.data || e.data.startsWith(':')) return;
            const event: EventEnvelope = JSON.parse(e.data);
            setEvents((prev) => [event, ...prev].slice(0, 300));
            clientStorage.saveEvent(event);

            if (event.eventType === 'MARKET_SNAPSHOT' && event.payload?.score) {
              setSnapshot(event.payload as any);
              clientStorage.saveSnapshot(event.payload as any);
            } else if (event.eventType === 'AI_DECISION' && event.payload?.decision) {
              setAiDecision(event.payload.decision);
            } else if (event.eventType === 'RISK_VALIDATION' && event.payload?.validation) {
              setRiskValidation(event.payload.validation);
            } else if (event.eventType === 'EXECUTION_RESULT') {
              fetchTrades();
            }
          } catch (err) {
            // Ignored
          }
        };

        eventSource.onerror = () => {
          // SSE closed by serverless timeout; fallback polling keeps UI updated
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
        };
      }
    } catch (e) {
      // Silent fallback
    }

    return () => {
      clearInterval(healthInterval);
      clearInterval(tradesInterval);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return (
    <ErrorBoundary fallbackTitle="سیستم بازیابی رابط کاربری معاملات هوشمند">
      <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans flex flex-col" dir="rtl">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          healthData={healthData}
          autoTradingEnabled={snapshot?.autoTradingEnabled ?? false}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              snapshot={snapshot}
              aiDecision={aiDecision}
              riskValidation={riskValidation}
              trades={trades}
            />
          )}

          {activeTab === 'cloud' && <CloudDeploymentView />}

          {activeTab === 'analysis' && (
            <MarketAnalysisView
              snapshot={snapshot}
            />
          )}

          {activeTab === 'advisor' && (
            <AdvisorView
              snapshot={snapshot}
              aiDecision={aiDecision}
            />
          )}

          {activeTab === 'autotrader' && (
            <AutoTraderView
              snapshot={snapshot}
              riskValidation={riskValidation}
              trades={trades}
            />
          )}

          {activeTab === 'trades' && (
            <TradesView
              trades={trades}
            />
          )}

          {activeTab === 'live_chat' && <LiveConsole events={events} />}

          {activeTab === 'reports' && <ReportsView />}

          {activeTab === 'debug' && <DebugConsole />}

          {activeTab === 'health' && <SystemHealth healthData={healthData} />}

          {activeTab === 'defects' && (
            <VisibleDefectsView
              healthData={healthData}
              health={healthData}
              onRefreshHealth={fetchHealth}
            />
          )}

          {activeTab === 'settings' && <SettingsView />}

          {activeTab === 'about' && <AboutView />}
        </main>

        <footer className="border-t border-[#30363d] bg-[#161b22] py-4 text-center text-xs text-[#8b949e]">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
            <span>سیستم معاملات هوشمند — متاتریدر ۵ و دروازه هوش مصنوعی Gemini</span>
            <span>SMC Strategy Version: SMC-MTF-V1.0 | Prompt Version: TRADING-PROMPT-V1.0</span>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
