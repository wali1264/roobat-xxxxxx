import { TradeRecord, EventEnvelope, GeminiDecisionResponse, MarketSnapshot } from '../../shared/schemas';

const DB_NAME = 'SmartTraderClientDB';
const DB_VERSION = 1;

class ClientStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.dbPromise = this.initDB();
    }
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('trades')) {
          const tradeStore = db.createObjectStore('trades', { keyPath: 'tradeId' });
          tradeStore.createIndex('ticket', 'ticket', { unique: false });
          tradeStore.createIndex('openTime', 'openTime', { unique: false });
        }

        if (!db.objectStoreNames.contains('events')) {
          const eventStore = db.createObjectStore('events', { keyPath: 'eventId' });
          eventStore.createIndex('timestamp', 'timestamp', { unique: false });
          eventStore.createIndex('eventType', 'eventType', { unique: false });
        }

        if (!db.objectStoreNames.contains('snapshots')) {
          const snapStore = db.createObjectStore('snapshots', { keyPath: 'snapshotId' });
          snapStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('aiDecisions')) {
          db.createObjectStore('aiDecisions', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Trades Management ---
  public async saveTrade(trade: TradeRecord): Promise<void> {
    try {
      if (!this.dbPromise) return this.saveToLocalStorage('trades', trade);
      const db = await this.dbPromise;
      const tx = db.transaction('trades', 'readwrite');
      const store = tx.objectStore('trades');
      store.put(trade);
    } catch (e) {
      this.saveToLocalStorage('trades', trade);
    }
  }

  public async saveTrades(trades: TradeRecord[]): Promise<void> {
    for (const t of trades) {
      await this.saveTrade(t);
    }
  }

  public async getTrades(): Promise<TradeRecord[]> {
    try {
      if (!this.dbPromise) return this.getFromLocalStorage<TradeRecord>('trades');
      const db = await this.dbPromise;
      return new Promise((resolve) => {
        const tx = db.transaction('trades', 'readonly');
        const store = tx.objectStore('trades');
        const request = store.getAll();
        request.onsuccess = () => {
          const items = request.result as TradeRecord[];
          items.sort((a, b) => b.openTime - a.openTime);
          resolve(items);
        };
        request.onerror = () => resolve(this.getFromLocalStorage<TradeRecord>('trades'));
      });
    } catch (e) {
      return this.getFromLocalStorage<TradeRecord>('trades');
    }
  }

  // --- Events Audit Log Management ---
  public async saveEvent(event: EventEnvelope): Promise<void> {
    try {
      if (!this.dbPromise) return this.saveToLocalStorage('events', event);
      const db = await this.dbPromise;
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      store.put(event);
    } catch (e) {
      this.saveToLocalStorage('events', event);
    }
  }

  public async getEvents(limit = 300): Promise<EventEnvelope[]> {
    try {
      if (!this.dbPromise) return this.getFromLocalStorage<EventEnvelope>('events').slice(0, limit);
      const db = await this.dbPromise;
      return new Promise((resolve) => {
        const tx = db.transaction('events', 'readonly');
        const store = tx.objectStore('events');
        const request = store.getAll();
        request.onsuccess = () => {
          const items = request.result as EventEnvelope[];
          items.sort((a, b) => b.timestamp - a.timestamp);
          resolve(items.slice(0, limit));
        };
        request.onerror = () => resolve(this.getFromLocalStorage<EventEnvelope>('events').slice(0, limit));
      });
    } catch (e) {
      return this.getFromLocalStorage<EventEnvelope>('events').slice(0, limit);
    }
  }

  // --- Market Snapshot ---
  public async saveSnapshot(snapshot: MarketSnapshot): Promise<void> {
    try {
      if (!this.dbPromise) return this.saveToLocalStorage('snapshots', snapshot);
      const db = await this.dbPromise;
      const tx = db.transaction('snapshots', 'readwrite');
      tx.objectStore('snapshots').put(snapshot);
    } catch (e) {
      this.saveToLocalStorage('snapshots', snapshot);
    }
  }

  // --- LocalStorage Fallback Helper ---
  private saveToLocalStorage(key: string, item: any) {
    try {
      const existing = JSON.parse(localStorage.getItem(`st_${key}`) || '[]');
      const idKey = item.tradeId || item.eventId || item.snapshotId || item.id;
      const filtered = existing.filter((i: any) => (i.tradeId || i.eventId || i.snapshotId || i.id) !== idKey);
      filtered.unshift(item);
      localStorage.setItem(`st_${key}`, JSON.stringify(filtered.slice(0, 500)));
    } catch (e) {}
  }

  private getFromLocalStorage<T>(key: string): T[] {
    try {
      return JSON.parse(localStorage.getItem(`st_${key}`) || '[]');
    } catch (e) {
      return [];
    }
  }
}

export const clientStorage = new ClientStorageService();
