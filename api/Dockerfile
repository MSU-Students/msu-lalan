FROM node:22-alpine AS development

WORKDIR /app

# Copy root workspace configurations
COPY package.json package-lock.json* ./
COPY api/package.json ./api/
COPY client/package.json ./client/

# Install dependencies
RUN npm install

# Copy API source
COPY api/ ./api/

WORKDIR /app/api

EXPOSE 3001

CMD ["npm", "run", "start:dev"]
