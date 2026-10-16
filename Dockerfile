FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server/ ./server/

EXPOSE 7860
ENV PORT=7860

CMD ["node", "server/index.cjs"]
