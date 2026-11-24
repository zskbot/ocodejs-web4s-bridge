# Web4s read-only client foundation

This module is transport infrastructure only. It does not encode Nhân Hòa's authentication scheme, endpoint names, payload schemas, pagination model, or tenant identifiers.

## Safety properties

- HTTPS base URL only; URL credentials, query strings, and fragments are rejected.
- Exact-path allowlist is mandatory. An empty allowlist denies every request.
- The only supported HTTP method is GET. There is no generic request method or write API.
- Redirects are rejected to prevent credential forwarding to another origin.
- Requests have a bounded timeout and response-size limit.
- Responses must be JSON. HTTP errors do not expose upstream response bodies.
- Authentication headers, if later required, must be supplied by a server-side adapter after the official partner specification is verified. Never pass secrets from browser code.

## Activation gate

Do not instantiate this client against the production Web4s account until all of the following are confirmed from account-specific Nhân Hòa documentation/support:

1. The actual Web4s platform version assigned to `ocodejs.id.vn`.
2. The official HTTPS API base URL for that version and tenant.
3. The documented authentication protocol, key usage, signing rules, and required headers.
4. Exact read-only endpoint paths and required query parameters.
5. Response schemas, pagination, rate limits, and error semantics.
6. A sandbox/test tenant or written approval for safe read-only testing.

After verification, add only exact documented GET paths to `allowedPaths`, add schema validators for each response, and test using synthetic fixtures before connecting account credentials.

## Example (synthetic only)

```js
const client = createWeb4sReadOnlyClient({
  baseUrl: "https://api.example.invalid/v1/",
  allowedPaths: ["/v1/pages"], // synthetic example, not a Nhân Hòa endpoint
});
```

Do not copy the synthetic hostname or path into production configuration.
