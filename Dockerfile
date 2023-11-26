FROM node:20-alpine AS base
# Create app folder tree and grant permissions to node user.
RUN mkdir -p /app/service /app/data/ \
 && chown -R node:node /app
WORKDIR /app/service
USER node:node

# Install production dependencies.
FROM base as deps
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev --omit=optional

FROM base as builder
COPY . .
RUN npm ci && npm run build

FROM base as runner
COPY --chown=node:node --from=deps /app/service ./
COPY --chown=node:node --from=builder /app/service/lib/ ./lib
CMD ["node", "./lib/app.js"]
