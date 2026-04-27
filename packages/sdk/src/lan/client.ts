import mqtt, { type MqttClient } from "mqtt";

export interface LanClientOptions {
  host: string;
  serial: string;
  accessCode: string;
  port?: number;
}

export class LanClient {
  private client?: MqttClient;
  private readonly opts: Required<LanClientOptions>;
  private readonly listeners = new Set<(payload: unknown) => void>();

  constructor(opts: LanClientOptions) {
    this.opts = { port: 8883, ...opts };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = mqtt.connect(`mqtts://${this.opts.host}:${this.opts.port}`, {
        username: "bblp",
        password: this.opts.accessCode,
        rejectUnauthorized: false,
        reconnectPeriod: 0,
      });
      client.once("connect", () => {
        this.client = client;
        client.subscribe(`device/${this.opts.serial}/report`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      client.once("error", reject);
      client.on("message", (_topic, payload) => {
        try {
          const data = JSON.parse(payload.toString());
          for (const fn of this.listeners) fn(data);
        } catch {
          /* ignore non-JSON */
        }
      });
    });
  }

  onMessage(fn: (payload: unknown) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  async pushAll(): Promise<void> {
    return this.publish({ pushing: { sequence_id: "0", command: "pushall" } });
  }

  async sendCommand(payload: object): Promise<void> {
    return this.publish(payload);
  }

  private async publish(payload: object): Promise<void> {
    if (!this.client) throw new Error("Not connected. Call connect() first.");
    return new Promise((resolve, reject) => {
      this.client!.publish(
        `device/${this.opts.serial}/request`,
        JSON.stringify(payload),
        (err) => (err ? reject(err) : resolve()),
      );
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.client) return resolve();
      this.client.end(false, {}, () => resolve());
    });
  }
}
