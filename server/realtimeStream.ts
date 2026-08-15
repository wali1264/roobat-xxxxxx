import { Response } from 'express';
import { EventEnvelope } from '../shared/schemas';

class RealtimeStreamManager {
  private clients: Set<Response> = new Set();

  public addClient(res: Response) {
    this.clients.add(res);

    // Write initial comment to flush headers and establish stream
    try {
      res.write(': connected\n\n');
    } catch (e) {
      this.clients.delete(res);
    }

    const cleanup = () => {
      this.clients.delete(res);
    };

    res.on('close', cleanup);
    res.on('finish', cleanup);
    res.on('error', cleanup);
  }

  public broadcast(event: EventEnvelope) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    this.clients.forEach(client => {
      try {
        if (!client.writableEnded && !client.destroyed) {
          client.write(data);
        } else {
          this.clients.delete(client);
        }
      } catch (err) {
        this.clients.delete(client);
      }
    });
  }
}

export const realtimeStreamManager = new RealtimeStreamManager();
