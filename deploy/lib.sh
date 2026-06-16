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

# Docker Compose project name from compose.prod.yaml (name: esti-aorms-prod).
esti_compose_network() {
  printf '%s' "esti-aorms-prod_esti-network"
}

# Create the documents bucket before backend startup (idempotent).
ensure_minio_bucket() {
  local deploy_dir="${1:-.}"
  local bucket="${S3_BUCKET:-esti-documents}"
  local access="${S3_ACCESS_KEY:-esti}"
  local secret="${S3_SECRET_KEY:-}"

  [[ -n "$secret" ]] || { echo "S3_SECRET_KEY is empty — cannot configure MinIO." >&2; return 1; }

  cd "$deploy_dir"
  sleep 3
  docker run --rm --network "$(esti_compose_network)" \
    minio/mc:latest sh -c "
      mc alias set local http://esti-minio:9000 '${access}' '${secret}' --quiet &&
      mc mb --ignore-existing local/${bucket}
    "
}

wait_for_backend_health() {
  local attempts="${1:-30}"
  local delay="${2:-2}"
  local code="000"
  for _ in $(seq 1 "$attempts"); do
    code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/health 2>/dev/null || echo "000")
    [[ "$code" == "200" ]] && return 0
    sleep "$delay"
  done
  echo "Backend /health returned HTTP ${code} after ${attempts} attempts." >&2
  return 1
}
