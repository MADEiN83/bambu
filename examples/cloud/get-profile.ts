// Fetch a user's printer profile (context, plates, materials).
//
// Calls `GET /iot-service/api/user/profile/{userId}`. The optional `modelId`
// narrows the profile to a specific model (e.g. `USf86740b8413939`). Response
// shape is undocumented upstream — typed as `unknown`.
//
// Usage:
//   BAMBU_EMAIL='you@example.com' BAMBU_PASSWORD='xxx' \
//   BAMBU_USER_ID='1234567' [BAMBU_MODEL_ID='USf86740b8413939'] \
//   bun examples/cloud/get-profile.ts

import { createInterface } from "node:readline/promises";
import { BambuClient, fileTokenStore } from "@crazydev/bambu";

const email = process.env.BAMBU_EMAIL;
const password = process.env.BAMBU_PASSWORD;
const userId = process.env.BAMBU_USER_ID;
const modelId = process.env.BAMBU_MODEL_ID;

if (!email || !password || !userId) {
  console.error("Missing BAMBU_EMAIL / BAMBU_PASSWORD / BAMBU_USER_ID");
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

const profile = await client.getProfile(userId, modelId);
console.log(JSON.stringify(profile, null, 2));
