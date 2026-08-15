/**
 * Supabase Database Client Infrastructure (Prepared for future cloud persistence)
 * 
 * Once you create your Supabase project:
 * 1. Add SUPABASE_URL and SUPABASE_ANON_KEY to your Vercel / .env environment variables.
 * 2. This module will automatically sync trades, events, and AI interaction logs to PostgreSQL.
 */

export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
  serviceRoleKey?: string;
}

export class SupabaseAdapter {
  private url: string;
  private key: string;
  private isConfigured: boolean;

  constructor() {
    this.url = process.env.SUPABASE_URL || '';
    this.key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    this.isConfigured = Boolean(this.url && this.key);
  }

  public getStatus() {
    return {
      configured: this.isConfigured,
      urlMasked: this.url ? this.url.replace(/(https?:\/\/)(.{4}).*(\..+)/, '$1$2***$3') : 'Not Configured',
      targetTables: ['trades', 'market_snapshots', 'ai_logs', 'events']
    };
  }

  /**
   * Universal REST insert to Supabase tables without requiring heavy external dependencies
   */
  public async insertRow(table: string, data: Record<string, any>): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const endpoint = `${this.url.replace(/\/$/, '')}/rest/v1/${table}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.key,
          'Authorization': `Bearer ${this.key}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(data)
      });
      return response.ok;
    } catch (e) {
      console.warn(`[SupabaseAdapter] Failed to sync row to ${table}:`, e);
      return false;
    }
  }

  /**
   * Fetch recent records from a Supabase table
   */
  public async fetchRecent(table: string, limit = 50): Promise<any[]> {
    if (!this.isConfigured) return [];

    try {
      const endpoint = `${this.url.replace(/\/$/, '')}/rest/v1/${table}?select=*&order=created_at.desc&limit=${limit}`;
      const response = await fetch(endpoint, {
        headers: {
          'apikey': this.key,
          'Authorization': `Bearer ${this.key}`
        }
      });
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (e) {
      console.warn(`[SupabaseAdapter] Failed to query ${table}:`, e);
      return [];
    }
  }
}

export const supabaseAdapter = new SupabaseAdapter();
