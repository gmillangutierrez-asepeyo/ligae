# Stage 1: Builder
# Install dependencies and build the project
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package.json and install all dependencies
COPY package.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the Next.js application
RUN npm run build

# Stage 2: Runner
# Create the final, smaller production image
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV production

# Copy package.json and install only production dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy the built application from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

# Expose the port the app runs on
EXPOSE 3000

# The command to start the application
CMD ["npm", "start"]
