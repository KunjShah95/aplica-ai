FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run db:generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.env.example ./.env.example

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 alpicia

USER alpicia

EXPOSE 3000 3001 3002

ENV API_PORT=3000
ENV WS_PORT=3001
ENV OPENAI_API_PORT=3002

CMD ["node", "dist/index.js"]
