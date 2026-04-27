// Manually refresh an access token using a known refresh token.
//
// You rarely need this — `BambuClient` auto-refreshes on 401 internally.
// Shown here for custom persistence layers that need to pre-warm tokens.
//
// Usage:
//   bun examples/cloud/refresh-tokens.ts

import { BambuClient, fileTokenStore } from "@crazydev/bambu";

const store = fileTokenStore(".bambu-tokens.json");
const cached = await store.load();

if (!cached) {
  console.error("No cached tokens found. Run `examples/cloud/connect-with-token-store.ts` first.");
  process.exit(1);
}

if (Date.now() >= cached.refreshExpiresAt) {
  console.error("Refresh token expired — full re-login required.");
  process.exit(1);
}

const refreshed = await BambuClient.refreshTokens(cached.refreshToken, "EU");
await store.save(refreshed);

console.log("Tokens refreshed:");
console.log("  accessToken (truncated):", refreshed.accessToken.slice(0, 12) + "…");
console.log("  expiresAt:", new Date(refreshed.expiresAt).toISOString());
