FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package*.json ./

RUN mkdir -p /app/logs && chown -R apiuser:nodejs /app/logs

USER apiuser

EXPOSE 3000

CMD ["node", "src/index.js"]
