# NeuroXLearn Node API + Nunjucks UI
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY server ./server
COPY static ./static
COPY templates ./templates
EXPOSE 5000
CMD ["node", "server/server.js"]
