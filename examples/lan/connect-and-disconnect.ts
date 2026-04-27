// Connect to a printer over LAN MQTT, then disconnect cleanly.
//
// Usage:
//   BAMBU_LAN_IP='192.168.1.42' BAMBU_DEV_ID='00M09B461100094' \
//   BAMBU_ACCESS_CODE='12345678' bun examples/lan/connect-and-disconnect.ts

import { LanClient } from "@crazydev/bambu";

const host = process.env.BAMBU_LAN_IP;
const serial = process.env.BAMBU_DEV_ID;
const accessCode = process.env.BAMBU_ACCESS_CODE;

if (!host || !serial || !accessCode) {
  console.error("Missing BAMBU_LAN_IP / BAMBU_DEV_ID / BAMBU_ACCESS_CODE");
  process.exit(1);
}

const client = new LanClient({ host, serial, accessCode });

console.log(`Connecting to ${host}…`);
await client.connect();
console.log("Connected. Subscribed to device/<serial>/report.");

await client.disconnect();
console.log("Disconnected.");
