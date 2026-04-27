// Subscribe to the live MQTT stream pushed by the printer.
//
// The printer pushes status updates spontaneously to `device/<serial>/report`.
// Use `onMessage(fn)` to react to them. Press Ctrl+C to stop.
//
// Usage:
//   BAMBU_LAN_IP='192.168.1.42' BAMBU_DEV_ID='00M09B461100094' \
//   BAMBU_ACCESS_CODE='12345678' bun examples/lan/on-message-stream.ts

import { LanClient } from "@crazydev/bambu";

const host = process.env.BAMBU_LAN_IP;
const serial = process.env.BAMBU_DEV_ID;
const accessCode = process.env.BAMBU_ACCESS_CODE;

if (!host || !serial || !accessCode) {
  console.error("Missing BAMBU_LAN_IP / BAMBU_DEV_ID / BAMBU_ACCESS_CODE");
  process.exit(1);
}

const client = new LanClient({ host, serial, accessCode });
await client.connect();
console.log("Connected. Listening for messages (Ctrl+C to stop)…");

const off = client.onMessage((payload) => {
  console.log(new Date().toISOString(), payload);
});

// Trigger an initial full state snapshot
await client.pushAll();

process.on("SIGINT", async () => {
  off();
  await client.disconnect();
  console.log("\nDisconnected.");
  process.exit(0);
});
