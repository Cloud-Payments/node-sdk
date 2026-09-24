# Contributing

## Setup

```bash
npm install
npm run check   # typecheck + lint + format check + tests with coverage
npm run build   # ESM + CJS + type declarations in dist/
```

Node 22 or newer is required. `.nvmrc` pins the version used in CI.

## Scripts

| Script                  | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `npm test`              | Run the unit tests once.                             |
| `npm run test:watch`    | Watch mode.                                          |
| `npm run test:coverage` | Tests with the 100% coverage gate.                   |
| `npm run typecheck`     | `tsc --noEmit` over `src`, `test` and `examples`.    |
| `npm run lint`          | ESLint (type-aware).                                 |
| `npm run format`        | Prettier.                                            |
| `npm run docs:api`      | Generate the TypeDoc API reference into `docs/api/`. |

## Guidelines

- **Coverage is 100% and enforced.** Every new branch needs a unit test. Unit tests mock `fetch`
  through the client's `fetch` option and never touch the network.
- **Add an integration test for every new endpoint** in `test/integration/`. Integration tests
  run against the sandbox configured in `.env`, must clean up what they create, and must use
  `skipIfUnavailable` for features that an account may not have enabled.
- **Mirror the gateway API.** Request and response field names stay snake_case and match the
  gateway reference. Add an endpoint by (1) adding types in `src/types`, (2) adding a method on
  the matching resource in `src/resources`, (3) testing the HTTP method, path, query and body,
  (4) documenting it in `docs/` and, if user-facing, in `README.md`.
- **Keep the SDK white-label.** Do not hard-code gateway hostnames or brand names.
- **Never log or serialise secrets.** API keys, card numbers and webhook secrets must not appear in
  error messages or logs.
- Public APIs need JSDoc comments; unknown gateway fields are additive, so prefer optional
  properties over breaking changes.
- Update `CHANGELOG.md` and bump `VERSION` in `src/version.ts` together with `package.json`.

## Releasing

1. Update `CHANGELOG.md`, `package.json` and `src/version.ts`.
2. `npm run check && npm run build`.
3. Tag the release and `npm publish` (`prepublishOnly` re-runs the checks).
