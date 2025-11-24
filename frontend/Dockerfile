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

# Production stage
FROM node:20-slim AS production

WORKDIR /app

# Install serve to run the application
RUN npm install -g serve

# Copy the build output from the build stage
COPY --from=build /app/dist ./dist

# Expose the port the app will run on
EXPOSE 3000

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]
