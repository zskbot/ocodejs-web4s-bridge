# OCodeJS Web4s Bridge

Server-side integration boundary between OCodeJS and the Nhân Hòa Web4s partner API.

## Current status

This is a **read-only bootstrap**. It does not send requests to Web4s. The partner documentation link supplied earlier could not be retrieved reliably, so no upstream base URL, endpoint, HTTP method, payload, or write permission is assumed.

## Runtime

- Node.js 22+ and Fastify 5
- No database required for bootstrap
- Secrets remain server-side

## Environment

Copy `.env.example` to `.env` and set `BRIDGE_ACCESS_TOKEN` (random, at least 32 characters). Set `WEB4S_API_BASE_URL` only after verifying the official HTTPS base URL. `WEB4S_PUBLIC_KEY` and `WEB4S_SECRET_KEY` are server-side only; never expose the secret key to browser code or logs. Do not store partner documentation access tokens in source control. Rotate exposed documentation links.

## Endpoints

- `GET /health`: public liveness check, no credential details.
- `GET /api/v1/status`: protected by `Authorization: Bearer <BRIDGE_ACCESS_TOKEN>`; returns boolean credential-presence flags only.

No Web4s upstream calls or mutation endpoints are implemented until official API documentation is verified.

## Local development

```sh
npm install
cp .env.example .env
npm run dev
```

## Safety model

No generic HTTP proxy, arbitrary URL forwarding, browser exposure of secrets, or write operations. Add endpoint-specific schemas, allowlists, audit events, and tests before enabling mutations.

## Next gate

Provide sanitized partner API documentation covering base URL, authentication, endpoint list, request/response examples, rate limits, and documented write scopes. Implement only verified operations.
