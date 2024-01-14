#!/bin/sh

# Automatically exit on error
set -e

# Ensure ENVs are set https://stackoverflow.com/a/307735/288906
: "${SOURCE_MAP_PATH?Need to set SOURCE_MAP_PATH}"
: "${SOURCE_MAP_URL_BASE?Need to set SOURCE_MAP_URL_BASE}"
: "${DATADOG_API_KEY?Need to set DATADOG_API_KEY}"

: "${AWS_ACCESS_KEY_ID?Need to set AWS_ACCESS_KEY_ID}"
: "${AWS_SECRET_ACCESS_KEY?Need to set AWS_SECRET_ACCESS_KEY}"
: "${AWS_DEFAULT_REGION?Need to set AWS_DEFAULT_REGION}"

# Upload to S3 for debugging in Chrome
# S3_UPLOAD_BASE_URL="s3://pixiebrix-extension-source-maps/$SOURCE_MAP_PATH"
# aws s3 cp ./dist "$S3_UPLOAD_BASE_URL" --exclude '*' --include '*.map' --include '*.js' --recursive --no-progress

# Datadog uses release-version, not the code commit version. So get from produced manifest
# TODO: verify that the `+<commit_hash>` is working if enabled for CI builds
RELEASE_VERSION=$(jq '.version_name' dist/manifest.json)

# Upload to Datadog for viewing unminified sources in Datadog. Datadog does not appear to support import from an S3 URL
# Because this command runs from a Git repo context, Datadog should also automatically link to our project from the UI.
# https://docs.datadoghq.com/real_user_monitoring/guide/upload-javascript-source-maps/?tab=webpackjs
# `release-version` must match the version in initErrorReporter.ts and performance.ts
npx --yes @datadog/datadog-ci sourcemaps upload ./dist \
  --service=pixiebrix-browser-extension \
  --release-version="$RELEASE_VERSION" \
  --minified-path-prefix="/"
