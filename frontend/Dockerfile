FROM node:22-alpine AS builder

WORKDIR /app

# Accept build arguments
ARG VITE_API_URL

# Set environment variables for the build process
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM nginx:alpine

# Copy built assets to Nginx html folder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000
# We will use our reverse proxy for routing, but this container serves its own static files on 3000 if accessed directly
# Nginx default config listens on 80. Let's make it listen on 3000 to match the compose.
RUN sed -i 's/80/3000/g' /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
