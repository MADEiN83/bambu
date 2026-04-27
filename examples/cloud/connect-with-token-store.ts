// Connect with persistent tokens — recommended pattern.
//
// On first run, prompts for the 2FA code and saves tokens to
// `.bambu-tokens.json` (chmod 600). Subsequent runs reuse the cached tokens
// and auto-refresh on expiry, so the user only sees MFA every ~6 months.
//
// Usage:
//   BAMBU_EMAIL='you@example.com' BAMBU_PASSWORD='xxx' bun examples/cloud/connect-with-token-store.ts

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
  region: "EU",
  tokenStore: fileTokenStore(".bambu-tokens.json"),
  onVerifyCode: async () => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const code = (await rl.question("2FA code (6 digits): ")).trim();
    rl.close();
    return code;
  },
});

const devices = await client.devices();
console.log(`Connected. ${devices.length} device(s) bound to the account.`);
