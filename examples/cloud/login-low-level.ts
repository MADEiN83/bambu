// Manual login flow without `BambuClient.connect()`.
//
// Useful when you want full control over each step (e.g. custom 2FA UX,
// tokens stored in a vault). For most cases, prefer `BambuClient.connect()`.
//
// Usage:
//   BAMBU_EMAIL='you@example.com' BAMBU_PASSWORD='xxx' bun examples/cloud/login-low-level.ts

import { createInterface } from "node:readline/promises";
import { BambuClient, type BambuTokens } from "@crazydev/bambu";

const email = process.env.BAMBU_EMAIL;
const password = process.env.BAMBU_PASSWORD;

if (!email || !password) {
  console.error("Missing BAMBU_EMAIL / BAMBU_PASSWORD");
  process.exit(1);
}

// Step 1 — start login
const result = await BambuClient.login(email, password, "EU");

let tokens: BambuTokens;
if (result.requiresVerifyCode) {
  // Step 2 — request a 2FA code
  await BambuClient.sendVerifyCode(email, "EU");

  // Step 3 — read the code from the user
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const code = (await rl.question("2FA code (6 digits): ")).trim();
  rl.close();

  // Step 4 — finalize login with the code
  tokens = await BambuClient.loginWithCode(email, code, "EU");
} else {
  tokens = result.tokens;
}

console.log("Tokens acquired:");
console.log("  accessToken (truncated):", `${tokens.accessToken.slice(0, 12)}…`);
console.log("  expiresAt:", new Date(tokens.expiresAt).toISOString());
console.log("  refreshExpiresAt:", new Date(tokens.refreshExpiresAt).toISOString());
