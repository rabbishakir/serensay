# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS prod-deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p /app/.next/cache/images /app/public/uploads/inventory /app/uploads/inventory \
  && chown -R nextjs:nextjs /app/.next /app/public/uploads /app/uploads

USER nextjs
EXPOSE 3000

CMD ["npm", "run", "start"]
