FROM node:20-alpine

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./
RUN npm install

# Copy source code and build
COPY backend/ ./
RUN npm run build

EXPOSE 5000

# Run migrations and launch Fastify
CMD ["sh", "-c", "npm run db:migrate && npm start"]
