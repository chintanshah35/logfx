# Local Integration Testing

Test Datadog and Elasticsearch integrations locally.

## Connecting to Elasticsearch

**Step 1: Start Elasticsearch** (requires Docker)
```bash
docker compose up -d
```

**Step 2: Wait for readiness** (~30 seconds)
```bash
curl http://localhost:9200
# Expect JSON with "tagline" : "You Know, for Search"
```

**Step 3: Run the test script**
```bash
ES_NODE=http://localhost:9200 npx tsx scripts/test-local.ts
```

The transport posts to `{ES_NODE}/_bulk`. Base URL `http://localhost:9200` works (/_bulk is appended automatically).

## Prerequisites

**Elasticsearch** needs Docker. If not installed: [Install Docker Desktop](https://docs.docker.com/get-docker/).

**Build packages** (from repo root, optional if using tsx with source):
```bash
npm run build
```

## Run Tests

**Datadog only** (API key from datadoghq.com):
```bash
DD_API_KEY=your_key npx tsx scripts/test-local.ts
```

**Elasticsearch only**:
```bash
ES_NODE=http://localhost:9200 npx tsx scripts/test-local.ts
```

**Both**:
```bash
DD_API_KEY=your_key ES_NODE=http://localhost:9200 npx tsx scripts/test-local.ts
```

## Verify Results

**Datadog:** Logs → Search for "Local test started"

**Elasticsearch:**
```bash
curl "http://localhost:9200/logfx-test/_search?pretty"
```

## Stop Elasticsearch

```bash
docker compose down
```
