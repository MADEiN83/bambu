// Fetch firmware version info and available updates for a device.
//
// Response shape is undocumented upstream — typed as `unknown` until a real
// payload is captured.
//
// Usage:
//   BAMBU_EMAIL='you@example.com' BAMBU_PASSWORD='xxx' \
//   BAMBU_DEV_ID='00M09B461100094' bun examples/cloud/get-device-firmware-version.ts

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

const firmware = await client.getDeviceFirmwareVersion(devId);
console.log(JSON.stringify(firmware, null, 2));
