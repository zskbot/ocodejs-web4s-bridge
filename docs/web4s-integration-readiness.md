# Web4s integration readiness gate

This checklist is a hard gate for implementing upstream API calls. The bridge remains read-only until the unknowns below are verified against Nhân Hòa's documentation for this exact website account.

## 1. Confirm the platform version

Nhân Hòa's public transition notice says Web4s 5.0 became the replacement platform on 15 October 2026. It also publishes these milestones for legacy versions:

| Milestone | Published date |
|---|---|
| Stop new feature development | 15 October 2026 |
| Stop ordinary bug fixes | 1 February 2027 |
| Stop security patching | 1 June 2027 |
| End legacy service operation | 1 January 2028 |

Source: https://web4s.vn/thong-bao-chuyen-doi-phien-ban-website.html

These dates are platform-wide notice details. They do not prove which version is currently assigned to `ocodejs.id.vn`. Obtain written confirmation from Nhân Hòa for the account and ask whether its API credentials, endpoint paths, scopes, and rate limits differ between versions.

## 2. Required vendor documentation

Obtain a sanitized copy of the official partner API specification with:

- Exact API base URL and supported platform version.
- Authentication header format and key roles.
- Read-only endpoint list, HTTP methods, required scopes, and response schemas.
- Pagination, filtering, rate limits, and timeout guidance.
- Sandbox/test environment and sample test credentials, if available.
- Error response format and retry guidance.
- Webhook signature verification, if webhooks are supported.
- Explicit write scopes and any approval requirements.

Do not include live keys, account passwords, customer data, or the documentation access token in this repository or in issue comments.

## 3. Safe implementation sequence

1. Validate the base URL and authentication scheme from the vendor specification.
2. Implement a fixed allowlist of read-only endpoints; no arbitrary URL forwarding.
3. Add request and response schemas, timeouts, response-size limits, and rate-limit handling.
4. Redact authorization headers and sensitive fields from logs.
5. Test only against a vendor sandbox or documented non-production endpoint.
6. Verify returned data shape and permissions before considering any write capability.

## 4. Production write gate

No create, update, delete, publish, theme, CSS, JavaScript, or content mutation endpoint may be enabled until the exact endpoint, payload, permission scope, rollback strategy, and user approval are documented. No Production request is made by this readiness checklist.

## 5. Vendor support

Use the support contact listed in the official transition notice: web@nhanhoa.com. Ask for the platform version attached to `ocodejs.id.vn` and the corresponding partner API documentation.
