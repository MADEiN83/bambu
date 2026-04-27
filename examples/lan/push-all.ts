// Trigger a full state push from the printer.
//
// `pushAll()` publishes `{ pushing: { sequence_id: "0", command: "pushall" } }`.
// The printer responds with a complete status snapshot on the report topic —
// listen for it via `onMessage(fn)`.
//
// Usage:
//   BAMBU_LAN_IP='192.168.1.42' BAMBU_DEV_ID='00M09B461100094' \
//   BAMBU_ACCESS_CODE='12345678' bun examples/lan/push-all.ts

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

client.onMessage((payload) => {
  console.log("Received:", JSON.stringify(payload, null, 2));
});

await client.pushAll();
console.log("pushAll() sent. Waiting 5s for the snapshot…");

await new Promise((r) => setTimeout(r, 5000));
await client.disconnect();
