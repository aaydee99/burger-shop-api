#!/usr/bin/env bash
# Build the Lambda artifact and run sam deploy only (no frontend env or other setup).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-${AWS_REGION:-us-east-1}}"
export AWS_REGION="${AWS_REGION:-$AWS_DEFAULT_REGION}"

aws sts get-caller-identity >/dev/null 2>&1 || {
  echo "aws sts get-caller-identity failed" >&2
  exit 1
}

npm run build:lambda

sam deploy \
  --stack-name "${AWS_STACK_NAME:-burger-shop-api-proxy}" \
  --region "${AWS_REGION:-us-east-1}" \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    "ApiUpstream=${API_UPSTREAM:-https://apishop.online}" \
    "ProxyClientIp=${PROXY_CLIENT_IP:-203.0.113.1}" \
    "CorsAllowOrigin=${CORS_ALLOW_ORIGIN:-*}"
