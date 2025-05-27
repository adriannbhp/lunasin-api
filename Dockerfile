# Stage 1: Build aplikasi
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package.json dan package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy semua source code
COPY . .

# Build aplikasi NestJS (TypeScript ke JavaScript)
RUN npm run build

# Stage 2: Image produksi
FROM node:18-alpine
WORKDIR /app

# Copy package.json dan package-lock.json lagi
COPY package*.json ./

# Install hanya dependencies produksi
RUN npm install --only=production

# Copy hasil build dari stage builder
COPY --from=builder /app/dist ./dist

# Expose port yang akan dipakai Cloud Run (port 8080 umum dipakai)
EXPOSE 8080

# Jalankan aplikasi di port yang diberikan environment variable PORT (default 8080)
CMD ["node", "dist/main.js"]
