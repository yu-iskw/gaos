# gaos

A public template for a company workshop on Google Cloud. People chat with an agent that writes private apps. Those apps run in a sandbox. Agents that host tools are a separate product that shares the sandbox, not the workshop kernel.

The agent runtime is Mastra. The workshop kernel is not.

## Language

**Workshop**:
The trusted app where a person chats, reviews proposed gadget code, and runs gadgets.
_Avoid_: Agent Platform, kernel-as-Cloud-Run, OS, Mastra (the workshop is not a Mastra app)

**Agent host**:
A separate HTTP process that runs Mastra. It does not import the workshop. The workshop talks to it only through an agent port.
_Avoid_: Agent Runtime, Agent Engine, overseer, embedding Mastra in the SPA

**Mastra**:
The TypeScript agent framework used by the agent host. Agents, tools, and memory live here. A Mastra DockerSandbox may back the local sandbox port; gadgets do not.
_Avoid_: ADK, Agent Identity, LangGraph, Mastra Platform, Agent Builder

**Gadget**:
One person's private running app. It has a client UI and a server. It has no ambient network.
_Avoid_: tenant, microservice, worker, Durable Object, Mastra Workspace (a workspace is the isolation backend, not the app)

**Sandbox**:
Our port. Callers see one interface. Local compose may use Mastra `DockerSandbox` as the adapter. That adapter talks to Docker Engine and cannot run inside Cloud Run. Production uses a different adapter (Cloud Run sandbox CLI or a custom provider). Never `LocalSandbox` for untrusted gadget code. Never Mastra's Cloudflare sandbox provider.
_Avoid_: isolate, WorkerLoader, gVisor (unless naming the local backend), running DockerSandbox on Cloud Run

**Connector**:
A named capability the workshop or agent host mediates. A vendor cannot make itself ambient.
_Avoid_: gatekeeper, MCP server (those are implementations)

**Binding**:
A name in an env map that points at a connector or a gadget. Chat bindings, gadget bindings, and ambient records are three maps. They are not one map.
_Avoid_: env var, secret, service binding

**Proposal**:
Uncommitted gadget files and bindings created in a chat. The person accepts or reverts. Live preview shows the proposal. Other chats do not.
_Avoid_: branch, worktree, OT, merge (unless naming git later)

**Agent port**:
The workshop's HTTP interface to the agent host. The host is Mastra. The workshop does not import `@mastra/core`.
_Avoid_: ADK, Agent Identity, in-process Agent class in workshop-api

**Workspace**:
The unit that holds gadgets, chats, and connectors for one owner.
_Avoid_: gadget (the API in Cloudflare OS used this word for workspaces)
