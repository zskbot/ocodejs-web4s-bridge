const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;

function normalizePath(path) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    throw new TypeError("Web4s endpoint must be an absolute path beginning with one slash");
  }
  if (path.includes("\\") || path.includes("?") || path.includes("#")) {
    throw new TypeError("Web4s endpoint must be a path without query, fragment, or backslash");
  }
  for (const segment of path.split("/")) {
    let decoded;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      throw new TypeError("Web4s endpoint contains malformed URL encoding");
    }
    if (decoded === "." || decoded === ".." || decoded.includes("/") || decoded.includes("\\")) {
      throw new TypeError("Web4s endpoint contains an unsafe path segment");
    }
  }
  return path;
}

async function readLimitedBody(response, maxBytes) {
  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw Object.assign(new Error("Web4s response exceeds configured size limit"), { code: "WEB4S_RESPONSE_TOO_LARGE" });
    }
    return text;
  }

  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw Object.assign(new Error("Web4s response exceeds configured size limit"), { code: "WEB4S_RESPONSE_TOO_LARGE" });
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export function createWeb4sReadOnlyClient({
  baseUrl,
  allowedPaths = [],
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES,
  headers = {},
} = {}) {
  if (typeof baseUrl !== "string") throw new TypeError("A verified Web4s HTTPS baseUrl is required");
  const base = new URL(baseUrl);
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) {
    throw new TypeError("Web4s baseUrl must be HTTPS without credentials, query, or fragment");
  }
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
    throw new TypeError("timeoutMs must be an integer between 1 and 120000");
  }
  if (!Number.isInteger(maxResponseBytes) || maxResponseBytes < 1 || maxResponseBytes > 10_485_760) {
    throw new TypeError("maxResponseBytes must be an integer between 1 and 10485760");
  }

  const basePath = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
  const allowlist = new Set(allowedPaths.map(normalizePath));
  const safeHeaders = new Headers(headers);
  safeHeaders.set("accept", "application/json");

  return Object.freeze({
    async get(path, { query, signal } = {}) {
      const safePath = normalizePath(path);
      if (!allowlist.has(safePath)) {
        const error = new Error("Web4s endpoint is not in the verified read-only allowlist");
        error.code = "WEB4S_ENDPOINT_NOT_ALLOWED";
        throw error;
      }

      const url = new URL(safePath, base);
      if (url.origin !== base.origin ||
          !(url.pathname === base.pathname || url.pathname.startsWith(basePath))) {
        throw new Error("Web4s endpoint escaped the configured base URL");
      }
      if (query !== undefined) {
        if (!query || typeof query !== "object" || Array.isArray(query) ||
            (Object.getPrototypeOf(query) !== Object.prototype && Object.getPrototypeOf(query) !== null)) {
          throw new TypeError("query must be a plain object");
        }
        for (const [key, value] of Object.entries(query)) {
          if (value === undefined || value === null) continue;
          if (!key || !["string", "number", "boolean"].includes(typeof value) ||
              (typeof value === "number" && !Number.isFinite(value))) {
            throw new TypeError("query values must be strings, finite numbers, or booleans");
          }
          url.searchParams.set(key, String(value));
        }
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const abortFromCaller = () => controller.abort();
      signal?.addEventListener("abort", abortFromCaller, { once: true });
      if (signal?.aborted) abortFromCaller();

      try {
        const response = await fetchImpl(url, {
          method: "GET",
          headers: safeHeaders,
          redirect: "error",
          signal: controller.signal,
        });
        const declaredLength = Number(response.headers.get("content-length"));
        if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
          throw Object.assign(new Error("Web4s response exceeds configured size limit"), { code: "WEB4S_RESPONSE_TOO_LARGE" });
        }
        const text = await readLimitedBody(response, maxResponseBytes);
        if (!response.ok) {
          throw Object.assign(new Error(`Web4s returned HTTP ${response.status}`), {
            code: "WEB4S_UPSTREAM_HTTP_ERROR",
            status: response.status,
          });
        }
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("application/json")) {
          throw Object.assign(new Error("Web4s response was not JSON"), { code: "WEB4S_INVALID_CONTENT_TYPE" });
        }
        try {
          return JSON.parse(text);
        } catch {
          throw Object.assign(new Error("Web4s returned invalid JSON"), { code: "WEB4S_INVALID_JSON" });
        }
      } catch (error) {
        if (controller.signal.aborted) {
          throw Object.assign(new Error("Web4s request timed out or was aborted"), { code: "WEB4S_REQUEST_ABORTED" });
        }
        throw error;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abortFromCaller);
      }
    },
  });
}
