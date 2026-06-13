#!/usr/bin/env bash
set -euo pipefail

# Standard VPS deployment helper for ORI CRUIT HUB.
# Run from the repository root on the production host.

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env}"

if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "Compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
  echo "Environment file not found: ${ENV_FILE}" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required on the production host." >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required on the production host." >&2
  exit 1
fi

RELEASE_SHA="$(git rev-parse --short HEAD)"

sync_release_in_env() {
  local release="$1"

  if grep -q '^APP_RELEASE=' "${ENV_FILE}"; then
    sed -i "s/^APP_RELEASE=.*/APP_RELEASE=${release}/" "${ENV_FILE}"
  else
    printf '\nAPP_RELEASE=%s\n' "${release}" >> "${ENV_FILE}"
  fi
}

read_env_value() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "${ENV_FILE}" | tail -n 1 || true)"
  printf '%s' "${line#*=}"
}

echo "==> Sync APP_RELEASE with current git revision"
sync_release_in_env "${RELEASE_SHA}"
echo "APP_RELEASE=${RELEASE_SHA}"

echo
echo "==> Rebuild and restart containers"
docker compose -f "${COMPOSE_FILE}" down
docker compose -f "${COMPOSE_FILE}" up -d --build

echo
echo "==> Apply Prisma migrations"
docker compose -f "${COMPOSE_FILE}" exec web npx prisma migrate deploy

echo
echo "==> Run monitoring check"
docker compose -f "${COMPOSE_FILE}" exec web npm run check:monitoring

echo
echo "==> Run release alignment check"
docker compose -f "${COMPOSE_FILE}" exec -e EXPECTED_RELEASE="${RELEASE_SHA}" web npm run check:release

BASE_URL="$(read_env_value AUTH_URL)"
if [ -n "${BASE_URL}" ] && command -v curl >/dev/null 2>&1; then
  echo
  echo "==> Health endpoint"
  curl -fsS "${BASE_URL%/}/api/health"
  echo
fi

echo
echo "Deployment completed for release ${RELEASE_SHA}."
