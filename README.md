# OCodeJS Web4s Bridge

Server-side integration boundary between OCodeJS and the Nhân Hòa Web4s partner API.

## Current status

This is a **read-only bootstrap**. It does not send requests to Web4s. The partner documentation link supplied earlier could not be retrieved reliably, so no upstream base URL, endpoint, HTTP method, payload, or write permission is assumed.

## Web4s platform compatibility

Nhân Hòa announced Web4s 5.0 as the replacement platform effective 15 October 2026. Its published transition notice states that new feature development on legacy versions stops from that date, ordinary bug fixes stop from 1 February 2027, security patching stops from 1 June 2027, and legacy service operation ends on 1 January 2028.

This public notice does **not** identify the version currently running on `ocodejs.id.vn`, nor does it establish that the partner API credentials or endpoints are compatible with Web4s 5.0. Confirm the account's actual platform version and obtain the matching API specification before implementing upstream calls.

Source: [Nhân Hòa — Web4s platform transition notice](https://web4s.vn/thong-bao-chuyen-doi-phien-ban-website.html).

See [the integration readiness gate](docs/web4s-integration-readiness.md) for the required verification checklist.

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

Provide sanitized partner API documentation covering the account's Web4s version, base URL, authentication, endpoint list, request/response examples, rate limits, sandbox, and documented read/write scopes. Implement only verified operations.
