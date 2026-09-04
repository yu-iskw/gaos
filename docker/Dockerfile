FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.0.5 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/sandbox/package.json packages/sandbox/package.json
COPY packages/workshop-api/package.json packages/workshop-api/package.json
COPY packages/agent-host/package.json packages/agent-host/package.json
COPY packages/workshop-web/package.json packages/workshop-web/package.json
RUN pnpm install --frozen-lockfile
COPY . .
ENV VITE_PUBLIC_API_URL=http://localhost:8080
RUN pnpm --recursive build

FROM node:22-slim
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production
CMD ["node", "packages/workshop-api/dist/server.js"]
