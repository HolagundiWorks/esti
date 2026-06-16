#!/bin/bash
# Shared helpers for ESTI deploy scripts (source from setup-vps.sh / bootstrap.sh).

# Strip scheme, path, commas, whitespace — nginx server_name wants a bare hostname.
normalize_domain() {
  local d="${1:-}"
  d="${d#https://}"
  d="${d#http://}"
  d="${d%%/*}"
  d="${d%%,*}"
  d="$(printf '%s' "$d" | tr -d '[:space:]')"
  printf '%s' "$d"
}

validate_domain() {
  local d="$1"
  if [[ -z "$d" ]]; then
    echo "Domain name is required (hostname only, e.g. aorms.in)." >&2
    return 1
  fi
  if [[ "$d" == *"/"* ]] || [[ "$d" == *":"* ]]; then
    echo "Domain must be a hostname only — no https://, ports, or paths (got: '$d')." >&2
    return 1
  fi
  if ! [[ "$d" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]]; then
    echo "Invalid domain hostname: '$d'." >&2
    return 1
  fi
  return 0
}

install_nginx_site() {
  local domain="$1"
  local deploy_dir="$2"
  local nginx_conf="/etc/nginx/sites-available/esti"

  validate_domain "$domain" || return 1

  cp "$deploy_dir/deploy/nginx-proxy.conf" "$nginx_conf"
  sed -i "s|DOMAIN_PLACEHOLDER|${domain}|g" "$nginx_conf"
  sed -i "s|DEPLOY_DIR_PLACEHOLDER|${deploy_dir}|g" "$nginx_conf"
  ln -sf "$nginx_conf" /etc/nginx/sites-enabled/esti
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl reload nginx
}
