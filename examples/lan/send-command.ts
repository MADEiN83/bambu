// Send a control command to the printer over LAN MQTT.
//
// Common commands (see OpenBambuAPI MQTT doc):
//   { print: { sequence_id: "0", command: "pause" } }
//   { print: { sequence_id: "0", command: "resume" } }
//   { print: { sequence_id: "0", command: "stop" } }
//
// ⚠️  This example sends `pause`. Comment it out if you don't want to actually
// pause an in-progress print.
//
// Usage:
//   BAMBU_LAN_IP='192.168.1.42' BAMBU_DEV_ID='00M09B461100094' \
//   BAMBU_ACCESS_CODE='12345678' bun examples/lan/send-command.ts

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

await client.sendCommand({
  print: { sequence_id: "0", command: "pause" },
});
console.log("Command sent: pause");

await client.disconnect();
