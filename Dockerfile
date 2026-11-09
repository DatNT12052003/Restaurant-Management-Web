# syntax=docker/dockerfile:1
# Giai đoạn 14: image web production. Build React bằng Node, phục vụ bằng nginx (kèm proxy /api và /socket.io).
# Mặc định gọi API cùng tên miền (/api), nên một image dùng được cho mọi môi trường.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_SOCKET_URL=${VITE_SOCKET_URL}
RUN npm run build

FROM nginx:1.27-alpine
ENV BACKEND_UPSTREAM=backend:3000
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
