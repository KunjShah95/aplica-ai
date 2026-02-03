FROM node:20-alpine AS builder

WORKDIR /app

COPY dashboard/package*.json ./dashboard/
WORKDIR /app/dashboard
RUN npm ci

COPY dashboard/ ./
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dashboard/dist /usr/share/nginx/html
COPY dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
