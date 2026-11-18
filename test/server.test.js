import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/server.js";
import { loadConfig } from "../src/config.js";

const token = "t".repeat(40);
const config = {
  host: "127.0.0.1",
  port: 3000,
  accessToken: token,
  publicKey: "pk_test_public",
  secretKey: "sk_test_secret",
};

test("health endpoint is public and sends no-store headers", async () => {
  const app = createServer(config);
  try {
    const response = await app.inject({ method: "GET", url: "/health" });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().service, "ocodejs-web4s-bridge");
    assert.equal(response.headers["cache-control"], "no-store");
    assert.equal(response.headers["x-content-type-options"], "nosniff");
  } finally {
    await app.close();
  }
});

test("status endpoint rejects missing and invalid bearer tokens", async () => {
  const app = createServer(config);
  try {
    assert.equal((await app.inject({ method: "GET", url: "/api/v1/status" })).statusCode, 401);
    assert.equal((await app.inject({
      method: "GET",
      url: "/api/v1/status",
      headers: { authorization: "Bearer wrong-token" },
    })).statusCode, 401);
  } finally {
    await app.close();
  }
});

test("status endpoint returns presence flags but never credential values", async () => {
  const app = createServer(config);
  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/status",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().credentials, {
      publicKeyConfigured: true,
      secretKeyConfigured: true,
      apiBaseUrlConfigured: false,
    });
    assert.equal(response.body.includes("sk_test_secret"), false);
    assert.equal(response.body.includes("pk_test_public"), false);
  } finally {
    await app.close();
  }
});

test("rejects a missing or short bridge access token", () => {
  assert.throws(() => loadConfig({}), /BRIDGE_ACCESS_TOKEN/);
  assert.throws(() => loadConfig({ BRIDGE_ACCESS_TOKEN: "short" }), /at least 32 characters/);
});

test("rejects non-HTTPS upstream URLs", () => {
  assert.throws(
    () => loadConfig({ BRIDGE_ACCESS_TOKEN: token, WEB4S_API_BASE_URL: "http://example.com" }),
    /must use HTTPS/,
  );
});

test("rejects credentials, query strings, and fragments in upstream base URLs", () => {
  for (const url of [
    "https://user:pass@example.com",
    "https://example.com?token=secret",
    "https://example.com#fragment",
  ]) {
    assert.throws(
      () => loadConfig({ BRIDGE_ACCESS_TOKEN: token, WEB4S_API_BASE_URL: url }),
      /without credentials, query, or fragment/,
    );
  }
});

test("validates port range and defaults to 3000", () => {
  assert.equal(loadConfig({ BRIDGE_ACCESS_TOKEN: token }).port, 3000);
  assert.equal(loadConfig({ BRIDGE_ACCESS_TOKEN: token, PORT: "8080" }).port, 8080);
  for (const port of ["0", "65536", "3.14", "abc"]) {
    assert.throws(
      () => loadConfig({ BRIDGE_ACCESS_TOKEN: token, PORT: port }),
      /PORT must be an integer/,
    );
  }
});
