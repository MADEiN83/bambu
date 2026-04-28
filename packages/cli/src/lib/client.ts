import { createInterface } from "node:readline/promises";
import { BambuClient, type Region } from "@crazydev/bambu";
import { getStore } from "./store.js";

export async function loadClient(region: Region = "EU"): Promise<BambuClient> {
  const store = getStore();
  const tokens = await store.load();

  if (!tokens) {
    console.error("Not logged in. Run `bbu login` first.");
    process.exit(1);
  }

  if (Date.now() >= tokens.refreshExpiresAt) {
    console.error("Session expired. Run `bbu login` again.");
    process.exit(1);
  }

  return new BambuClient({ region, tokens, tokenStore: store });
}

export async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}
