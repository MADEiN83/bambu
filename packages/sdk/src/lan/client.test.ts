import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { EventEmitter } from "node:events";

interface PublishCall {
  topic: string;
  payload: string;
}

class FakeMqttClient extends EventEmitter {
  public published: PublishCall[] = [];
  public subscribed: string[] = [];
  public ended = false;

  subscribe(topic: string, cb: (err?: Error) => void) {
    this.subscribed.push(topic);
    queueMicrotask(() => cb());
  }

  publish(topic: string, payload: string, cb: (err?: Error) => void) {
    this.published.push({ topic, payload });
    queueMicrotask(() => cb());
  }

  end(_force: boolean, _opts: object, cb: () => void) {
    this.ended = true;
    queueMicrotask(() => cb());
  }
}

let currentClient: FakeMqttClient;
let connectArgs: { url: string; opts: unknown } | null = null;

mock.module("mqtt", () => ({
  default: {
    connect: (url: string, opts: unknown) => {
      connectArgs = { url, opts };
      currentClient = new FakeMqttClient();
      queueMicrotask(() => currentClient.emit("connect"));
      return currentClient;
    },
  },
}));

const { LanClient } = await import("./client.js");

const opts = { host: "192.168.1.42", serial: "00M09B461100094", accessCode: "12345678" };

describe("LanClient.connect", () => {
  beforeEach(() => {
    connectArgs = null;
  });

  test("connects to mqtts on default port 8883 with the access code as password", async () => {
    const client = new LanClient(opts);
    await client.connect();
    expect(connectArgs?.url).toBe("mqtts://192.168.1.42:8883");
    expect(connectArgs?.opts).toMatchObject({
      username: "bblp",
      password: "12345678",
      rejectUnauthorized: false,
    });
    expect(currentClient.subscribed).toEqual([`device/${opts.serial}/report`]);
  });

  test("honours a custom port", async () => {
    const client = new LanClient({ ...opts, port: 1234 });
    await client.connect();
    expect(connectArgs?.url).toBe("mqtts://192.168.1.42:1234");
  });
});

describe("LanClient.sendCommand / pushAll", () => {
  let client: InstanceType<typeof LanClient>;

  beforeEach(async () => {
    client = new LanClient(opts);
    await client.connect();
  });

  afterEach(async () => {
    await client.disconnect();
  });

  test("sendCommand serialises the payload as JSON on the request topic", async () => {
    await client.sendCommand({ print: { command: "stop", sequence_id: "1" } });
    expect(currentClient.published).toHaveLength(1);
    expect(currentClient.published[0]?.topic).toBe(`device/${opts.serial}/request`);
    expect(JSON.parse(currentClient.published[0]?.payload ?? "")).toEqual({
      print: { command: "stop", sequence_id: "1" },
    });
  });

  test("pushAll publishes the documented pushall payload", async () => {
    await client.pushAll();
    expect(currentClient.published).toHaveLength(1);
    expect(JSON.parse(currentClient.published[0]?.payload ?? "")).toEqual({
      pushing: { sequence_id: "0", command: "pushall" },
    });
  });

  test("publish before connect throws", async () => {
    const fresh = new LanClient(opts);
    await expect(fresh.sendCommand({ noop: true })).rejects.toThrow(/Not connected/);
  });
});

describe("LanClient.onMessage", () => {
  let client: InstanceType<typeof LanClient>;

  beforeEach(async () => {
    client = new LanClient(opts);
    await client.connect();
  });

  afterEach(async () => {
    await client.disconnect();
  });

  test("dispatches parsed JSON payloads to subscribers", async () => {
    const received: unknown[] = [];
    client.onMessage((p) => received.push(p));
    currentClient.emit("message", "topic", Buffer.from(JSON.stringify({ hello: 1 })));
    expect(received).toEqual([{ hello: 1 }]);
  });

  test("returned function unsubscribes the listener", async () => {
    const received: unknown[] = [];
    const unsub = client.onMessage((p) => received.push(p));
    unsub();
    currentClient.emit("message", "topic", Buffer.from(JSON.stringify({ hello: 1 })));
    expect(received).toEqual([]);
  });

  test("non-JSON payloads are silently dropped", async () => {
    const received: unknown[] = [];
    client.onMessage((p) => received.push(p));
    currentClient.emit("message", "topic", Buffer.from("not json"));
    expect(received).toEqual([]);
  });
});

describe("LanClient.disconnect", () => {
  test("ends the underlying mqtt client", async () => {
    const client = new LanClient(opts);
    await client.connect();
    await client.disconnect();
    expect(currentClient.ended).toBe(true);
  });

  test("is a no-op when never connected", async () => {
    const client = new LanClient(opts);
    await client.disconnect();
  });
});
