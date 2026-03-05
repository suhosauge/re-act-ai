FROM node:18-alpine AS builder
WORKDIR /app

COPY packages/ui/package.json ./
RUN npm install

COPY packages/ui/ .

ENV NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws

RUN npm run build

FROM node:18-alpine
WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
