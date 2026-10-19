FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build-only

FROM nginx:1.29-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/40-tmdb-key.sh /docker-entrypoint.d/40-tmdb-key.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
