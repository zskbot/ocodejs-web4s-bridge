const optional = (env, name) => env[name]?.trim() || undefined;

export function loadConfig(env = process.env) {
  const accessToken = env.BRIDGE_ACCESS_TOKEN?.trim();
  if (!accessToken || accessToken.length < 32) {
    throw new Error("BRIDGE_ACCESS_TOKEN must be set and contain at least 32 characters");
  }

  const rawPort = env.PORT?.trim() || "3000";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  const apiBaseUrl = optional(env, "WEB4S_API_BASE_URL");
  if (apiBaseUrl) {
    let parsed;
    try {
      parsed = new URL(apiBaseUrl);
    } catch {
      throw new Error("WEB4S_API_BASE_URL must be a valid HTTPS URL");
    }
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error("WEB4S_API_BASE_URL must use HTTPS without credentials, query, or fragment");
    }
  }

  return Object.freeze({
    host: env.HOST?.trim() || "0.0.0.0",
    port,
    accessToken,
    apiBaseUrl,
    publicKey: optional(env, "WEB4S_PUBLIC_KEY"),
    secretKey: optional(env, "WEB4S_SECRET_KEY"),
  });
}
