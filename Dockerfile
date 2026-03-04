FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock ./
COPY client/package.json client/
COPY server/package.json server/
RUN bun install --frozen-lockfile

COPY client/ client/
COPY tsconfig.json ./
RUN cd client && bun run build

FROM oven/bun:1
WORKDIR /app

COPY --from=base /app/node_modules node_modules/
COPY --from=base /app/server/node_modules server/node_modules/
COPY --from=base /app/client/dist client/dist/
COPY server/ server/

ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "run", "server/src/index.ts"]
