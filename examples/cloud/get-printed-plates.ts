// List which plates of a given model instance have already been printed.
//
// Response shape is not documented upstream — typed as `unknown` until a real
// payload is captured.
//
// Usage:
//   BAMBU_EMAIL='you@example.com' BAMBU_PASSWORD='xxx' \
//   BAMBU_PROJECT_INSTANCE_ID='1234' bun examples/cloud/get-printed-plates.ts

import { createInterface } from "node:readline/promises";
import { BambuClient, fileTokenStore } from "@crazydev/bambu";

const email = process.env.BAMBU_EMAIL;
const password = process.env.BAMBU_PASSWORD;
const instanceIdRaw = process.env.BAMBU_PROJECT_INSTANCE_ID;

if (!email || !password || !instanceIdRaw) {
  console.error("Missing BAMBU_EMAIL / BAMBU_PASSWORD / BAMBU_PROJECT_INSTANCE_ID");
  process.exit(1);
}

const instanceId = Number.parseInt(instanceIdRaw, 10);
if (!Number.isFinite(instanceId)) {
  console.error(`BAMBU_PROJECT_INSTANCE_ID must be an integer, got "${instanceIdRaw}"`);
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

const plates = await client.getPrintedPlates(instanceId);
console.log(JSON.stringify(plates, null, 2));
