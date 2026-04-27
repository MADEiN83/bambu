import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BambuTokens } from "../types/index.js";
import { fileTokenStore, memoryTokenStore } from "./token-store.js";

const sampleTokens: BambuTokens = {
  accessToken: "access-123",
  refreshToken: "refresh-456",
  expiresAt: 1_700_000_000_000,
  refreshExpiresAt: 1_700_000_999_999,
};

describe("memoryTokenStore", () => {
  test("round-trips tokens through save/load", async () => {
    const store = memoryTokenStore();
    expect(await store.load()).toBeNull();
    await store.save(sampleTokens);
    expect(await store.load()).toEqual(sampleTokens);
  });

  test("clear() resets state", async () => {
    const store = memoryTokenStore(sampleTokens);
    expect(await store.load()).toEqual(sampleTokens);
    await store.clear();
    expect(await store.load()).toBeNull();
  });
});

describe("fileTokenStore", () => {
  let dir: string;
  let path: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bambu-tokens-"));
    path = join(dir, "tokens.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("returns null when file is missing", async () => {
    const store = fileTokenStore(path);
    expect(await store.load()).toBeNull();
  });

  test("save then load round-trips identical tokens", async () => {
    const store = fileTokenStore(path);
    await store.save(sampleTokens);
    expect(existsSync(path)).toBe(true);
    expect(await store.load()).toEqual(sampleTokens);
  });

  test("save writes the file with chmod 600 on POSIX", async () => {
    const store = fileTokenStore(path);
    await store.save(sampleTokens);
    if (process.platform !== "win32") {
      const mode = statSync(path).mode & 0o777;
      expect(mode).toBe(0o600);
    }
  });

  test("load returns null when file is corrupt JSON", async () => {
    const store = fileTokenStore(path);
    await Bun.write(path, "{not valid json");
    expect(await store.load()).toBeNull();
  });

  test("clear empties the file", async () => {
    const store = fileTokenStore(path);
    await store.save(sampleTokens);
    await store.clear();
    expect(await store.load()).toBeNull();
  });
});
