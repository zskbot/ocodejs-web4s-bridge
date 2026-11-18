import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/server.js";
import { loadConfig } from "../src/config.js";

const TOKEN = "test-bridge-token-that-is-at-least-32-chars";
const validEnv = {
  BRIDGE_ACCESS_TOKEN: TOKEN,
  PORT: "3000",
  HOST: "127.0.0.1",
  WEB4S_API_BASE_URL: "https://partner.example.invalid/api/",
  WEB4S_PUBLIC_KEY: "public-test-value",
  WEB4S_SECRET_KEY: "secret-test-value",
};

async function withServer(run, config = loadConfig(validEnv)) {
  const app = createServer(config);
  try {
    await run(app);
  } finally {
    await app.close();
  }
}

test("loadConfig requires a sufficiently long bridge access token", () => {
  assert.throws(() => loadConfig({ BRIDGE_ACCESS_TOKEN: "short" }), /at least 32 characters/);
  assert.throws(() => loadConfig({}), /BRIDGE_ACCESS_TOKEN/);
});

test("loadConfig validates port bounds and integer format", () => {
  for (const PORT of ["0", "65536", "3.5", "abc"]) {
    assert.throws(() => loadConfig({ ...validEnv, PORT }), /PORT must be an integer/);
  }
  assert.equal(loadConfig({ ...validEnv, PORT: "65535" }).port, 65535);
});

test("loadConfig rejects insecure or credential-bearing upstream URLs", () => {
  for (const WEB4S_API_BASE_URL of [
    "http://partner.example.invalid/api/",
    "https://user:pass@partner.example.invalid/api/",
    "https://partner.example.invalid/api/?token=secret",
    "https://partner.example.invalid/api/#fragment",
  ]) {
    assert.throws(
      () => loadConfig({ ...validEnv, WEB4S_API_BASE_URL }),
      /WEB4S_API_BASE_URL must use HTTPS/,
    );
  }
});

test("health endpoint is public and includes defensive response headers", async () => {
  await withServer(async (app) => {
    const response = await app.inject({ method: "GET", url: "/health" });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().ok, true);
    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.equal(response.headers["x-frame-options"], "DENY");
    assert.equal(response.headers["referrer-policy"], "no-referrer");
    assert.equal(response.headers["cache-control"], "no-store");
  });
});

test("status endpoint rejects missing and invalid bearer credentials", async () => {
  await withServer(async (app) => {
    for (const headers of [{}, { authorization: "Bearer wrong-token" }, { authorization: "Basic abc" }]) {
      const response = await app.inject({ method: "GET", url: "/api/v1/status", headers });
      assert.equal(response.statusCode, 401);
      assert.deepEqual(response.json(), { error: "unauthorized" });
    }
  });
});

test("status endpoint returns configuration booleans only and keeps upstream disabled", async () => {
  await withServer(async (app) => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/status",
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.deepEqual(body.credentials, {
      publicKeyConfigured: true,
      secretKeyConfigured: true,
      apiBaseUrlConfigured: true,
    });
    assert.equal(body.integration.upstreamRequestsEnabled, false);
    assert.doesNotMatch(response.body, /public-test-value|secret-test-value|partner\.example/);
  });
});

test("unknown routes return a stable 404 response", async () => {
  await withServer(async (app) => {
    const response = await app.inject({ method: "GET", url: "/not-a-route" });
    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.json(), { error: "not_found" });
  });
});

test("server does not expose write routes", async () => {
  await withServer(async (app) => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const response = await app.inject({ method, url: "/api/v1/status" });
      assert.equal(response.statusCode, 404);
    }
  });
});
