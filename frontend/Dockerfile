FROM node:22-alpine AS builder

WORKDIR /app

# Accept build arguments
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY

# Set environment variables for the build process
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM nginx:alpine

ARG VITE_API_URL

# Copy built assets to Nginx html folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración propia: puerto 3000, SPA fallback y cabeceras de seguridad (CSP en Report-Only).
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf

# Inyectar el origen de la API (esquema + host) en connect-src de la CSP.
RUN API_ORIGIN="$(echo "${VITE_API_URL:-}" | grep -oE '^https?://[^/]+' || true)" \
    && sed -i "s#__API_ORIGIN__#${API_ORIGIN}#" /etc/nginx/snippets/security-headers.conf \
    && nginx -t

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
