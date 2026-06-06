# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm for this image
RUN corepack enable && corepack prepare pnpm@8.10.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
