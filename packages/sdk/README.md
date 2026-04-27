# @crazydev/bambu

Unofficial TypeScript SDK for Bambu Lab printers — Cloud REST + LAN MQTT.

## Install

```bash
npm i @crazydev/bambu
```

## Cloud usage

The recommended path is `BambuClient.connect()`. It handles the full auth
lifecycle: load tokens from disk → login → trigger 2FA if needed → save tokens
→ auto-refresh on 401.

```ts
import { BambuClient, fileTokenStore } from "@crazydev/bambu";
import { createInterface } from "node:readline/promises";

const client = await BambuClient.connect({
  email: process.env.BAMBU_EMAIL!,
  password: process.env.BAMBU_PASSWORD!,
  region: "EU",
  tokenStore: fileTokenStore(".bambu-tokens.json"),
  onVerifyCode: async () => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const code = (await rl.question("2FA code: ")).trim();
    rl.close();
    return code;
  },
});

const devices = await client.devices();
const printer = await client.getDeviceById("00M09B461100094");

const statuses = await client.getDeviceStatuses();
const status = await client.getDeviceStatusById("00M09B461100094");

const tasks = await client.tasks(10);
```

### Token persistence

A `tokenStore` is highly recommended — without it, users hit 2FA on every run.
Built-in stores:

```ts
import { fileTokenStore, memoryTokenStore } from "@crazydev/bambu";

fileTokenStore(".bambu-tokens.json"); // chmod 600 JSON file
memoryTokenStore();                    // in-process (tests / short scripts)
```

`TokenStore` is a 3-method interface (`load` / `save` / `clear`) — implement
your own to plug into a keychain, secrets manager, database, etc.

### Auto-refresh

When any authed call returns 401, the client transparently exchanges the
`refreshToken` for a fresh access token, persists it via the store, and retries
the request once. No user code involved.

### Low-level auth (advanced)

If you want to manage tokens yourself, use the static methods:

```ts
import { BambuClient } from "@crazydev/bambu";

const result = await BambuClient.login("you@example.com", "password");
let tokens;
if (result.requiresVerifyCode) {
  await BambuClient.sendVerifyCode("you@example.com");
  tokens = await BambuClient.loginWithCode("you@example.com", "123456");
} else {
  tokens = result.tokens;
}

const fresh = await BambuClient.refreshTokens(tokens.refreshToken);

const client = new BambuClient({ region: "EU", tokens });
```

### Status enums

```ts
import { PrintStatus, TaskStatus } from "@crazydev/bambu";

if (device.print_status === PrintStatus.RUNNING) { /* ... */ }
if (task.status === TaskStatus.FINISHED) { /* ... */ }
```

## LAN usage

```ts
import { LanClient } from "@crazydev/bambu";

const printer = new LanClient({
  host: "192.168.1.42",
  serial: "01P00A...",
  accessCode: "12345678",
});

await printer.connect();

printer.onMessage((data) => {
  console.log("Status:", data);
});

await printer.pushAll(); // request full status
```

## License

MIT
