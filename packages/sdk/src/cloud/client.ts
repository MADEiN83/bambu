import type { BambuDevice, BambuDeviceStatus, BambuProject, BambuStatusResponse, BambuTokens, PrintTask, Region } from "../types/index.js";
import type { TokenStore } from "./token-store.js";

const BASE_URLS: Record<Region, string> = {
  EU: "https://api.bambulab.com/v1",
  US: "https://api.bambulab.com/v1",
  CN: "https://api.bambulab.cn/v1",
};

interface RawTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

function buildTokens(res: RawTokens): BambuTokens {
  const now = Date.now();
  return {
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
    expiresAt: now + res.expiresIn * 1000,
    refreshExpiresAt: now + res.refreshExpiresIn * 1000,
  };
}

async function unauthRequest(region: Region, path: string, body: unknown): Promise<any> {
  const res = await fetch(`${BASE_URLS[region]}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export interface BambuClientOptions {
  /** Cloud region. Defaults to `"EU"`. */
  region?: Region;
  /** Pre-acquired tokens. Use {@link BambuClient.connect} for a friendlier flow. */
  tokens: BambuTokens;
  /** Optional store used to persist refreshed tokens. */
  tokenStore?: TokenStore;
}

export interface BambuConnectOptions {
  /** Bambu Lab account email. */
  email: string;
  /** Bambu Lab account password. Only used if `tokenStore` has no valid tokens. */
  password: string;
  /** Cloud region. Defaults to `"EU"`. */
  region?: Region;
  /**
   * Token persistence. If provided, tokens are loaded from the store on connect
   * and saved after every login or refresh. Highly recommended — without it
   * users will hit 2FA on every run.
   */
  tokenStore?: TokenStore;
  /**
   * Async callback invoked when Bambu requires a 2FA email code. Must return
   * the 6-digit code entered by the user. If omitted, connect throws when 2FA
   * is required.
   *
   * @example
   * ```ts
   * onVerifyCode: async () => {
   *   const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
   *   const code = await rl.question("2FA code: ");
   *   rl.close();
   *   return code.trim();
   * }
   * ```
   */
  onVerifyCode?: () => Promise<string>;
}

export type LoginResult =
  | { requiresVerifyCode: true; tokens?: never }
  | { requiresVerifyCode: false; tokens: BambuTokens };

/**
 * Bambu Lab cloud API client.
 *
 * Most users should use {@link BambuClient.connect} which handles the full
 * auth lifecycle (load → login → 2FA → save → auto-refresh).
 *
 * @example
 * ```ts
 * import { BambuClient, fileTokenStore } from "@crazydev/bambu";
 *
 * const client = await BambuClient.connect({
 *   email: process.env.BAMBU_EMAIL!,
 *   password: process.env.BAMBU_PASSWORD!,
 *   tokenStore: fileTokenStore(".bambu-tokens.json"),
 *   onVerifyCode: async () => prompt("2FA code: "),
 * });
 *
 * const devices = await client.devices();
 * ```
 */
export class BambuClient {
  private readonly baseUrl: string;
  private readonly region: Region;
  private readonly tokenStore: TokenStore | undefined;
  private tokens: BambuTokens;

  constructor(options: BambuClientOptions) {
    this.region = options.region ?? "EU";
    this.baseUrl = BASE_URLS[this.region];
    this.tokens = options.tokens;
    this.tokenStore = options.tokenStore;
  }

  /**
   * One-shot factory that handles the full cloud auth lifecycle:
   *
   * 1. Loads tokens from `tokenStore` (if provided)
   * 2. If absent or expired → calls {@link BambuClient.login}
   * 3. If 2FA is required → triggers {@link BambuClient.sendVerifyCode} and asks the user
   *    via `onVerifyCode`
   * 4. Saves the resulting tokens to `tokenStore`
   * 5. Returns a ready-to-use client with auto-refresh on 401
   *
   * @example
   * ```ts
   * const client = await BambuClient.connect({
   *   email, password,
   *   tokenStore: fileTokenStore(".bambu-tokens.json"),
   *   onVerifyCode: async () => prompt("2FA code: "),
   * });
   * await client.devices();
   * ```
   */
  static async connect(options: BambuConnectOptions): Promise<BambuClient> {
    const region = options.region ?? "EU";
    const store = options.tokenStore;

    const cached = await store?.load();
    if (cached && Date.now() < cached.expiresAt) {
      return new BambuClient({ region, tokens: cached, ...(store && { tokenStore: store }) });
    }

    if (cached && Date.now() < cached.refreshExpiresAt) {
      try {
        const refreshed = await BambuClient.refreshTokens(cached.refreshToken, region);
        await store?.save(refreshed);
        return new BambuClient({ region, tokens: refreshed, ...(store && { tokenStore: store }) });
      } catch {
        // fall through to full login
      }
    }

    const result = await BambuClient.login(options.email, options.password, region);
    let tokens: BambuTokens;
    if (result.requiresVerifyCode) {
      if (!options.onVerifyCode) {
        throw new Error(
          "2FA required but no `onVerifyCode` callback provided in BambuClient.connect()",
        );
      }
      await BambuClient.sendVerifyCode(options.email, region);
      const code = await options.onVerifyCode();
      tokens = await BambuClient.loginWithCode(options.email, code, region);
    } else {
      tokens = result.tokens;
    }

    await store?.save(tokens);
    return new BambuClient({ region, tokens, ...(store && { tokenStore: store }) });
  }

  /**
   * Low-level: start the cloud login flow. Returns either fresh tokens (no 2FA)
   * or a flag indicating that a verify code must be requested via
   * {@link BambuClient.sendVerifyCode} and submitted via {@link BambuClient.loginWithCode}.
   *
   * Most users should prefer {@link BambuClient.connect}.
   *
   * @example
   * ```ts
   * const result = await BambuClient.login("me@example.com", "hunter2");
   * if (result.requiresVerifyCode) {
   *   await BambuClient.sendVerifyCode("me@example.com");
   *   const tokens = await BambuClient.loginWithCode("me@example.com", code);
   * } else {
   *   const tokens = result.tokens;
   * }
   * ```
   */
  static async login(email: string, password: string, region: Region = "EU"): Promise<LoginResult> {
    const res = await unauthRequest(region, "/user-service/user/login", { account: email, password });
    if (res.accessToken) {
      return { requiresVerifyCode: false, tokens: buildTokens(res) };
    }
    if (res.loginType === "verifyCode") {
      return { requiresVerifyCode: true };
    }
    throw new Error(`Unexpected login response: ${JSON.stringify(res)}`);
  }

  /** Low-level: trigger a 2FA email containing a 6-digit verify code. */
  static async sendVerifyCode(email: string, region: Region = "EU"): Promise<void> {
    await unauthRequest(region, "/user-service/user/sendemail/code", { email, type: "codeLogin" });
  }

  /** Low-level: complete login with the 2FA code received by email. */
  static async loginWithCode(email: string, code: string, region: Region = "EU"): Promise<BambuTokens> {
    const res = await unauthRequest(region, "/user-service/user/login", { account: email, code });
    if (!res.accessToken) throw new Error("Login failed");
    return buildTokens(res);
  }

  /**
   * Low-level: exchange a refresh token for a new access token. Used internally
   * on 401 responses; you rarely need to call this directly.
   */
  static async refreshTokens(refreshToken: string, region: Region = "EU"): Promise<BambuTokens> {
    const res = await unauthRequest(region, "/user-service/user/refreshtoken", { refreshToken });
    if (!res.accessToken) throw new Error("Token refresh failed");
    return buildTokens(res);
  }

  /** List all printers bound to the account. */
  async devices(): Promise<BambuDevice[]> {
    const res = await this.authedRequest("/iot-service/api/user/bind");
    return res.devices ?? [];
  }

  /**
   * Fetch a single device by its `dev_id`. Returns `null` if not found.
   *
   * Note: Bambu's API has no per-device endpoint, so this internally calls
   * {@link devices} and filters. Cache the result if you need it repeatedly.
   *
   * @example
   * ```ts
   * const printer = await client.getDeviceById("00M09B461100094");
   * if (printer) console.log(printer.name);
   * ```
   */
  async getDeviceById(devId: string): Promise<BambuDevice | null> {
    const all = await this.devices();
    return all.find((d) => d.dev_id === devId) ?? null;
  }

  /** Live status for every device on the account. */
  async getDeviceStatuses(): Promise<BambuStatusResponse> {
    return this.authedRequest("/iot-service/api/user/print?force=true");
  }

  /**
   * Live status for a single device. Returns `null` if not found.
   *
   * Note: Bambu's API has no per-device endpoint, so this internally calls
   * {@link getDeviceStatuses} and filters.
   *
   * @example
   * ```ts
   * const status = await client.getDeviceStatusById("00M09B461100094");
   * if (status?.dev_online) console.log(status.dev_name);
   * ```
   */
  async getDeviceStatusById(devId: string): Promise<BambuDeviceStatus | null> {
    const res = await this.getDeviceStatuses();
    return res.devices.find((d) => d.dev_id === devId) ?? null;
  }

  /**
   * Fetch firmware version info and available updates for a device.
   *
   * Response shape is not documented in `api.yaml`; returned as `unknown` until
   * a real payload is captured.
   *
   * @example
   * ```ts
   * const fw = await client.getDeviceFirmwareVersion("00M09B461100094");
   * ```
   */
  async getDeviceFirmwareVersion(devId: string): Promise<unknown> {
    return this.authedRequest(
      `/iot-service/api/user/device/version?dev_id=${encodeURIComponent(devId)}`,
    );
  }

  /** List all projects bound to the account. */
  async listProjects(): Promise<BambuProject[]> {
    const res = await this.authedRequest("/iot-service/api/user/project");
    return res.projects ?? [];
  }

  /** Recent print tasks (most recent first). */
  async tasks(limit = 20): Promise<PrintTask[]> {
    const res = await this.authedRequest(`/user-service/my/tasks?limit=${limit}`);
    return res.hits ?? [];
  }

  /**
   * Fetch a single print task by its id (iot-service variant).
   *
   * Complements {@link tasks} which only returns a paginated list. The response
   * shape is undocumented in `api.yaml`, so it is returned as `unknown` until
   * a real payload is captured.
   *
   * @example
   * ```ts
   * const task = await client.getTaskById("123456789");
   * ```
   */
  async getTaskById(taskId: string): Promise<unknown> {
    return this.authedRequest(`/iot-service/api/user/task/${encodeURIComponent(taskId)}`);
  }

  /**
   * Device task notification status (badge counts on print job updates).
   *
   * Response shape is undocumented — returned as `unknown`; callers should
   * narrow it themselves until a real payload is captured.
   */
  async getDeviceTaskNotifications(): Promise<unknown> {
    return this.authedRequest("/user-service/my/message/device/taskstatus");
  }

  /**
   * List which plates of a given model instance have already been printed.
   *
   * Response shape is not documented upstream — typed as `unknown` until a real
   * payload is captured.
   *
   * @param instanceId Model instance id (integer, required).
   */
  async getPrintedPlates(instanceId: number): Promise<unknown> {
    return this.authedRequest(`/user-service/my/task/printedplates?instanceId=${instanceId}`);
  }

  /**
   * Fetch a single task from the user-service by its `taskId`.
   *
   * Note: this is the `user-service` variant of get-task-by-id. The field set
   * differs from the `iot-service` version — both endpoints expose different
   * data and may coexist in the SDK. Response shape is not documented in
   * `api.yaml`, hence the `unknown` return type.
   *
   * @example
   * ```ts
   * const task = await client.getMyTask("123456789");
   * ```
   */
  async getMyTask(taskId: string): Promise<unknown> {
    return this.authedRequest(`/user-service/my/task/${encodeURIComponent(taskId)}`);
  }

  /** Current tokens. Useful if you manage persistence yourself. */
  getTokens(): BambuTokens {
    return this.tokens;
  }

  private async authedRequest(path: string, init: RequestInit = {}): Promise<any> {
    const res = await this.doRequest(path, init);
    if (res.status !== 401) {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      return res.json();
    }

    if (Date.now() >= this.tokens.refreshExpiresAt) {
      throw new Error("Refresh token expired — full re-login required");
    }
    const refreshed = await BambuClient.refreshTokens(this.tokens.refreshToken, this.region);
    this.tokens = refreshed;
    await this.tokenStore?.save(refreshed);

    const retry = await this.doRequest(path, init);
    if (!retry.ok) throw new Error(`HTTP ${retry.status}: ${await retry.text()}`);
    return retry.json();
  }

  private doRequest(path: string, init: RequestInit): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.tokens.accessToken}`,
        ...(init.headers ?? {}),
      },
    });
  }
}
