FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html/portal
RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  listen [::]:80;' \
  '  server_name _;' \
  '  root /usr/share/nginx/html;' \
  '  index /portal/index.html;' \
  '  location /portal/ { try_files $uri $uri/ /portal/index.html; }' \
  '  location = /health { access_log off; return 200 "ok"; add_header Content-Type text/plain; }' \
  '}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
