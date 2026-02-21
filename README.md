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
| [logfx-cloudwatch](./packages/logfx-cloudwatch) | 1.0.0 | AWS CloudWatch Logs integration |
| [logfx-google-cloud](./packages/logfx-google-cloud) | 1.0.0 | Google Cloud Logging integration |
| [logfx-azure](./packages/logfx-azure) | 1.0.0 | Azure Monitor Log Analytics integration |
| [logfx-slack](./packages/logfx-slack) | 1.0.0 | Slack webhook integration |
| [logfx-loki](./packages/logfx-loki) | 1.0.0 | Grafana Loki integration |
| [logfx-papertrail](./packages/logfx-papertrail) | 1.0.0 | Papertrail integration |
| [logfx-splunk](./packages/logfx-splunk) | 1.0.0 | Splunk HEC integration |

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
