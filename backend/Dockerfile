FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Ensure data and scripts dirs exist; make scripts executable
RUN mkdir -p data && \
    chmod +x scripts/*.sh 2>/dev/null || true

RUN apk add --no-cache bash && npm install -g pm2

EXPOSE 3001

CMD ["pm2-runtime", "src/index.js", "--name", "shim"]
