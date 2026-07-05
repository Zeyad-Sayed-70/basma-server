#!/bin/bash
# Basma — one-time Nginx + SSL setup on VPS
# Run as root: sudo bash setup-nginx-ssl.sh

set -e

echo "=== Basma Nginx + SSL setup ==="

# ─── 1. Install certbot ─────────────────────────────────
echo "--- Installing certbot ---"
apt-get update -qq
apt-get install -y -qq certbot python3-certbot-nginx

# ─── 2. Create webroot for ACME challenge ───────────────
mkdir -p /var/www/html

# ─── 3. Write temporary HTTP-only nginx config ──────────
# (certbot will add SSL blocks automatically)
echo "--- Writing temporary HTTP-only nginx config ---"
cat > /etc/nginx/sites-available/basma.pro << 'NGINX'
# ─── Frontend (Next.js SSR on port 3100) ───────────────
server {
    listen 80;
    listen [::]:80;
    server_name basma.pro www.basma.pro;

    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# ─── API (NestJS on port 3099) ─────────────────────────
server {
    listen 80;
    listen [::]:80;
    server_name api.basma.pro;

    client_max_body_size 500M;

    location /.well-known/acme-challenge/ { root /var/www/html; }
    location /assets/ {
        proxy_pass http://127.0.0.1:9002/basma-assets/;
        proxy_set_header Host 127.0.0.1:9002;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location / {
        proxy_pass http://127.0.0.1:3099;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3099;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}

# ─── Wildcard teacher subdomains (HTTP-only for now) ───
server {
    listen 80;
    listen [::]:80;
    server_name *.basma.pro;

    client_max_body_size 500M;

    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / {
        proxy_pass http://127.0.0.1:3099;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3099;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
NGINX

# ─── 4. Enable the site ─────────────────────────────────
ln -sf /etc/nginx/sites-available/basma.pro /etc/nginx/sites-enabled/basma.pro

# ─── 5. Test and reload nginx ───────────────────────────
echo "--- Testing nginx config ---"
nginx -t
echo "--- Reloading nginx ---"
systemctl reload nginx

# ─── 6. Provision SSL certs ─────────────────────────────
echo ""
echo "=== Provisioning SSL certificates ==="
echo "Make sure DNS A records point to this VPS:"
echo "  basma.pro       -> VPS IP"
echo "  www.basma.pro   -> VPS IP"
echo "  api.basma.pro   -> VPS IP"
echo ""
read -p "Press Enter to continue (or Ctrl+C to abort)..."

echo "--- Running certbot for basma.pro www.basma.pro api.basma.pro ---"
certbot --nginx \
  -d basma.pro \
  -d www.basma.pro \
  -d api.basma.pro \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --redirect

echo "--- Reloading nginx ---"
systemctl reload nginx

# ─── 7. Done ────────────────────────────────────────────
echo ""
echo "=== DONE ==="
echo "SSL certificates provisioned for:"
echo "  - https://basma.pro"
echo "  - https://www.basma.pro"
echo "  - https://api.basma.pro"
echo ""
echo "Teacher subdomains (*.basma.pro) are HTTP-only for now."
echo "To get wildcard SSL, either:"
echo "  1. Switch DNS to Cloudflare (free, automatic SSL)"
echo "  2. Run: certbot certonly --manual --preferred-challenges dns -d *.basma.pro"
echo "     (requires adding a TXT record in Hostinger DNS)"
echo ""
echo "Certbot will auto-renew via systemd timer (certbot.timer)."
