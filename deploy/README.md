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

Gadget sandboxes must not pass `--allow-egress`. Compose e2e does not prove Cloud Run isolation.
