FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Install bash (Debian way)
RUN apt-get update && apt-get install -y bash && rm -rf /var/lib/apt/lists/*

# Ensure data and scripts dirs exist
RUN mkdir -p data && \
    chmod +x scripts/*.sh 2>/dev/null || true

# Install PM2
RUN npm install -g pm2

EXPOSE 3001

CMD ["pm2-runtime", "src/index.js", "--name", "shim"]