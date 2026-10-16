FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build TypeScript
COPY . .
RUN npm run build

# Expose Fastify port
EXPOSE 5000

# Run ledger migrations and start the server
CMD ["sh", "-c", "npm run db:migrate && npm start"]
