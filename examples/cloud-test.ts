// Test du SDK Cloud — login (avec 2FA), devices, status, tasks.
// Persistence + auto-refresh gérés par le SDK → 1 seul MFA tous les ~6 mois.
//
// Usage :
//   BAMBU_EMAIL='you@example.com' BAMBU_PASSWORD='xxx' bun examples/cloud-test.ts

import { createInterface } from "node:readline/promises";
import { BambuClient, fileTokenStore } from "@crazydev/bambu";

const EMAIL = process.env.BAMBU_EMAIL;
const PASSWORD = process.env.BAMBU_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Missing BAMBU_EMAIL / BAMBU_PASSWORD");
  process.exit(1);
}

const client = await BambuClient.connect({
  email: EMAIL,
  password: PASSWORD,
  region: "EU",
  tokenStore: fileTokenStore(".bambu-tokens.json"),
  onVerifyCode: async () => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const code = (await rl.question("Code 2FA reçu (6 chiffres) : ")).trim();
    rl.close();
    return code;
  },
});

const devices = await client.getDeviceStatuses();
console.log("🔥 là ", devices);
