// Live status for every device on the account.
//
// Usage:
//   BAMBU_EMAIL='you@example.com' BAMBU_PASSWORD='xxx' bun examples/cloud/get-device-statuses.ts

import { createInterface } from "node:readline/promises";
import { BambuClient, fileTokenStore } from "@crazydev/bambu";

const email = process.env.BAMBU_EMAIL;
const password = process.env.BAMBU_PASSWORD;

if (!email || !password) {
  console.error("Missing BAMBU_EMAIL / BAMBU_PASSWORD");
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

const res = await client.getDeviceStatuses();
console.log(`code=${res.code} message="${res.message}" devices=${res.devices.length}`);
for (const d of res.devices) {
  console.log(`- ${d.dev_name} (${d.dev_product_name}) — id=${d.dev_id} online=${d.dev_online}`);
}
