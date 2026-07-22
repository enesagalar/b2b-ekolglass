# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3 AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
WORKDIR /app
COPY . .
ARG APP_COMMIT_SHA
ARG NEXT_PUBLIC_SITE_URL=https://portal.invalid
ENV APP_COMMIT_SHA=$APP_COMMIT_SHA
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN node -e "if(!/^[a-f0-9]{40}$/.test(process.env.APP_COMMIT_SHA)||/^0+$/.test(process.env.APP_COMMIT_SHA))process.exit(1)" \
  && npm run prisma:generate \
  && npm run build

FROM node:22-bookworm-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV MEDIA_LOCAL_ROOT=/data/media

ARG APP_COMMIT_SHA
LABEL org.opencontainers.image.title="EkolGlass B2B Portal"
LABEL org.opencontainers.image.source="https://github.com/enesagalar/b2b-ekolglass"
LABEL org.opencontainers.image.revision=$APP_COMMIT_SHA

RUN apt-get update \
  && apt-get install --no-install-recommends -y ca-certificates dumb-init \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /data/database /data/backups /data/media \
  && chown -R node:node /data /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/src ./src
COPY --from=builder --chown=node:node /app/next.config.ts ./next.config.ts

USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["sh", "-c", "node node_modules/tsx/dist/cli.mjs scripts/production-preflight.ts && node node_modules/tsx/dist/cli.mjs scripts/prepare-production-database.ts && node node_modules/tsx/dist/cli.mjs scripts/verify-migration-integrity.ts --allow-pending && node node_modules/prisma/build/index.js migrate deploy && node node_modules/tsx/dist/cli.mjs scripts/verify-migration-integrity.ts && exec node node_modules/next/dist/bin/next start"]
