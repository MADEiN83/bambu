// Live status for a single device by its `dev_id`.
//
// Internally calls `getDeviceStatuses()` and filters.
//
// Usage:
//   BAMBU_EMAIL='you@example.com' BAMBU_PASSWORD='xxx' \
//   BAMBU_DEV_ID='00M09B461100094' bun examples/cloud/get-device-status-by-id.ts

import { createInterface } from "node:readline/promises";
import { BambuClient, fileTokenStore } from "@crazydev/bambu";

const email = process.env.BAMBU_EMAIL;
const password = process.env.BAMBU_PASSWORD;
const devId = process.env.BAMBU_DEV_ID;

if (!email || !password || !devId) {
  console.error("Missing BAMBU_EMAIL / BAMBU_PASSWORD / BAMBU_DEV_ID");
  process.exit(1);
}

const client = await BambuClient.connect({
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

const status = await client.getDeviceStatusById(devId);
if (!status) {
  console.log(`No device found with id ${devId}`);
  process.exit(0);
}

console.log(status);
