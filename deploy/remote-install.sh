#!/usr/bin/env bash
# Runs on the VPS (as root), invoked by scripts/deploy.mjs after it uploads to /tmp/eproc2text/.
# Only touches /var/www/eproc2text, /etc/nginx/sites-{available,enabled}/eproc2text.duque.cloud
# and the eproc2text.duque.cloud certificate. Every nginx change is validated with `nginx -t`
# and rolled back on failure, so the other sites on this nginx are never left broken.
set -euo pipefail

DOMAIN=eproc2text.duque.cloud
SITE=/var/www/eproc2text
STAGE=/tmp/eproc2text
AVAIL=/etc/nginx/sites-available/$DOMAIN
ENABLED=/etc/nginx/sites-enabled/$DOMAIN
CERT=/etc/letsencrypt/live/$DOMAIN/fullchain.pem

log() { printf '[eproc2text] %s\n' "$*"; }

# Installs $1 as the vhost; restores the previous one (or removes ours) if nginx rejects it
install_vhost() {
	local src=$1 backup=""
	if [[ -f $AVAIL ]]; then
		backup=$(mktemp)
		cp "$AVAIL" "$backup"
	fi
	install -m 0644 "$src" "$AVAIL"
	ln -sfn "$AVAIL" "$ENABLED"
	if ! nginx -t; then
		log "nginx -t falhou; revertendo vhost de $DOMAIN"
		if [[ -n $backup ]]; then
			cp "$backup" "$AVAIL"
		else
			rm -f "$ENABLED" "$AVAIL"
		fi
		nginx -t && systemctl reload nginx
		exit 1
	fi
	[[ -n $backup ]] && rm -f "$backup"
	systemctl reload nginx
}

# 1. Publish dist/ atomically
log "publicando arquivos em $SITE/html"
mkdir -p "$SITE"
rm -rf "$SITE/html.new"
mkdir "$SITE/html.new"
tar -xzf "$STAGE/dist.tgz" -C "$SITE/html.new"
# Windows tar does not record Unix modes
find "$SITE/html.new" -type d -exec chmod 755 {} +
find "$SITE/html.new" -type f -exec chmod 644 {} +
chown -R www-data:www-data "$SITE/html.new"
test -f "$SITE/html.new/index.html"
rm -rf "$SITE/html.old"
[[ -d $SITE/html ]] && mv "$SITE/html" "$SITE/html.old"
mv "$SITE/html.new" "$SITE/html"

# 2. First run only: HTTP-only vhost so certbot can validate, then issue the certificate
if [[ ! -f $CERT ]]; then
	server_ip=$(curl -4 -fsS https://api.ipify.org || true)
	dns_ip=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1 {print $1}' || true)
	if [[ -z $dns_ip || $dns_ip != "$server_ip" ]]; then
		log "DNS de $DOMAIN aponta para '${dns_ip:-nada}', esperado '$server_ip'."
		log "Crie o registro A (e AAAA) na Hostinger e rode o deploy de novo."
		exit 2
	fi
	log "emitindo certificado Let's Encrypt para $DOMAIN"
	bootstrap=$(mktemp)
	cat >"$bootstrap" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    location ^~ /.well-known/acme-challenge/ {
        root $SITE/html;
        default_type text/plain;
    }
    location / {
        return 404;
    }
}
EOF
	install_vhost "$bootstrap"
	rm -f "$bootstrap"
	certbot certonly --webroot -w "$SITE/html" -d "$DOMAIN" \
		--non-interactive --agree-tos --keep-until-expiring
fi

# 3. Final vhost (HTTPS + headers)
log "instalando vhost final"
install_vhost "$STAGE/$DOMAIN.conf"

rm -rf "$STAGE"
log "ok"
