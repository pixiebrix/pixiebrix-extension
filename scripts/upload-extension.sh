#!/bin/sh

# Ensure ENVs are set https://stackoverflow.com/a/307735/288906
: "${BUILD_PATH?Need to set BUILD_PATH}"
: "${BUILD_FILENAME?Need to set BUILD_FILENAME}"

: "${AWS_ACCESS_KEY_ID?Need to set AWS_ACCESS_KEY_ID}"
: "${AWS_SECRET_ACCESS_KEY?Need to set AWS_SECRET_ACCESS_KEY}"
: "${AWS_DEFAULT_REGION?Need to set AWS_DEFAULT_REGION}"

zip -r "$BUILD_FILENAME" dist -x '*.map'
aws s3 cp "$BUILD_FILENAME" "s3://pixiebrix-extension-builds/$BUILD_PATH" --no-progress
