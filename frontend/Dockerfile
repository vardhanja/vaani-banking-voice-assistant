# syntax=docker/dockerfile:1.7

# Build stage
FROM node:20-slim AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
# If you have a package-lock.json, uncomment the next line
# COPY package-lock.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Copy the entrypoint into the build image so it can be carried into the final image
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Production stage
FROM node:20-slim AS production

WORKDIR /app

# Install serve to run the application
RUN npm install -g serve

# Copy the build output from the build stage
COPY --from=build /app/dist ./dist

# Copy entrypoint script from build stage into production image and make it executable
COPY --from=build /app/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose the port the app will run on
EXPOSE 3000

# Start the application via entrypoint which injects runtime env and runs serve
CMD ["/bin/sh", "/app/docker-entrypoint.sh"]
