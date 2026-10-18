#!/usr/bin/env bash
set -euo pipefail

# Promote the exact immutable image produced by the successful main CI run.
# Run from the repository root on the production host.

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env}"
RELEASE_FILE="${RELEASE_FILE:-.release}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-folga-intermediario-hub}"

for required_file in "$COMPOSE_FILE" "$ENV_FILE"; do
  if [ ! -f "$required_file" ]; then
    echo "Required file not found: $required_file" >&2
    exit 1
  fi
done

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required on the production host." >&2
  exit 1
fi

read_env_value() {
  local key="$1"
  local line value
  line="$(grep -E "^(export[[:space:]]+)?${key}=" "$ENV_FILE" | tail -n 1 || true)"
  value="${line#*=}"
  value="${value%$'\r'}"

  if [[ "$value" == \"*\" || "$value" == \'*\' ]]; then
    value="${value:1:${#value}-2}"
  fi

  printf '%s' "$value"
}

WEB_IMAGE="$(read_env_value WEB_IMAGE)"
RELEASE_SHA="$(read_env_value APP_RELEASE)"

if [[ ! "$WEB_IMAGE" =~ ^ghcr\.io/ib4d/folga-intermediario-hub@sha256:[a-f0-9]{64}$ ]]; then
  echo "WEB_IMAGE must be the immutable GHCR digest from a successful main Quality run." >&2
  exit 1
fi

if [[ ! "$RELEASE_SHA" =~ ^[a-f0-9]{40}$ ]]; then
  echo "APP_RELEASE must be the full 40-character commit SHA from the same release manifest as WEB_IMAGE." >&2
  exit 1
fi

# docker compose gives inherited shell variables precedence over --env-file.
# Root's login environment may define unrelated DB_* values, so use a clean
# environment and let Compose read only the explicit production env file.
compose=(env -i
  "HOME=${HOME:-/root}"
  "PATH=${PATH:-/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin}"
  "DOCKER_CONFIG=${DOCKER_CONFIG:-${HOME:-/root}/.docker}"
  docker compose --project-name "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

echo "==> Validate Compose configuration"
"${compose[@]}" config --quiet

echo
echo "==> Pull the selected immutable image"
docker pull "$WEB_IMAGE"

IMAGE_LABEL_RELEASE="$(docker image inspect "$WEB_IMAGE" --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}')"
IMAGE_FILE_RELEASE="$(docker run --rm --entrypoint cat "$WEB_IMAGE" /app/.release)"

if [ "$IMAGE_LABEL_RELEASE" != "$RELEASE_SHA" ]; then
  echo "Image OCI revision ${IMAGE_LABEL_RELEASE:-missing} does not match APP_RELEASE $RELEASE_SHA." >&2
  exit 1
fi

if [ "$IMAGE_FILE_RELEASE" != "$RELEASE_SHA" ]; then
  echo "Image /app/.release ${IMAGE_FILE_RELEASE:-missing} does not match APP_RELEASE $RELEASE_SHA." >&2
  exit 1
fi

echo "Verified immutable image and release $RELEASE_SHA."

echo
echo "==> Validate production environment using the candidate image"
"${compose[@]}" run --rm --no-deps web node scripts/check-production-env.mjs

echo
echo "==> Apply Prisma migrations while the current web release remains online"
"${compose[@]}" run --rm --no-deps web npx prisma migrate deploy

echo
echo "==> Start only the web service from the exact image without rebuilding"
"${compose[@]}" up -d --no-deps --no-build --pull never web
printf '%s\n' "$RELEASE_SHA" > "$RELEASE_FILE"
echo "RELEASE_FILE=$RELEASE_FILE"

echo
echo "==> Run monitoring check"
"${compose[@]}" exec web npm run check:monitoring

echo
echo "==> Run release alignment check"
"${compose[@]}" exec -e EXPECTED_RELEASE="$RELEASE_SHA" web npm run check:release

echo
echo "==> Run public smoke check"
"${compose[@]}" exec web npm run check:smoke

BASE_URL="$(read_env_value AUTH_URL)"
if [ -n "$BASE_URL" ] && command -v curl >/dev/null 2>&1; then
  echo
  echo "==> Health endpoint"
  curl -fsS "${BASE_URL%/}/api/health"
  echo
fi

echo
echo "Deployment completed for release $RELEASE_SHA."
