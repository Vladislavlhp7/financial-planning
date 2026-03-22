import axios, { type AxiosRequestConfig } from "axios";

export type CustomFetchOptions = RequestInit & {
  responseType?: "json" | "text" | "blob" | "auto";
};

export type ErrorType<T = unknown> = ApiError<T>;

export type BodyType<T> = T;

function getStringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  if (typeof candidate !== "string") return undefined;
  const trimmed = candidate.trim();
  return trimmed === "" ? undefined : trimmed;
}

function truncate(text: string, maxLength = 300): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function buildErrorMessage(status: number, statusText: string, data: unknown): string {
  const prefix = `HTTP ${status} ${statusText}`;
  if (typeof data === "string") {
    const text = data.trim();
    return text ? `${prefix}: ${truncate(text)}` : prefix;
  }
  const title = getStringField(data, "title");
  const detail = getStringField(data, "detail");
  const message =
    getStringField(data, "message") ??
    getStringField(data, "error_description") ??
    getStringField(data, "error");
  if (title && detail) return `${prefix}: ${title} — ${detail}`;
  if (detail) return `${prefix}: ${detail}`;
  if (message) return `${prefix}: ${message}`;
  if (title) return `${prefix}: ${title}`;
  return prefix;
}

export class ApiError<T = unknown> extends Error {
  readonly name = "ApiError";
  readonly status: number;
  readonly statusText: string;
  readonly data: T | null;
  readonly headers: Headers;
  readonly response: Response;
  readonly method: string;
  readonly url: string;

  constructor(
    response: Response,
    data: T | null,
    requestInfo: { method: string; url: string },
  ) {
    super(buildErrorMessage(response.status, response.statusText, data));
    Object.setPrototypeOf(this, new.target.prototype);
    this.status = response.status;
    this.statusText = response.statusText;
    this.data = data;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
  }
}

export class ResponseParseError extends Error {
  readonly name = "ResponseParseError";
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly response: Response;
  readonly method: string;
  readonly url: string;
  readonly rawBody: string;
  readonly cause: unknown;

  constructor(
    response: Response,
    rawBody: string,
    cause: unknown,
    requestInfo: { method: string; url: string },
  ) {
    super(
      `Failed to parse response from ${requestInfo.method} ${response.url || requestInfo.url} ` +
        `(${response.status} ${response.statusText}) as JSON`,
    );
    Object.setPrototypeOf(this, new.target.prototype);
    this.status = response.status;
    this.statusText = response.statusText;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
    this.rawBody = rawBody;
    this.cause = cause;
  }
}

const api = axios.create({
  headers: { "Content-Type": "application/json", Accept: "application/json, application/problem+json" },
});

export async function customFetch<T = unknown>(
  input: RequestInfo | URL,
  options: CustomFetchOptions = {},
): Promise<T> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
  const method = (options.method ?? "GET").toUpperCase();

  if (options.body != null && (method === "GET" || method === "HEAD")) {
    throw new TypeError(`customFetch: ${method} requests cannot have a body.`);
  }

  const headerRecord = { ...((options.headers as Record<string, string>) ?? {}) };
  if (url.includes("/export.csv")) {
    headerRecord.Accept = "text/csv, */*";
  }

  const config: AxiosRequestConfig = {
    url,
    method: method as "get" | "post" | "put" | "patch" | "delete" | "head",
    data: options.body,
    headers: headerRecord,
    signal: options.signal ?? undefined,
  };

  if (options.responseType === "blob") {
    config.responseType = "blob";
  } else if (options.responseType === "text") {
    config.responseType = "text";
  } else if (url.includes("/export.csv")) {
    config.responseType = "blob";
  }

  try {
    const response = await api.request(config);
    return response.data as T;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      const res = err.response;
      const headers = new Headers();
      if (res.headers && typeof res.headers === "object") {
        for (const [k, v] of Object.entries(res.headers)) {
          if (typeof v === "string") headers.set(k, v);
        }
      }
      const fakeResponse = {
        status: res.status,
        statusText: res.statusText ?? "",
        headers,
        url: res.config?.url ?? url,
      } as Response;
      throw new ApiError(fakeResponse, res.data ?? null, { method, url });
    }
    throw err;
  }
}
