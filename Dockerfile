# 1. Builder Stage
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Copy package.json
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the Next.js application
RUN npm run build

# 2. Runner Stage
FROM node:20-slim AS runner

# Set working directory
WORKDIR /app

# Set environment to production
ENV NODE_ENV production

# Install production dependencies
COPY --from=builder /app/package.json ./
RUN npm install --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./next.config.ts

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
