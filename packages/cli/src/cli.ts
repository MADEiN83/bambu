#!/usr/bin/env node

const [, , cmd] = process.argv;

async function main() {
  switch (cmd) {
    case "status": {
      // TODO: load tokens from ~/.config/bambu/tokens.json and instantiate BambuClient
      console.log("status — not implemented yet");
      break;
    }
    case "login": {
      console.log("login — not implemented yet");
      break;
    }
    case "watch": {
      console.log("watch — not implemented yet");
      break;
    }
    default:
      console.log("Usage: bbu <command>");
      console.log("Commands: login, status, watch, devices, tasks");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
