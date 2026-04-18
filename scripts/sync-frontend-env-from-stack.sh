#!/usr/bin/env bash
# Writes CloudFormation output FunctionUrl into frontend env files (Lambda as VITE_API_URL).
set -euo pipefail
API_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$API_ROOT/../burger-shop-frontend"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
export AWS_REGION="${AWS_REGION:-us-east-1}"
STACK="${AWS_STACK_NAME:-burger-shop-api-proxy}"

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "sync-frontend-env-from-stack: skip (no AWS credentials)"
  exit 0
fi

URL="$(aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='FunctionUrl'].OutputValue | [0]" --output text 2>/dev/null || true)"
if [[ -z "$URL" || "$URL" == "None" ]]; then
  echo "sync-frontend-env-from-stack: stack $STACK has no FunctionUrl output (deploy the stack first)."
  exit 0
fi

URL="${URL%/}"
echo "Using Function URL: $URL"

merge() {
  local file="$1"
  [[ -f "$file" ]] || touch "$file"
  local rest
  rest="$(grep -vE '^[[:space:]]*VITE_API_URL=|^[[:space:]]*VITE_VERCEL_API_PROXY=' "$file" || true)"
  {
    echo "VITE_API_URL=$URL"
    echo "VITE_VERCEL_API_PROXY=false"
    [[ -n "$rest" ]] && echo "$rest"
  } >"${file}.new"
  mv "${file}.new" "$file"
}

merge "$FRONTEND/.env.local"
merge "$FRONTEND/.env.production"
echo "Updated $FRONTEND/.env.local and .env.production"
