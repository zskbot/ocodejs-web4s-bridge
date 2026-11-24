import test from "node:test";
import assert from "node:assert/strict";
import { createWeb4sReadOnlyClient } from "../src/web4s-client.js";

const base = "https://api.example.invalid/v1/";
const jsonResponse = (body = { items: [] }) => new Response(JSON.stringify(body), {
  status: 200,
  headers: { "content-type": "application/json" },
});

test("only explicitly allowlisted GET endpoints are callable", async () => {
  let captured;
  const client = createWeb4sReadOnlyClient({
    baseUrl: base,
    allowedPaths: ["/v1/pages"],
    fetchImpl: async (url, options) => {
      captured = { url: String(url), options };
      return jsonResponse();
    },
  });
  assert.deepEqual(await client.get("/v1/pages", { query: { page: 2 } }), { items: [] });
  assert.equal(captured.options.method, "GET");
  assert.equal(captured.options.redirect, "error");
  assert.equal(new URL(captured.url).searchParams.get("page"), "2");
  await assert.rejects(client.get("/v1/users"), { code: "WEB4S_ENDPOINT_NOT_ALLOWED" });
});

test("rejects insecure base URLs and unsafe or non-path allowlist entries", () => {
  assert.throws(() => createWeb4sReadOnlyClient({ baseUrl: "http://api.example.invalid" }));
  for (const path of ["/v1/../admin", "/v1/%2e%2e/admin", "/v1/%2Fadmin", "/v1/pages?admin=true", "/v1/pages#fragment"]) {
    assert.throws(() => createWeb4sReadOnlyClient({ baseUrl: base, allowedPaths: [path] }));
  }
});

test("rejects invalid query object shapes and non-scalar values", async () => {
  const client = createWeb4sReadOnlyClient({
    baseUrl: base,
    allowedPaths: ["/v1/pages"],
    fetchImpl: async () => jsonResponse(),
  });
  await assert.rejects(client.get("/v1/pages", { query: ["unexpected"] }), /plain object/);
  await assert.rejects(client.get("/v1/pages", { query: { filter: { role: "admin" } } }), /query values/);
  await assert.rejects(client.get("/v1/pages", { query: { page: Number.NaN } }), /query values/);
});

test("rejects non-JSON upstream responses", async () => {
  const client = createWeb4sReadOnlyClient({
    baseUrl: base,
    allowedPaths: ["/v1/pages"],
    fetchImpl: async () => new Response("html", {
      status: 200,
      headers: { "content-type": "text/html" },
    }),
  });
  await assert.rejects(client.get("/v1/pages"), { code: "WEB4S_INVALID_CONTENT_TYPE" });
});

test("rejects malformed JSON upstream responses", async () => {
  const client = createWeb4sReadOnlyClient({
    baseUrl: base,
    allowedPaths: ["/v1/pages"],
    fetchImpl: async () => new Response("{not-json", {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  });
  await assert.rejects(client.get("/v1/pages"), { code: "WEB4S_INVALID_JSON" });
});

test("rejects oversized upstream responses", async () => {
  const client = createWeb4sReadOnlyClient({
    baseUrl: base,
    allowedPaths: ["/v1/pages"],
    maxResponseBytes: 4,
    fetchImpl: async () => jsonResponse({ ok: true }),
  });
  await assert.rejects(client.get("/v1/pages"), { code: "WEB4S_RESPONSE_TOO_LARGE" });
});

test("surfaces upstream HTTP errors without returning response bodies", async () => {
  const client = createWeb4sReadOnlyClient({
    baseUrl: base,
    allowedPaths: ["/v1/pages"],
    fetchImpl: async () => new Response("private upstream detail", { status: 503 }),
  });
  await assert.rejects(client.get("/v1/pages"), { code: "WEB4S_UPSTREAM_HTTP_ERROR", status: 503 });
});

test("aborts requests that exceed the configured timeout", async () => {
  const client = createWeb4sReadOnlyClient({
    baseUrl: base,
    allowedPaths: ["/v1/pages"],
    timeoutMs: 5,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }),
  });
  await assert.rejects(client.get("/v1/pages"), { code: "WEB4S_REQUEST_ABORTED" });
});

test("enforces base URL path boundaries instead of accepting sibling prefixes", async () => {
  let requestedUrl;
  const client = createWeb4sReadOnlyClient({
    baseUrl: "https://api.example.invalid/v1",
    allowedPaths: ["/v10/pages"],
    fetchImpl: async (url) => {
      requestedUrl = String(url);
      return jsonResponse();
    },
  });
  await assert.rejects(client.get("/v10/pages"), /escaped the configured base URL/);
  assert.equal(requestedUrl, undefined);
});
