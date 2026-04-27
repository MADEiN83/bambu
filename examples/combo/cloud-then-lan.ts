// Resolve the printer's serial + access code via Cloud, then open a live LAN
// stream. The printer's local IP cannot be discovered via Cloud — provide it
// via `BAMBU_LAN_IP`.
//
// Usage:
//   BAMBU_EMAIL='you@example.com' BAMBU_PASSWORD='xxx' \
//   BAMBU_DEV_ID='00M09B461100094' BAMBU_LAN_IP='192.168.1.42' \
//   bun examples/combo/cloud-then-lan.ts

import { createInterface } from "node:readline/promises";
import { BambuClient, fileTokenStore, LanClient } from "@crazydev/bambu";

const email = process.env.BAMBU_EMAIL;
const password = process.env.BAMBU_PASSWORD;
const devId = process.env.BAMBU_DEV_ID;
const host = process.env.BAMBU_LAN_IP;

if (!email || !password || !devId || !host) {
  console.error("Missing BAMBU_EMAIL / BAMBU_PASSWORD / BAMBU_DEV_ID / BAMBU_LAN_IP");
  process.exit(1);
}

const cloud = await BambuClient.connect({
  email,
  password,
  tokenStore: fileTokenStore(".bambu-tokens.json"),
  onVerifyCode: async () => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const code = (await rl.question("2FA code (6 digits): ")).trim();
    rl.close();
    return code;
  },
});

const device = await cloud.getDeviceById(devId);
if (!device) {
  console.error(`Device ${devId} not found on this account`);
  process.exit(1);
}

console.log(`Cloud says: ${device.name} (${device.dev_product_name})`);
console.log(`Connecting to ${host} via LAN MQTT…`);

const lan = new LanClient({
  host,
  serial: device.dev_id,
  accessCode: device.dev_access_code,
});

await lan.connect();
lan.onMessage((payload) => console.log("LAN:", payload));
await lan.pushAll();

await new Promise((r) => setTimeout(r, 5000));
await lan.disconnect();
console.log("Done.");
