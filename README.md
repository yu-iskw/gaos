# gaos

A thin workshop for private apps. A person chats. An agent writes a gadget. That gadget runs with no ambient network.

The workshop kernel is `@gaos/workshop-api`. The agent loop is Mastra in `@gaos/agent-host`. Isolation is `@gaos/sandbox`. The SPA is `@gaos/workshop-web`.

## Getting Started

### Prerequisites

- [pnpm](https://pnpm.io/) **11.x** (see `packageManager` in `package.json`; use [Corepack](https://nodejs.org/api/corepack.html): `corepack enable`)
- Node.js **22+** (see `engines` in `package.json`; `.node-version` pins the version used for local dev and CI)
- Docker Engine (compose and the local sandbox adapter)

Dependency installs follow pnpm 11 supply-chain settings in [`pnpm-workspace.yaml`](pnpm-workspace.yaml): **minimum release age** (this repo uses a **7-day** quarantine, stricter than pnpm’s built-in 24-hour default), **blocking exotic transitive dependencies**, and an **`allowBuilds`** allowlist for packages that run install scripts.

Linting and formatting use [Trunk](https://trunk.io/) (ESLint, Prettier, and more). The Trunk **launcher** is installed with project dependencies.

### Installation

```bash
pnpm install
```

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

End-to-end against compose:

```bash
docker compose up -d --build --wait
pnpm test:e2e:smoke
pnpm test:e2e
pnpm test:e2e:web
```

The smoke suite checks `/health`. The core-loop suite covers signup, proposal via the agent host, live preview of `client.js`, accept/revert, a workshop-proxied gadget RPC, isolation (`reachedApi` stays false), a second chat, and connector minting. Compose does not prove Cloud Run isolation. `pnpm test:e2e:web` runs Playwright aria snapshots of workshop-web against compose; it is not the Vitest HTTP e2e.

### Linting & Formatting

```bash
pnpm lint
pnpm format
```

## Project Structure

- `packages/sandbox`: isolation port (`DockerSandbox` locally, `CloudRunSandbox` on Cloud Run)
- `packages/workshop-api`: workshop kernel (Postgres, Cap'n Web, AgentPort, connector minting)
- `packages/workshop-web`: SPA (Cap'n Web `/rpc`, iframes uncommitted `client.js`)
- `packages/agent-host`: Mastra agent process (never imports `workshop-*`)
- `deploy/`: Cloud Run + Cloud SQL shape (not emulated by compose)
- `e2e/`: compose contract

## License

Apache-2.0
