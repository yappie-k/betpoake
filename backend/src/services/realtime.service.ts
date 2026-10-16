import { WebSocket } from 'ws';
import { redisClient, redisSub } from '../redis/client.js';

interface OddsTickEvent {
  fixtureId: string;
  marketId: string;
  outcomeName: string;
  rawOddsDecimal: number;
  isActive: boolean;
  score?: { home: number; away: number };
  status?: string;
  timestamp: number;
}

export class RealtimeService {
  private static clients: Set<WebSocket> = new Set();
  private static readonly CHANNEL = 'betpoake_realtime_ticks';

  public static init() {
    redisSub.subscribe(this.CHANNEL, (err) => {
      if (err) {
        console.error('Redis subscription failure on channel:', this.CHANNEL, err);
      } else {
        console.log(`Subscribed to Redis Real-time channel: ${this.CHANNEL}`);
      }
    });

    redisSub.on('message', (channel, message) => {
      if (channel === this.CHANNEL) {
        this.broadcastLocal(message);
      }
    });
  }

  public static registerClient(ws: WebSocket) {
    this.clients.add(ws);
    ws.on('close', () => this.clients.delete(ws));
  }

  private static broadcastLocal(payload: string) {
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  public static async broadcastOddsTick(event: OddsTickEvent) {
    const payload = JSON.stringify({ type: 'ODDS_TICK', data: event });
    // Write-through to Redis cache with 3-day TTL
    await redisClient.set(
      `cache:fixture:${event.fixtureId}:market:${event.marketId}`,
      JSON.stringify(event),
      'EX',
      259200
    );
    // Publish to real-time pub/sub bus
    await redisClient.publish(this.CHANNEL, payload);
  }

  public static async broadcastFreezeSwitch(fixtureId: string, isActive: boolean) {
    const payload = JSON.stringify({
      type: 'MARKET_FREEZE',
      data: { fixtureId, isActive, timestamp: Date.now() },
    });
    await redisClient.publish(this.CHANNEL, payload);
  }
}