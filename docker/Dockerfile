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
RUN groupadd --gid 1001 gaos \
  && useradd --uid 1001 --gid gaos --create-home gaos \
  && chown -R gaos:gaos /app
USER gaos
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||'8080')+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "packages/workshop-api/dist/server.js"]
