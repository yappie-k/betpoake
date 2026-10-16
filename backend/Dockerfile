FROM node:20-alpine

WORKDIR /app

# Install dependencies relative to /backend context
COPY package*.json ./
RUN npm install --include=dev

# Copy source code relative to /backend context and compile
COPY . ./
RUN npm run build

EXPOSE 5000

# Run migrations and launch Fastify
CMD ["sh", "-c", "npm run db:migrate && npm start"]
