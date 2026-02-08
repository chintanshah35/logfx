# Changelog

## [1.0.0] - 2026-02-08

### Added

**Core Features:**
- Monorepo structure with pnpm workspaces
- Retry logic with exponential backoff and jitter
- Circuit breaker pattern for webhook transport
- Dead letter queue with disk persistence
- Browser sendBeacon transport for reliable page unload logging
- Multi-region failover with health checks
- PII pattern detection (email, SSN, credit card, phone, IP, JWT)
- Custom PII redaction with masking functions
- Trace context support (W3C TraceParent format)
- Lazy evaluation for performance optimization
- Custom log levels support

**Integration Packages:**
- `logfx-otel`: OpenTelemetry integration
- `logfx-sentry`: Sentry error tracking
- `logfx-datadog`: Datadog APM integration
- `logfx-elasticsearch`: Elasticsearch logging

**Transports:**
- Console transport with pretty and JSON formats
- File transport with rotation
- Webhook transport with retry, circuit breaker, and DLQ
- Beacon transport for browser (sendBeacon API)

**Reliability:**
- Automatic retry with configurable backoff strategies
- Circuit breaker with half-open state
- Dead letter queue with overflow strategies
- Multi-region failover with round-robin and priority strategies
- Health checks for endpoints

**Security & Privacy:**
- Automatic PII detection and redaction
- Custom redaction patterns
- Masking functions for sensitive data
- Key-based and path-based redaction

**Observability:**
- W3C trace context propagation
- Trace ID and span ID generation
- OpenTelemetry integration
- Request ID tracking

**Performance:**
- Lazy evaluation to avoid expensive computations
- Batching and buffering
- Async logging with configurable buffer
- Tree-shaking support

### Changed
- Renamed `onFull` to `overflow` for DLQ (industry standard)
- Renamed `halfOpenRequests` to `halfOpenMaxCalls` for circuit breaker
- Improved regex patterns for PII detection

### Breaking Changes
- Moved from single package to monorepo structure
- Updated minimum Node.js version to 18+
- Changed some option names for industry standard alignment

## [0.5.0] - Previous releases

See git history for previous changes.
