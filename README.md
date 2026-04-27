# bambu

Unofficial Bambu Lab SDK & CLI for Node.js. Control your printers via Cloud API and LAN MQTT.

> ⚠️ Unofficial. Not affiliated with Bambu Lab. Built on top of community docs ([OpenBambuAPI](https://github.com/Doridian/OpenBambuAPI)).

## Packages

| Package | Description | Install |
|---|---|---|
| [`@crazydev/bambu`](./packages/sdk) | TypeScript SDK — Cloud REST + LAN MQTT client | `npm i @crazydev/bambu` |
| [`@crazydev/bambu-cli`](./packages/cli) | Command-line tool for terminals | `npm i -g @crazydev/bambu-cli` |

## Quick start

### SDK

```ts
import { BambuClient } from "@crazydev/bambu";

const client = new BambuClient({ email: "you@example.com" });
await client.login();

const printers = await client.devices();
const status = await client.status(printers[0].dev_id);
```

### CLI

```bash
# Via npm
npx @crazydev/bambu-cli status

# Via Homebrew (planned)
brew install MADEiN83/tap/bambu
bbu status
```

## Features

- ✅ Cloud REST API (login w/ 2FA, devices, status, tasks)
- ✅ LAN MQTT (real-time push status, commands)
- 🚧 3MF/G-code upload
- 🚧 Camera RTSP stream
- 🚧 AMS slot management
- 🚧 Token persistence + auto-refresh

## Development

```bash
bun install
bun run build
bun run typecheck
bun test
```

## Tested with

- Bambu Lab X1C
- Bambu Lab P1S

## License

MIT — Anthony Di Stefano
