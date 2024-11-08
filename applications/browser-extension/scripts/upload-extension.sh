#!/bin/sh

# Automatically exit on error
set -e

if [ "$#" -ne 1 ]; then
  echo "Usage: ./upload-extension.sh <BUILD_PATH>"
  echo "example: ./upload-extension.sh builds/pixiebrix-extension-cws.zip"
fi

# Ensure ENVs are set https://stackoverflow.com/a/307735/288906
# Extract everything after last slash https://unix.stackexchange.com/a/247636
BUILD_PATH=$1
BUILD_FILENAME="${BUILD_PATH##*/}"

: "${AWS_ACCESS_KEY_ID?Need to set AWS_ACCESS_KEY_ID}"
: "${AWS_SECRET_ACCESS_KEY?Need to set AWS_SECRET_ACCESS_KEY}"
: "${AWS_DEFAULT_REGION?Need to set AWS_DEFAULT_REGION}"

zip -r "$BUILD_FILENAME" dist -x '*.map'
aws s3 cp "$BUILD_FILENAME" "s3://pixiebrix-extension-builds/$BUILD_PATH" --no-progress
