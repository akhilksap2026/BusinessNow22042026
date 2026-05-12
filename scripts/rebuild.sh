#!/usr/bin/env bash
set -e
echo "Cleaning dist folders..."
rm -rf artifacts/businessnow/dist artifacts/api-server/dist
echo "Building frontend..."
PORT=5000 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/businessnow run build
echo "Building API server..."
pnpm --filter @workspace/api-server run build
echo "Done. Ready to publish."
