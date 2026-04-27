# @crazydev/bambu

Unofficial TypeScript SDK for Bambu Lab printers — Cloud REST + LAN MQTT.

## Install

```bash
npm i @crazydev/bambu
```

## Cloud usage

```ts
import { CloudClient } from "@crazydev/bambu";

const client = new CloudClient({ region: "EU" });

const { requiresVerifyCode } = await client.loginWithPassword(
  "you@example.com",
  "password",
);

if (requiresVerifyCode) {
  await client.sendVerifyCode("you@example.com");
  // ... ask user for the code received by email
  await client.loginWithCode("you@example.com", "123456");
}

const devices = await client.devices();
const status = await client.status();
const tasks = await client.tasks(10);
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
