# Cloud Run deploy (Goal 5)

Compose remains the default proof. This directory is the production shape. It is not emulated locally. `DockerSandbox` cannot run inside Cloud Run. `CloudRunSandbox` wraps `/usr/local/gcp/bin/sandbox` and is only present after `--sandbox-launcher`.

## workshop-api

Gen2 service. Sandboxes share this container's CPU and RAM. First deploy keeps **max-instances=1** because a detached gadget lives on one instance. Session affinity is best-effort. Request timeout is 3600s. Clients must reconnect.

```bash
gcloud beta run deploy gaos-workshop-api \
  --image=IMAGE \
  --sandbox-launcher \
  --timeout=3600 \
  --session-affinity \
  --max-instances=1 \
  --cpu=2 \
  --memory=2Gi \
  --no-cpu-throttling \
  --set-env-vars=DATABASE_URL=CLOUD_SQL_URL,AGENT_URL=https://gaos-agent-host,INTERNAL_TOKEN=SECRET,GAOS_GADGET_SOCKET_ROOT=/tmp/gaos-gadgets,GAOS_SANDBOX=cloudrun \
  --add-cloudsql-instances=PROJECT:REGION:INSTANCE
```

YAML: [workshop-api.yaml](workshop-api.yaml).

## agent-host

Separate service. Mastra only. No sandbox launcher. Fixture `GAOS_MODEL=fixture` is for compose, not production.

```bash
gcloud run deploy gaos-agent-host \
  --image=IMAGE \
  --timeout=3600 \
  --max-instances=2 \
  --set-env-vars=WORKSHOP_URL=https://gaos-workshop-api,INTERNAL_TOKEN=SECRET,GAOS_MODEL=google/gemini-2.5-flash
```

## Cloud SQL

Postgres is the only cross-instance state. Recreate gadgets after instance death with files or `sandbox tar` / `--import-tar`. Affinity does not guarantee the same instance.

## Isolation

Gadget sandboxes must not pass `--allow-egress`. `createCloudRunSandbox` throws if `allowEgress` is true, and the unit test asserts the `sandbox run` argv never includes that flag. Compose e2e proves Docker isolation (`reachedApi === false`). Live Cloud Run proof is the same spawn on a `--sandbox-launcher` service: the gadget must not reach the workshop API or metadata.

```bash
# After deploy, the workshop-api Cloud Run service with GAOS_SANDBOX=cloudrun
# must spawn gadgets through createCloudRunSandbox. Confirm:
# 1. cloud-run-sandbox.test.ts refuses --allow-egress (CI).
# 2. A live gadget's isolation-result.json has reachedApi=false.
```

## Identity-Aware Proxy

Set `GAOS_IAP_AUDIENCE` on workshop-api (the IAP JWT audience). `/health` stays open; every other request requires `x-goog-iap-jwt-assertion`. Compose leaves the env unset. The SPA Providers page reads `VITE_IAP_AUDIENCE`.

## Connectors and Secret Manager

Minting stays in workshop-api. In production, `GAOS_CONNECTOR_SECRET_<VENDOR>` (Secret Manager → Cloud Run env) is stored on the connector row and sent as `Authorization` when invoking MCP. Gadgets never mint.

## Cloud Scheduler

`POST /internal/schedules/fire` with the internal bearer token runs a stored schedule. Point a Cloud Scheduler HTTP job at that path.

## Context library

Documents persist in Cloud SQL. When `GAOS_CONTEXT_BUCKET` is set, bodies are also written to GCS at `gs://$BUCKET/context/<id>`.
