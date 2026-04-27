import { afterEach, describe, expect, mock, test } from "bun:test";
import type { BambuTokens } from "../types/index.js";
import { BambuClient } from "./client.js";
import { memoryTokenStore } from "./token-store.js";

type FetchCall = { url: string; init: RequestInit | undefined };

interface MockResponse {
  status?: number;
  ok?: boolean;
  body?: unknown;
  text?: string;
}

function mockFetchOnce(queue: MockResponse[]): { calls: FetchCall[]; restore: () => void } {
  const calls: FetchCall[] = [];
  const original = globalThis.fetch;
  const fake = mock((url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const next = queue.shift();
    if (!next) {
      return Promise.reject(new Error(`Unexpected fetch call: ${String(url)}`));
    }
    const status = next.status ?? 200;
    const ok = next.ok ?? (status >= 200 && status < 300);
    return Promise.resolve({
      status,
      ok,
      json: async () => next.body,
      text: async () => next.text ?? JSON.stringify(next.body ?? ""),
    } as unknown as Response);
  });
  globalThis.fetch = fake as unknown as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

const farFutureTokens = (overrides: Partial<BambuTokens> = {}): BambuTokens => ({
  accessToken: "access-1",
  refreshToken: "refresh-1",
  expiresAt: Date.now() + 60_000,
  refreshExpiresAt: Date.now() + 600_000,
  ...overrides,
});

describe("BambuClient.login", () => {
  let restore: () => void = () => {};
  afterEach(() => restore());

  test("returns tokens with expiresAt computed from expiresIn (seconds → ms offset from now)", async () => {
    const ctx = mockFetchOnce([
      {
        body: {
          accessToken: "A",
          refreshToken: "R",
          expiresIn: 3600,
          refreshExpiresIn: 7200,
        },
      },
    ]);
    restore = ctx.restore;

    const before = Date.now();
    const result = await BambuClient.login("me@example.com", "pw");
    const after = Date.now();

    expect(result.requiresVerifyCode).toBe(false);
    if (result.requiresVerifyCode) throw new Error("unreachable");
    expect(result.tokens.accessToken).toBe("A");
    expect(result.tokens.refreshToken).toBe("R");
    expect(result.tokens.expiresAt).toBeGreaterThanOrEqual(before + 3600 * 1000);
    expect(result.tokens.expiresAt).toBeLessThanOrEqual(after + 3600 * 1000);
    expect(result.tokens.refreshExpiresAt).toBeGreaterThanOrEqual(before + 7200 * 1000);
    expect(result.tokens.refreshExpiresAt).toBeLessThanOrEqual(after + 7200 * 1000);

    const call = ctx.calls[0];
    expect(call?.url).toBe("https://api.bambulab.com/v1/user-service/user/login");
    expect(call?.init?.method).toBe("POST");
    expect(JSON.parse(String(call?.init?.body))).toEqual({
      account: "me@example.com",
      password: "pw",
    });
  });

  test("flags 2FA when loginType is verifyCode (no tokens returned)", async () => {
    const ctx = mockFetchOnce([{ body: { loginType: "verifyCode" } }]);
    restore = ctx.restore;

    const result = await BambuClient.login("me@example.com", "pw");
    expect(result.requiresVerifyCode).toBe(true);
    expect((result as { tokens?: BambuTokens }).tokens).toBeUndefined();
  });

  test("throws on unexpected response shape", async () => {
    const ctx = mockFetchOnce([{ body: { hello: "world" } }]);
    restore = ctx.restore;
    await expect(BambuClient.login("me@example.com", "pw")).rejects.toThrow(
      /Unexpected login response/,
    );
  });

  test("uses the CN base URL when region is CN", async () => {
    const ctx = mockFetchOnce([
      { body: { accessToken: "A", refreshToken: "R", expiresIn: 1, refreshExpiresIn: 2 } },
    ]);
    restore = ctx.restore;

    await BambuClient.login("me@example.com", "pw", "CN");
    expect(ctx.calls[0]?.url).toBe("https://api.bambulab.cn/v1/user-service/user/login");
  });
});

describe("BambuClient.getDeviceById / getDeviceStatusById", () => {
  let restore: () => void = () => {};
  afterEach(() => restore());

  const tokens = farFutureTokens();

  test("getDeviceById returns the matching device", async () => {
    const devices = [
      { dev_id: "AAA", name: "one" },
      { dev_id: "BBB", name: "two" },
    ];
    const ctx = mockFetchOnce([{ body: { devices } }]);
    restore = ctx.restore;

    const client = new BambuClient({ tokens });
    const found = await client.getDeviceById("BBB");
    expect(found?.name).toBe("two");
  });

  test("getDeviceById returns null when no device matches", async () => {
    const ctx = mockFetchOnce([{ body: { devices: [{ dev_id: "AAA" }] } }]);
    restore = ctx.restore;

    const client = new BambuClient({ tokens });
    expect(await client.getDeviceById("ZZZ")).toBeNull();
  });

  test("getDeviceStatusById filters by dev_id", async () => {
    const ctx = mockFetchOnce([
      {
        body: {
          message: "ok",
          code: 0,
          error: null,
          devices: [
            { dev_id: "AAA", dev_name: "one", dev_online: true },
            { dev_id: "BBB", dev_name: "two", dev_online: false },
          ],
        },
      },
    ]);
    restore = ctx.restore;

    const client = new BambuClient({ tokens });
    const status = await client.getDeviceStatusById("BBB");
    expect(status?.dev_name).toBe("two");
    expect(status?.dev_online).toBe(false);
  });

  test("getDeviceStatusById returns null on miss", async () => {
    const ctx = mockFetchOnce([
      {
        body: { message: "ok", code: 0, error: null, devices: [{ dev_id: "AAA" }] },
      },
    ]);
    restore = ctx.restore;

    const client = new BambuClient({ tokens });
    expect(await client.getDeviceStatusById("ZZZ")).toBeNull();
  });
});

describe("BambuClient.authedRequest 401 → refresh → retry", () => {
  let restore: () => void = () => {};
  afterEach(() => restore());

  test("on 401, refreshes tokens and retries the original call with the new bearer", async () => {
    const initialTokens: BambuTokens = {
      accessToken: "stale",
      refreshToken: "refresh-stale",
      expiresAt: Date.now() + 60_000,
      refreshExpiresAt: Date.now() + 600_000,
    };
    const ctx = mockFetchOnce([
      { status: 401, body: {}, text: "expired" },
      {
        body: {
          accessToken: "fresh",
          refreshToken: "refresh-fresh",
          expiresIn: 3600,
          refreshExpiresIn: 7200,
        },
      },
      { body: { devices: [{ dev_id: "AAA", name: "one" }] } },
    ]);
    restore = ctx.restore;

    const store = memoryTokenStore(initialTokens);
    const client = new BambuClient({ tokens: initialTokens, tokenStore: store });
    const devices = await client.devices();

    expect(devices).toEqual([{ dev_id: "AAA", name: "one" } as never]);
    expect(ctx.calls).toHaveLength(3);
    expect(ctx.calls[0]?.url).toContain("/iot-service/api/user/bind");
    expect(ctx.calls[1]?.url).toContain("/user-service/user/refreshtoken");
    expect(ctx.calls[2]?.url).toContain("/iot-service/api/user/bind");

    const retryHeaders = ctx.calls[2]?.init?.headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe("Bearer fresh");

    const persisted = await store.load();
    expect(persisted?.accessToken).toBe("fresh");
  });

  test("throws when refresh token is itself expired", async () => {
    const expiredTokens: BambuTokens = {
      accessToken: "stale",
      refreshToken: "refresh-stale",
      expiresAt: Date.now() + 60_000,
      refreshExpiresAt: Date.now() - 1,
    };
    const ctx = mockFetchOnce([{ status: 401, body: {}, text: "expired" }]);
    restore = ctx.restore;

    const client = new BambuClient({ tokens: expiredTokens });
    await expect(client.devices()).rejects.toThrow(/Refresh token expired/);
  });

  test("non-401 errors bubble up without a refresh attempt", async () => {
    const ctx = mockFetchOnce([{ status: 500, body: {}, text: "boom" }]);
    restore = ctx.restore;

    const client = new BambuClient({ tokens: farFutureTokens() });
    await expect(client.devices()).rejects.toThrow(/HTTP 500/);
    expect(ctx.calls).toHaveLength(1);
  });
});
