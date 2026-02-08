# logfx

Production-ready logging for JavaScript and TypeScript.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [logfx](./packages/logfx) | 1.0.0 | Core logging library (zero dependencies) |
| [logfx-otel](./packages/logfx-otel) | 1.0.0 | OpenTelemetry integration |
| [logfx-sentry](./packages/logfx-sentry) | 1.0.0 | Sentry error tracking integration |
| [logfx-datadog](./packages/logfx-datadog) | 1.0.0 | Datadog APM integration |
| [logfx-elasticsearch](./packages/logfx-elasticsearch) | 1.0.0 | Elasticsearch logging integration |

## Development

```bash
# Install dependencies
npm install --prefix packages/logfx

# Run tests
npm test --prefix packages/logfx

# Build
npm run build --prefix packages/logfx
```

## License

MIT
