// Fetch a single print task by its id (iot-service variant).
//
// Response shape is undocumented in `api.yaml` — typed as `unknown` until a
// real payload is captured.
//
// Usage:
//   BAMBU_EMAIL='you@example.com' BAMBU_PASSWORD='xxx' \
//   BAMBU_TASK_ID='123456789' bun examples/cloud/get-task-by-id.ts

import { createInterface } from "node:readline/promises";
import { BambuClient, fileTokenStore } from "@crazydev/bambu";

const email = process.env.BAMBU_EMAIL;
const password = process.env.BAMBU_PASSWORD;
const taskId = process.env.BAMBU_TASK_ID;

if (!email || !password || !taskId) {
  console.error("Missing BAMBU_EMAIL / BAMBU_PASSWORD / BAMBU_TASK_ID");
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

const task = await client.getTaskById(taskId);
console.log(JSON.stringify(task, null, 2));
