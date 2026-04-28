import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { type BambuTokens, fileTokenStore, type TokenStore } from "@crazydev/bambu";

export const TOKENS_DIR = join(homedir(), ".config", "bambu");
export const TOKENS_PATH = join(TOKENS_DIR, "tokens.json");

export function getStore(): TokenStore {
  mkdirSync(TOKENS_DIR, { recursive: true, mode: 0o700 });
  return fileTokenStore(TOKENS_PATH);
}

export type { BambuTokens };
