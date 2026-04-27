// Watch a printer from both sides at once:
// - Cloud `getDeviceStatuses()` polled every 30s (online / offline / busy)
// - LAN MQTT live stream (per-second updates while printing)
//
// Press Ctrl+C to stop.
//
// Usage:
//   BAMBU_EMAIL='you@example.com' BAMBU_PASSWORD='xxx' \
//   BAMBU_DEV_ID='00M09B461100094' BAMBU_LAN_IP='192.168.1.42' \
//   bun examples/combo/status-watcher.ts

import { createInterface } from "node:readline/promises";
import { BambuClient, LanClient, fileTokenStore } from "@crazydev/bambu";

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

const lan = new LanClient({
  host,
  serial: device.dev_id,
  accessCode: device.dev_access_code,
});
await lan.connect();
lan.onMessage((payload) => console.log("[LAN ]", new Date().toISOString(), payload));
await lan.pushAll();

const pollCloud = async () => {
  try {
    const status = await cloud.getDeviceStatusById(devId);
    console.log("[CLOUD]", new Date().toISOString(), status);
  } catch (err) {
    console.error("[CLOUD] error:", err);
  }
};

await pollCloud();
const cloudInterval = setInterval(pollCloud, 30_000);

process.on("SIGINT", async () => {
  clearInterval(cloudInterval);
  await lan.disconnect();
  console.log("\nDisconnected.");
  process.exit(0);
});
