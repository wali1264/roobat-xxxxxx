import { dbStore } from './db';
import { EventEnvelopeSchema, EventEnvelope } from '../shared/schemas';
import { SOFTWARE_VERSION, STRATEGY_VERSION } from '../shared/constants';

export class AuditLogger {
  public logEvent(
    eventType: EventEnvelope['eventType'],
    source: EventEnvelope['source'],
    installationId: string,
    correlationId: string,
    payload: Record<string, any>,
    symbol?: string,
    timeframe?: string,
    severity: EventEnvelope['severity'] = 'INFO'
  ): EventEnvelope {
    const rawEvent = {
      eventId: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventType,
      timestamp: Date.now(),
      source,
      sessionId: `sess-${installationId}`,
      installationId,
      symbol,
      timeframe,
      correlationId,
      strategyVersion: STRATEGY_VERSION,
      softwareVersion: SOFTWARE_VERSION,
      payload,
      severity
    };

    const validated = EventEnvelopeSchema.parse(rawEvent);
    dbStore.addEvent(validated);
    return validated;
  }
}

export const auditLogger = new AuditLogger();
