// Connect to Bambu Cloud without a token store.
//
// 2FA will be triggered on every run (no persistence). Useful for one-shot
// scripts or CI jobs that always start cold.
//
// Usage:
//   BAMBU_EMAIL='you@example.com' BAMBU_PASSWORD='xxx' bun examples/cloud/connect-basic.ts

import { createInterface } from "node:readline/promises";
import { BambuClient } from "@crazydev/bambu";

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
  onVerifyCode: async () => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const code = (await rl.question("2FA code (6 digits): ")).trim();
    rl.close();
    return code;
  },
});

console.log("Connected. Access token (truncated):", client.getTokens().accessToken.slice(0, 12) + "…");
