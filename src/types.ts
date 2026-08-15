import { EventEnvelope, MarketSnapshot, GeminiDecisionResponse, RiskValidation, TradeRecord, APIKeySlotStatusSchema } from '../shared/schemas';

export type NavTab = 'dashboard' | 'cloud' | 'defects' | 'analysis' | 'advisor' | 'autotrader' | 'live_chat' | 'trades' | 'reports' | 'debug' | 'health' | 'settings' | 'about';

export interface CloudStatusData {
  timestamp: number;
  platform: 'VERCEL_SERVERLESS' | 'LOCAL_CONTAINER';
  isDeployedOnVercel: boolean;
  region: string;
  deploymentUrl: string;
  nodeEnv: string;
  features: {
    unfilteredGeminiAccess: boolean;
    europeLatency: string;
    failClosedRiskProtection: boolean;
    mt5DirectWebhook: boolean;
  };
  supabase: {
    configured: boolean;
    urlMasked: string;
    targetTables: string[];
  };
}

export interface SystemHealthData {
  status: string;
  softwareVersion: string;
  strategyVersion: string;
  promptVersion: string;
  timestamp: number;
  components: {
    backend: string;
    database: string;
    geminiKeyPool: string;
    eaConnection: string;
  };
  keyPoolSummary: {
    activeModel?: string;
    totalConfigured: number;
    healthyCount: number;
    cooldownCount: number;
    quotaExhaustedCount: number;
    disabledCount?: number;
  };
}

