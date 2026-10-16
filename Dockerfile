FROM node:20-alpine

WORKDIR /app

# Copy package definitions
COPY backend/package*.json ./

# Install ALL packages (including TypeScript) even if NODE_ENV=production
RUN npm install --include=dev

# Copy backend source code and compile
COPY backend/ ./
RUN npm run build

EXPOSE 5000

# Run migrations and launch Fastify
CMD ["sh", "-c", "npm run db:migrate && npm start"]
