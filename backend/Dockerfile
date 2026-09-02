# Backend API + workers. Deployable to Railway / Render / Fly / any container host.
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/server.js"]
