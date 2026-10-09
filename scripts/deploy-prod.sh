#!/usr/bin/env bash
set -euo pipefail

# Standard VPS deployment helper for ORI CRUIT HUB.
# Run from the repository root on the production host.

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env}"
RELEASE_FILE="${RELEASE_FILE:-.release}"

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

read_env_value() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "${ENV_FILE}" | tail -n 1 || true)"
  printf '%s' "${line#*=}"
}

WEB_IMAGE="$(read_env_value WEB_IMAGE)"
RELEASE_SHA="$(read_env_value APP_RELEASE)"

if [[ ! "${WEB_IMAGE}" =~ ^ghcr\.io/ib4d/folga-intermediario-hub@sha256:[a-f0-9]{64}$ ]]; then
  echo "WEB_IMAGE must be the immutable ghcr.io/ib4d/folga-intermediario-hub@sha256:<digest> from a successful Quality run." >&2
  exit 1
fi

if [[ ! "${RELEASE_SHA}" =~ ^[a-f0-9]{40}$ ]]; then
  echo "APP_RELEASE must be the full 40-character commit SHA from the same release manifest as WEB_IMAGE." >&2
  exit 1
fi

echo "==> Pull the selected immutable image"
docker pull "${WEB_IMAGE}"
IMAGE_RELEASE="$(docker image inspect "${WEB_IMAGE}" --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}')"
if [ "${IMAGE_RELEASE}" != "${RELEASE_SHA}" ]; then
  echo "Image revision ${IMAGE_RELEASE:-missing} does not match APP_RELEASE ${RELEASE_SHA}." >&2
  exit 1
fi

echo "APP_RELEASE=${RELEASE_SHA}"

echo
echo "==> Start the exact image without rebuilding or pulling a moving tag"
docker compose -f "${COMPOSE_FILE}" up -d --no-build

echo
echo "==> Apply Prisma migrations"
docker compose -f "${COMPOSE_FILE}" exec web npx prisma migrate deploy

echo
echo "==> Run monitoring check"
docker compose -f "${COMPOSE_FILE}" exec web npm run check:monitoring

echo
echo "==> Run release alignment check"
docker compose -f "${COMPOSE_FILE}" exec -e EXPECTED_RELEASE="${RELEASE_SHA}" web npm run check:release

echo
echo "==> Run public smoke check"
docker compose -f "${COMPOSE_FILE}" exec web npm run check:smoke

printf '%s\n' "${RELEASE_SHA}" > "${RELEASE_FILE}"
echo "RELEASE_FILE=${RELEASE_FILE}"

BASE_URL="$(read_env_value AUTH_URL)"
if [ -n "${BASE_URL}" ] && command -v curl >/dev/null 2>&1; then
  echo
  echo "==> Health endpoint"
  curl -fsS "${BASE_URL%/}/api/health"
  echo
fi

echo
echo "Deployment completed for release ${RELEASE_SHA}."
