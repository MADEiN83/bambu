#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { devices } from "./commands/devices.js";
import { login } from "./commands/login.js";
import { logout } from "./commands/logout.js";
import { status } from "./commands/status.js";

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };

const HELP = `bbu — Bambu Lab CLI (v${pkg.version})

Usage:
  bbu <command> [args]

Commands:
  login              Interactive login (email + password + 2FA). Saves tokens to ~/.config/bambu/tokens.json
  logout             Clear stored tokens
  devices            List printers bound to the account
  status [devId]     Show live status (all devices, or one if devId is provided)
  help               Show this message
  version            Print version

Environment:
  BAMBU_EMAIL        Skip the email prompt on \`bbu login\`
  BAMBU_PASSWORD     Skip the password prompt on \`bbu login\`
`;

async function main(): Promise<void> {
  const [, , cmd, ...args] = process.argv;

  switch (cmd) {
    case "login":
      return login();
    case "logout":
      return logout();
    case "devices":
      return devices();
    case "status":
      return status(args[0]);
    case "help":
    case "--help":
    case "-h":
    case undefined:
      console.log(HELP);
      return;
    case "version":
    case "--version":
    case "-v":
      console.log(pkg.version);
      return;
    default:
      console.error(`Unknown command: ${cmd}\n`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
