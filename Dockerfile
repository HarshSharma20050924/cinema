FROM node:20-slim

# Install system dependencies & Cloudflare tunnel
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    procps \
    && curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared \
    && chmod +x /usr/local/bin/cloudflared \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server/ ./server/
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Default port 7860 matches Hugging Face Spaces & cloud platforms
EXPOSE 7860
ENV PORT=7860
ENV NODE_ENV=production

ENTRYPOINT ["./entrypoint.sh"]
