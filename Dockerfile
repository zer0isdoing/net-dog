FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:18-alpine

WORKDIR /app

RUN apk upgrade --no-cache

COPY backend/package*.json ./
RUN npm install --only=production

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 3001

CMD ["node", "src/server.js"]
