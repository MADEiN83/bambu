// Fetch full project details by ID (profiles, plates, materials, upload URLs).
//
// Response shape is not documented in the public API; returns `unknown` until
// a real response can be captured and typed.
//
// Usage:
//   BAMBU_EMAIL='you@example.com' BAMBU_PASSWORD='xxx' \
//   BAMBU_PROJECT_ID='123456789' bun examples/cloud/get-project.ts

import { createInterface } from "node:readline/promises";
import { BambuClient, fileTokenStore } from "@crazydev/bambu";

const email = process.env.BAMBU_EMAIL;
const password = process.env.BAMBU_PASSWORD;
const projectId = process.env.BAMBU_PROJECT_ID;

if (!email || !password || !projectId) {
  console.error("Missing BAMBU_EMAIL / BAMBU_PASSWORD / BAMBU_PROJECT_ID");
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

const project = await client.getProject(projectId);
console.log(JSON.stringify(project, null, 2));
