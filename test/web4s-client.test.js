import test from "node:test";
import assert from "node:assert/strict";
import { createWeb4sReadOnlyClient } from "../src/web4s-client.js";

const base = "https://api.example.invalid/v1/";

test("only explicitly allowlisted GET endpoints are callable", async () => {
  let captured;
  const client = createWeb4sReadOnlyClient({
    baseUrl: base,
    allowedPaths: ["/v1/pages"],
    fetchImpl: async (url, options) => {
      captured = { url: String(url), options };
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });
  assert.deepEqual(await client.get("/v1/pages", { query: { page: 2 } }), { items: [] });
  assert.equal(captured.options.method, "GET");
  assert.equal(captured.options.redirect, "error");
  assert.equal(new URL(captured.url).searchParams.get("page"), "2");
  await assert.rejects(client.get("/v1/users"), { code: "WEB4S_ENDPOINT_NOT_ALLOWED" });
});

test("rejects non-HTTPS base URLs and unsafe paths", () => {
  assert.throws(() => createWeb4sReadOnlyClient({ baseUrl: "http://api.example.invalid" }));
  assert.throws(() => createWeb4sReadOnlyClient({ baseUrl: base, allowedPaths: ["/v1/../admin"] }));
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

test("rejects oversized upstream responses", async () => {
  const client = createWeb4sReadOnlyClient({
    baseUrl: base,
    allowedPaths: ["/v1/pages"],
    maxResponseBytes: 4,
    fetchImpl: async () => new Response('{"ok":true}', {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
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
