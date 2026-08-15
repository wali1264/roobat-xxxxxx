import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { APIKeySlotStatusSchema } from '../shared/schemas';

export type KeySlotStatus = 'HEALTHY' | 'COOLDOWN' | 'QUOTA_EXHAUSTED' | 'AUTH_ERROR' | 'DISABLED';

export interface KeySlot {
  slotIndex: number;
  apiKey: string;
  maskedKey: string;
  status: KeySlotStatus;
  requestCount: number;
  successCount: number;
  failureCount: number;
  lastUsedTimestamp?: number;
  cooldownExpiresAt?: number;
  lastError?: string;
}

export type KeyFailureType = 'RATE_LIMIT' | 'QUOTA' | 'AUTH' | 'NETWORK_GEO' | 'OTHER';

/**
 * Classifies errors strictly distinguishing between local/VPN/Geo network fluctuations
 * and genuine Google AI Studio API quota/auth responses.
 */
export function classifyGeminiError(errMsg: string): { 
  type: KeyFailureType; 
  isNetworkOrGeo: boolean; 
  isRealQuota: boolean; 
  userFriendlyReasonFa: string 
} {
  const lower = (errMsg || '').toLowerCase();

  // 1. Network, socket, proxy, VPN disconnect, and geographic restriction checks
  if (
    lower.includes('user location is not supported') ||
    lower.includes('location is not supported') ||
    lower.includes('country is not supported') ||
    lower.includes('unsupported location') ||
    lower.includes('fetch failed') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('und_err_connect_timeout') ||
    lower.includes('enotfound') ||
    lower.includes('network error') ||
    lower.includes('socket hang up') ||
    lower.includes('econnrefused') ||
    lower.includes('aborted') ||
    lower.includes('circuit breaker')
  ) {
    return {
      type: 'NETWORK_GEO',
      isNetworkOrGeo: true,
      isRealQuota: false,
      userFriendlyReasonFa: 'نوسان لحظه‌ای اینترنت یا تغییر IP فیلترشکن (کلید سالم است و در چرخش باقی می‌ماند)'
    };
  }

  // 2. Genuine Google API Quota (HTTP 429 / RESOURCE_EXHAUSTED)
  if (
    lower.includes('429') || 
    lower.includes('resource_exhausted') || 
    lower.includes('quota exceeded') || 
    lower.includes('rate_limit_exceeded')
  ) {
    return {
      type: 'QUOTA',
      isNetworkOrGeo: false,
      isRealQuota: true,
      userFriendlyReasonFa: 'اتمام موقت سهمیه دقیقه (استندبای هوشمند ۷۵ ثانیه‌ای و بازیابی خودکار)'
    };
  }

  // 3. Genuine Auth / Invalid API Key
  if (
    lower.includes('401') || 
    lower.includes('api_key_invalid') || 
    lower.includes('invalid api key') || 
    lower.includes('unauthenticated') ||
    lower.includes('permission_denied')
  ) {
    return {
      type: 'AUTH',
      isNetworkOrGeo: false,
      isRealQuota: false,
      userFriendlyReasonFa: 'کلید نامعتبر یا غیرفعال در کنسول گوگل'
    };
  }

  return {
    type: 'OTHER',
    isNetworkOrGeo: false,
    isRealQuota: false,
    userFriendlyReasonFa: errMsg
  };
}

export class GeminiKeyPoolManager {
  private slots: KeySlot[] = [];
  private currentIndex = 0;

  constructor() {
    this.refreshPool();
  }

  /**
   * Helper to load and parse .env or .env.local file directly from disk
   * ensuring that any comments, UTF-8 BOM, or format issues on Windows don't block key detection.
   */
  private loadEnvFiles(): Record<string, string> {
    const combined: Record<string, string> = { ...process.env } as Record<string, string>;
    const cwd = process.cwd();
    const envPaths = [
      path.join(cwd, '.env'),
      path.join(cwd, '.env.local'),
      path.join(cwd, '.env.production'),
      path.join(cwd, '..', '.env')
    ];

    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        try {
          const raw = fs.readFileSync(envPath, 'utf-8');
          
          // 1. Try standard dotenv parse
          try {
            const parsed = dotenv.parse(raw);
            for (const [k, v] of Object.entries(parsed)) {
              if (v && v.trim().length > 0) {
                combined[k] = v.trim();
                process.env[k] = v.trim();
              }
            }
          } catch (e) {
            // Ignore parse errors and use fallback
          }

          // 2. Line-by-line fallback to handle Windows BOM, inline comments, or Persian text
          const lines = raw.split(/\r?\n/);
          for (let line of lines) {
            line = line.replace(/^\uFEFF/, '').trim();
            if (!line || line.startsWith('#')) continue;
            const eqIndex = line.indexOf('=');
            if (eqIndex > 0) {
              const k = line.substring(0, eqIndex).trim();
              let v = line.substring(eqIndex + 1).trim();
              // Strip surrounding quotes
              v = v.replace(/^["']|["']$/g, '').trim();
              // Strip inline comments if not inside quotes
              if (v.includes('#')) {
                const parts = v.split('#');
                v = parts[0].trim();
              }
              if (k && v && v.length > 0) {
                combined[k] = v;
                process.env[k] = v;
              }
            }
          }
        } catch (e) {
          // Ignore read errors
        }
      }
    }

    return combined;
  }

  /**
   * Manually add or test a key at runtime
   */
  public addManualKey(apiKey: string, name?: string): { success: boolean; slotIndex: number; maskedKey: string } {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      return { success: false, slotIndex: 0, maskedKey: '' };
    }

    const existing = this.slots.find(s => s.apiKey === cleanKey);
    if (existing) {
      existing.status = 'HEALTHY';
      existing.cooldownExpiresAt = undefined;
      return { success: true, slotIndex: existing.slotIndex, maskedKey: existing.maskedKey };
    }

    const newIndex = this.slots.length + 1;
    const masked = cleanKey.length > 8 
      ? `${cleanKey.substring(0, 4)}...${cleanKey.substring(cleanKey.length - 4)}` 
      : '****';

    this.slots.push({
      slotIndex: newIndex,
      apiKey: cleanKey,
      maskedKey: masked,
      status: 'HEALTHY',
      requestCount: 0,
      successCount: 0,
      failureCount: 0
    });

    process.env[`GEMINI_API_KEY_${newIndex}`] = cleanKey;
    return { success: true, slotIndex: newIndex, maskedKey: masked };
  }

  public refreshPool() {
    const envSource = this.loadEnvFiles();
    const slotEntries: { slotIndex: number; keyName: string; apiKey: string }[] = [];

    // Collect numbered keys strictly in order: GEMINI_API_KEY_1 ... 50 (with or without leading zero)
    for (let i = 1; i <= 50; i++) {
      const padIndex = i < 10 ? `0${i}` : `${i}`;
      const envKey = envSource[`GEMINI_API_KEY_${i}`] || 
                     envSource[`GEMINI_API_KEY_${padIndex}`] ||
                     process.env[`GEMINI_API_KEY_${i}`] ||
                     process.env[`GEMINI_API_KEY_${padIndex}`];
      if (envKey && envKey.trim().length > 0 && !envKey.startsWith('AIzaSy_CHANGE_ME')) {
        slotEntries.push({
          slotIndex: i,
          keyName: `GEMINI_API_KEY_${i}`,
          apiKey: envKey.trim()
        });
      }
    }

    // Also check general single keys if not already added
    const generalKeys = [
      { name: 'GEMINI_API_KEY', key: envSource.GEMINI_API_KEY || process.env.GEMINI_API_KEY },
      { name: 'VITE_GEMINI_API_KEY', key: envSource.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY },
      { name: 'GOOGLE_API_KEY', key: envSource.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY }
    ];
    for (const fb of generalKeys) {
      if (fb.key && fb.key.trim().length > 0 && !fb.key.startsWith('AIzaSy_CHANGE_ME')) {
        const already = slotEntries.some(s => s.apiKey === fb.key!.trim());
        if (!already) {
          slotEntries.push({
            slotIndex: slotEntries.length + 1,
            keyName: fb.name,
            apiKey: fb.key.trim()
          });
        }
      }
    }

    // Also search any env key in process.env that starts with GEMINI_API_KEY
    for (const [k, v] of Object.entries({ ...process.env, ...envSource })) {
      if (k.startsWith('GEMINI_API_KEY') && v && typeof v === 'string' && v.trim().length > 0 && !v.startsWith('AIzaSy_CHANGE_ME')) {
        const already = slotEntries.some(s => s.apiKey === v.trim());
        if (!already) {
          slotEntries.push({
            slotIndex: slotEntries.length + 1,
            keyName: k,
            apiKey: v.trim()
          });
        }
      }
    }

    // Preserve existing slot statistics while keeping correct rotation order
    const newSlots: KeySlot[] = slotEntries.map((entry) => {
      const existing = this.slots.find(s => s.apiKey === entry.apiKey || s.slotIndex === entry.slotIndex);
      const masked = entry.apiKey.length > 8 
        ? `${entry.apiKey.substring(0, 4)}...${entry.apiKey.substring(entry.apiKey.length - 4)}` 
        : '****';

      if (existing) {
        return {
          ...existing,
          slotIndex: entry.slotIndex,
          apiKey: entry.apiKey,
          maskedKey: masked
        };
      }
      return {
        slotIndex: entry.slotIndex,
        apiKey: entry.apiKey,
        maskedKey: masked,
        status: 'HEALTHY',
        requestCount: 0,
        successCount: 0,
        failureCount: 0
      };
    });

    this.slots = newSlots;
  }

  /**
   * Get next healthy key using round-robin with cooldown awareness
   */
  public getNextKey(): { apiKey: string; slotIndex: number; maskedKey: string } | null {
    this.refreshPool();
    const now = Date.now();
    const total = this.slots.length;
    if (total === 0) return null;

    for (let i = 0; i < total; i++) {
      const idx = (this.currentIndex + i) % total;
      const slot = this.slots[idx];

      // Auto-recover any standby / cooldown slot whose expiration has passed
      if ((slot.status === 'COOLDOWN' || slot.status === 'QUOTA_EXHAUSTED') && slot.cooldownExpiresAt && now >= slot.cooldownExpiresAt) {
        slot.status = 'HEALTHY';
        slot.cooldownExpiresAt = undefined;
        slot.lastError = undefined;
      }

      if (slot.status === 'HEALTHY') {
        this.currentIndex = (idx + 1) % total;
        slot.requestCount++;
        slot.lastUsedTimestamp = now;
        return {
          apiKey: slot.apiKey,
          slotIndex: slot.slotIndex,
          maskedKey: slot.maskedKey
        };
      }
    }

    return null; // All keys exhausted or on cooldown
  }

  /**
   * Record outcome for key slot
   */
  public recordResult(
    slotIndex: number, 
    success: boolean, 
    errorType?: KeyFailureType, 
    errorMsg?: string
  ) {
    const slot = this.slots.find(s => s.slotIndex === slotIndex);
    if (!slot) return;

    if (success) {
      slot.successCount++;
      slot.status = 'HEALTHY';
      slot.lastError = undefined;
      slot.cooldownExpiresAt = undefined;
    } else {
      slot.failureCount++;
      slot.lastError = errorMsg || 'Unknown error';

      if (errorType === 'NETWORK_GEO') {
        // Network, VPN, proxy, or location disconnect: KEEP KEY IN POOL!
        // Do NOT exhaust or disable key. Only give a brief 5-second rotation pause.
        slot.status = 'HEALTHY';
        slot.cooldownExpiresAt = undefined;
      } else if (errorType === 'RATE_LIMIT' || errorType === 'QUOTA') {
        // Genuine Google API 429 quota exhaustion:
        // Standby for 75 seconds (1.25 minutes) with guaranteed auto-reactivation
        slot.status = 'QUOTA_EXHAUSTED';
        slot.cooldownExpiresAt = Date.now() + 75 * 1000;
      } else if (errorType === 'AUTH') {
        slot.status = 'AUTH_ERROR';
      } else {
        // Minor transient error: 10 second backoff
        slot.status = 'COOLDOWN';
        slot.cooldownExpiresAt = Date.now() + 10 * 1000;
      }
    }
  }

  /**
   * Return status list for diagnostics UI
   */
  public getPoolStatus() {
    this.refreshPool();
    const now = Date.now();
    
    // Auto-refresh expired slots
    for (const slot of this.slots) {
      if ((slot.status === 'COOLDOWN' || slot.status === 'QUOTA_EXHAUSTED') && slot.cooldownExpiresAt && now >= slot.cooldownExpiresAt) {
        slot.status = 'HEALTHY';
        slot.cooldownExpiresAt = undefined;
        slot.lastError = undefined;
      }
    }

    return this.slots.map(s => ({
      slotIndex: s.slotIndex,
      keyMasked: s.maskedKey,
      isConfigured: s.apiKey !== 'GEMINI_DEV_DEFAULT_KEY',
      status: s.status,
      requestCount: s.requestCount,
      successCount: s.successCount,
      failureCount: s.failureCount,
      lastUsedTimestamp: s.lastUsedTimestamp,
      cooldownExpiresAt: s.cooldownExpiresAt,
      lastError: s.lastError
    }));
  }
}

export const keyPoolManager = new GeminiKeyPoolManager();
