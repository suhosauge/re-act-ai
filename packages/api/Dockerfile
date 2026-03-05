FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json tsconfig.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/

RUN npm install --workspace=packages/api --workspace=packages/shared

COPY packages/shared/ packages/shared/
COPY packages/api/ packages/api/

RUN npm run build --workspace=packages/shared 2>/dev/null || true

FROM node:18-alpine
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npx", "tsx", "packages/api/src/server.ts"]
