// Recent print tasks (most recent first).
//
// Usage:
//   BAMBU_EMAIL='you@example.com' BAMBU_PASSWORD='xxx' bun examples/cloud/list-tasks.ts

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

const tasks = await client.tasks(10);
console.log(`Last ${tasks.length} task(s):`);
for (const t of tasks) {
  console.log(`- [${t.id}] ${t.title} — ${t.deviceName} status=${t.status} (${t.startTime})`);
}
