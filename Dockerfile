# syntax=docker/dockerfile:1

# ---- base: dependencias instaladas una sola vez, reusadas por dev y build ----
FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- dev: servidor de Vite con hot-reload (usado por docker-compose) ----
# El código fuente se monta como bind mount en compose; esta copia solo cubre
# el caso de construir la imagen standalone (docker build --target dev).
FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---- build: compila el bundle de producción ----
FROM base AS build
COPY . .
RUN npm run build

# ---- production: nginx sirviendo el build estático ----
FROM nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
