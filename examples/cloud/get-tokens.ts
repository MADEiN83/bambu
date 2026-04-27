// Read the current tokens out of a `BambuClient` instance.
//
// Useful when you persist tokens yourself (keychain, secrets manager, DB)
// instead of relying on `fileTokenStore`.
//
// Usage:
//   BAMBU_EMAIL='you@example.com' BAMBU_PASSWORD='xxx' bun examples/cloud/get-tokens.ts

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

const tokens = client.getTokens();

console.log({
  accessToken: tokens.accessToken.slice(0, 12) + "…",
  refreshToken: tokens.refreshToken.slice(0, 12) + "…",
  expiresAt: new Date(tokens.expiresAt).toISOString(),
  refreshExpiresAt: new Date(tokens.refreshExpiresAt).toISOString(),
});
