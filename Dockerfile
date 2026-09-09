FROM node:22-bookworm-slim AS base

# Build tools kept as fallback for better-sqlite3 if no prebuilt binary matches.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

# Full install (incl. tsx) so the seed scripts run at container start.
COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/proposal/schemas ./proposal/schemas

RUN mkdir -p /app/data

ENV DATABASE_PATH=/app/data/chm.sqlite
EXPOSE 3000

# Seed only when the database is empty; never deletes existing data.
CMD ["sh", "-c", "npm run -s db:seed -- --if-empty && npm start"]
