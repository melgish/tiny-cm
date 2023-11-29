FROM node:21-alpine AS base
# Create app folder tree and grant permissions to node user.
RUN mkdir -p /app/service /app/data/ \
 && chown -R node:node /app
WORKDIR /app/service

# Install production dependencies.
FROM base AS deps
USER node:node
COPY package*.json ./
RUN npm ci --omit=dev --omit=optional --ignore-scripts

FROM base AS builder
COPY . .
RUN npm ci --ignore-scripts && npm run build

FROM base AS runner
USER node:node
COPY --from=deps /app/service ./
COPY --from=builder /app/service/lib/ ./lib
CMD ["node", "./lib/app.js"]
