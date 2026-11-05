FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV VITE_DEMO_MODE=true
ARG SOURCE_SHA=unknown
RUN npm run build
RUN node -e "const fs = require('node:fs'); const commit = process.env.SOURCE_SHA; if (commit !== 'unknown' && !/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid source SHA'); fs.writeFileSync('dist/build-info.json', JSON.stringify({ commit }));"

FROM nginxinc/nginx-unprivileged:stable-alpine
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
RUN nginx -t
EXPOSE 8080