FROM node:22-alpine AS development

WORKDIR /app

# Copy root workspace configs
COPY package.json package-lock.json* ./
COPY api/package.json ./api/
COPY client/package.json ./client/

# Install dependencies
RUN npm install

# Copy client source
COPY client/ ./client/

WORKDIR /app/client

EXPOSE 3000

CMD ["npm", "run", "dev"]
