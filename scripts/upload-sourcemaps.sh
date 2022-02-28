#!/bin/sh

# Ensure ENVs are set https://stackoverflow.com/a/307735/288906
: "${SOURCE_MAP_PATH?Need to set SOURCE_MAP_PATH}"
: "${SOURCE_MAP_URL_BASE?Need to set SOURCE_MAP_URL_BASE}"
: "${ROLLBAR_BROWSER_ACCESS_TOKEN?Need to set ROLLBAR_BROWSER_ACCESS_TOKEN}"

: "${AWS_ACCESS_KEY_ID?Need to set AWS_ACCESS_KEY_ID}"
: "${AWS_SECRET_ACCESS_KEY?Need to set AWS_SECRET_ACCESS_KEY}"
: "${AWS_DEFAULT_REGION?Need to set AWS_DEFAULT_REGION}"

SOURCE_VERSION=$(git rev-parse --short HEAD)
S3_UPLOAD_BASE_URL="s3://pixiebrix-extension-source-maps/$SOURCE_MAP_PATH"

aws s3 cp ./dist "$S3_UPLOAD_BASE_URL" --exclude '*' --include '*.map' --include '*.js' --recursive --no-progress

# Notify Rollbar to trigger a download for each of the minified files.
# https://docs.rollbar.com/docs/source-maps#3-upload-your-source-map-files
# Parallel automatically limits concurrency and curl automatically retries.
find dist -name '*.js' | parallel curl https://api.rollbar.com/api/1/sourcemap/download \
	-F version="$SOURCE_VERSION" \
	-F access_token="$ROLLBAR_BROWSER_ACCESS_TOKEN" \
	-F minified_url="$SOURCE_MAP_URL_BASE/$SOURCE_MAP_PATH/"{}
