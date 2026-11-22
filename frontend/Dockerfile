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

# Copy built assets to Nginx html folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom config: serves the SPA and proxies /api/ to the backend over the internal Docker
# network, so the browser never needs a host-specific API URL. Templated (not copied straight
# to conf.d) so nginx's own entrypoint runs envsubst on it at container start, filling in
# BACKEND_HOST/BACKEND_PORT — docker-compose's service name "backend" by default, but a
# different value (e.g. another container's own address) wherever the services aren't on one
# docker-compose network. NGINX_ENVSUBST_FILTER restricts substitution to just those two names,
# so nginx's own runtime variables ($host, $remote_addr, etc.) are never touched.
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV BACKEND_HOST=backend
ENV BACKEND_PORT=4000
ENV NGINX_ENVSUBST_FILTER=^BACKEND_

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
