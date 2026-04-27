import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import type { BambuTokens } from "../types/index.js";

/**
 * Pluggable token persistence layer. Implement this to plug into your
 * own keychain, secrets manager, database, etc.
 */
export interface TokenStore {
  load(): Promise<BambuTokens | null>;
  save(tokens: BambuTokens): Promise<void>;
  clear(): Promise<void>;
}

/**
 * In-memory store. Tokens are lost on process exit.
 * Useful for tests or short-lived scripts.
 */
export function memoryTokenStore(initial?: BambuTokens): TokenStore {
  let tokens: BambuTokens | null = initial ?? null;
  return {
    async load() {
      return tokens;
    },
    async save(t) {
      tokens = t;
    },
    async clear() {
      tokens = null;
    },
  };
}

/**
 * File-backed store. Writes JSON to `path` with chmod 600.
 *
 * @example
 * ```ts
 * const store = fileTokenStore("./.bambu-tokens.json");
 * const client = await BambuClient.connect({ email, password, tokenStore: store });
 * ```
 */
export function fileTokenStore(path: string): TokenStore {
  return {
    async load() {
      if (!existsSync(path)) return null;
      try {
        return JSON.parse(readFileSync(path, "utf8")) as BambuTokens;
      } catch {
        return null;
      }
    },
    async save(tokens) {
      writeFileSync(path, JSON.stringify(tokens, null, 2));
      try {
        chmodSync(path, 0o600);
      } catch {
        // Non-POSIX filesystems silently ignore chmod
      }
    },
    async clear() {
      try {
        writeFileSync(path, "");
      } catch {
        // ignore
      }
    },
  };
}
