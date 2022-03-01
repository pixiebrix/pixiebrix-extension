#!/bin/sh

# Automatically exit on error
set -e

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

# NOTE: What follows is a single pipe

# `find` outputs:
# dist/background.js
# dist/bundles/icons.js
# etc
find dist -name '*.js' | \

# `sed` outputs:
# background.js
# bundles/icons.js
# etc
sed s/dist\\/// | \

# `parallel` executes `curl` once per line with limited concurrency, replacing {} with each input line:
# curl https://etc.etc -F minified_url=etc/etc/background.js
# curl https://etc.etc -F minified_url=etc/etc/bundles/icons.js
# etc
#
# `curl` automatically retries if the server is busy
parallel curl https://api.rollbar.com/api/1/sourcemap/download \
	-F version="$SOURCE_VERSION" \
	-F access_token="$ROLLBAR_BROWSER_ACCESS_TOKEN" \
	-F minified_url="$SOURCE_MAP_URL_BASE/$SOURCE_MAP_PATH/{}"
