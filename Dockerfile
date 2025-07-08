# 1. Base Image: Use a specific version of Node.js on Alpine for a small and secure base.
FROM node:20-alpine AS base

# 2. Dependencies Stage: Install dependencies in a separate layer to leverage Docker's cache.
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json ./
# Use `npm install` because a lock file is not present.
RUN npm install

# 3. Builder Stage: Build the Next.js application.
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The Next.js build process does not require environment variables to be set at build time
# for this specific app, as they are used in Server Actions at runtime.

RUN npm run build

# 4. Runner Stage: Create the final, small production image.
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# You can set the port at runtime by passing the PORT environment variable.
# ENV PORT 3000

# Automatically create a non-root user and group for security.
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone output from the builder stage.
# This includes only the necessary files to run the app.
COPY --from=builder /app/public ./public
# The standalone output creates a `server.js` file for running the app.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# The `server.js` file is created by the standalone build output
CMD ["node", "server.js"]
