/**
 * JWT-authenticated client for developer account and billing endpoints.
 *
 * The flat-method {@link AethexAI} client carries an `X-API-Key` header and
 * reaches the `/api/v1/{agents,calls,…}` routes. The `/api/v1/billing/*` and
 * `/api/v1/auth/me` routes instead require a developer-JWT bearer token
 * (`Authorization: Bearer <jwt>`) issued by the dashboard sign-in flow.
 *
 * `DeveloperClient` is the JWT counterpart:
 *
 * ```ts
 * import { DeveloperClient } from "aethexai";
 *
 * const dev = new DeveloperClient({
 *   accessToken: "eyJhbGciOi...",
 *   refreshToken: "eyJhbGciOi...", // optional; enables auto-refresh on 401
 * });
 * const balance = await dev.getBalance();
 * ```
 *
 * Token-refresh contract: when an authenticated request gets a 401, the client
 * transparently calls `POST /api/v1/auth/refresh` with the stored refresh
 * token, swaps the access token, and retries the original request once. If the
 * refresh fails (or no refresh token was provided) the original
 * `AuthenticationError` surfaces.
 */
import { type Client, type DefaultAny, createInstanceClient, readEnv } from "./_core";
import {
  APIConnectionError,
  APITimeoutError,
  AuthenticationError,
  mapStatusToError,
} from "./errors";
import {
  createPaymentMethodSetupIntentApiV1BillingPaymentMethodSetupIntentPost,
  deleteMeApiV1AuthMeDelete,
  detachTenantPaymentMethodApiV1BillingPaymentMethodsPaymentMethodIdDelete,
  getBalanceApiV1BillingBalanceGet,
  getMeApiV1AuthMeGet,
  listPlansApiV1BillingPlansGet,
  listTenantInvoicesApiV1BillingInvoicesGet,
  listTenantPaymentMethodsApiV1BillingPaymentMethodsGet,
  listTransactionsApiV1BillingTransactionsGet,
  logoutApiV1AuthLogoutPost,
  refreshApiV1AuthRefreshPost,
  selectPlanApiV1BillingPlansSlugSelectPost,
  updateMeApiV1AuthMePatch,
} from "./_generated/sdk.gen";
import type { DeveloperUpdate, SelectPlanRequest } from "./_generated/types.gen";

const DEFAULT_BASE_URL = "https://api.aethexai.com";
const DEFAULT_TIMEOUT_MS = 30_000;

export interface DeveloperClientOptions {
  /** Developer JWT access token. Falls back to `AETHEX_DEVELOPER_ACCESS_TOKEN`. */
  accessToken?: string;
  /** Optional refresh token; enables auto-refresh on 401. Falls back to `AETHEX_DEVELOPER_REFRESH_TOKEN`. */
  refreshToken?: string;
  /** API base URL. Defaults to `https://api.aethexai.com`. */
  baseURL?: string;
  /** Per-request timeout in milliseconds. Defaults to 30000. */
  timeout?: number;
  /** Custom fetch implementation. Defaults to `globalThis.fetch`. */
  fetch?: typeof fetch;
}

/** Cursor-paginated list params for billing reads. */
export interface CursorParams {
  cursor?: string | null;
  pageSize?: number;
}

export class DeveloperClient {
  readonly baseURL: string;
  private readonly client: Client;
  private refreshToken: string;

  constructor(options: DeveloperClientOptions = {}) {
    const accessToken = options.accessToken ?? readEnv("AETHEX_DEVELOPER_ACCESS_TOKEN") ?? "";
    if (!accessToken.trim()) {
      throw new AuthenticationError(
        "accessToken is required. Pass accessToken or set the " +
          "AETHEX_DEVELOPER_ACCESS_TOKEN env var. Obtain one by completing the " +
          "magic-link or Google sign-in flow at developers.aethexai.com.",
        { code: "authentication_error", statusCode: 401 },
      );
    }
    this.refreshToken = options.refreshToken ?? readEnv("AETHEX_DEVELOPER_REFRESH_TOKEN") ?? "";
    this.baseURL = (options.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.client = createInstanceClient({
      baseUrl: this.baseURL,
      headers: { Authorization: `Bearer ${accessToken}` },
      timeoutMs: options.timeout ?? DEFAULT_TIMEOUT_MS,
      fetch: options.fetch,
    });
  }

  /**
   * Try to refresh the access token via the stored refresh token. Returns true
   * on success (rotating the new tokens into place), false otherwise. Any
   * exception during the refresh is swallowed and surfaces as false.
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;
    try {
      const res = await refreshApiV1AuthRefreshPost({
        client: this.client,
        body: { refresh_token: this.refreshToken },
      });
      if (!res.response?.ok) return false;
      const tokens = res.data as { access_token?: string; refresh_token?: string } | undefined;
      const accessToken = tokens?.access_token;
      if (!accessToken) return false;
      this.client.setConfig({ headers: { Authorization: `Bearer ${accessToken}` } });
      if (tokens?.refresh_token) this.refreshToken = tokens.refresh_token;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run a generated op, refreshing + retrying once on 401. Mirrors the shared
   * {@link callOp} but adds the refresh-and-retry step.
   */
  private async call<T>(
    op: (options: any) => Promise<{ data?: T; error?: unknown; response?: Response }>,
    options: Record<string, any> = {},
  ): Promise<DefaultAny<T>> {
    let res = await op({ ...options, client: this.client });
    if (!res.response) this.throwTransport(res.error);
    if (res.response.ok) return res.data as DefaultAny<T>;
    if (res.response.status === 401 && (await this.refreshAccessToken())) {
      res = await op({ ...options, client: this.client });
      if (!res.response) this.throwTransport(res.error);
      if (res.response.ok) return res.data as DefaultAny<T>;
    }
    throw mapStatusToError(res.response.status, res.error as any, res.response.headers);
  }

  private throwTransport(error: unknown): never {
    const name = (error as { name?: string } | null)?.name;
    if (name === "TimeoutError" || name === "AbortError") throw new APITimeoutError();
    throw new APIConnectionError(undefined, { cause: error });
  }

  // ------------------------------------------------------------- Account

  /** Get the current developer's profile. */
  getMe() {
    return this.call(getMeApiV1AuthMeGet);
  }

  /** Update the current developer's profile. */
  updateMe(body: DeveloperUpdate) {
    return this.call(updateMeApiV1AuthMePatch, { body });
  }

  /** Delete the current developer account. */
  async deleteMe(): Promise<void> {
    await this.call(deleteMeApiV1AuthMeDelete);
  }

  /** Invalidate the current session server-side. */
  async logout(): Promise<void> {
    await this.call(logoutApiV1AuthLogoutPost);
  }

  // ------------------------------------------------------------- Billing

  /** Get account credit balance. */
  getBalance() {
    return this.call(getBalanceApiV1BillingBalanceGet);
  }

  /** List available billing plans. */
  listPlans() {
    return this.call(listPlansApiV1BillingPlansGet);
  }

  /**
   * Select a billing plan by slug. The body is optional — `slug` is the only
   * required input; omit `body` to default to monthly billing.
   */
  selectPlan(slug: string, body?: SelectPlanRequest | null) {
    return this.call(selectPlanApiV1BillingPlansSlugSelectPost, {
      path: { slug },
      body: body ?? null,
    });
  }

  /** List tenant invoices (cursor-paginated). */
  listInvoices(params: CursorParams = {}) {
    return this.call(listTenantInvoicesApiV1BillingInvoicesGet, {
      query: { cursor: params.cursor ?? null, page_size: params.pageSize ?? 25 },
    });
  }

  /** List billing transactions (cursor-paginated). */
  listTransactions(params: CursorParams = {}) {
    return this.call(listTransactionsApiV1BillingTransactionsGet, {
      query: { cursor: params.cursor ?? null, page_size: params.pageSize ?? 25 },
    });
  }

  /** List saved payment methods (cards). */
  listPaymentMethods() {
    return this.call(listTenantPaymentMethodsApiV1BillingPaymentMethodsGet);
  }

  /** Create a Stripe SetupIntent for attaching a new payment method. */
  createPaymentMethodSetupIntent() {
    return this.call(createPaymentMethodSetupIntentApiV1BillingPaymentMethodSetupIntentPost);
  }

  /** Detach a saved payment method by id. */
  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    await this.call(detachTenantPaymentMethodApiV1BillingPaymentMethodsPaymentMethodIdDelete, {
      path: { payment_method_id: paymentMethodId },
    });
  }
}
