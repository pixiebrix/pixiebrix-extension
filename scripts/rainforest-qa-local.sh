#!/bin/sh

# Automatically exit on error
set -e

# Use local environment configuration
set -a
source .env.development
set +a

# Ensure ENVs are set https://stackoverflow.com/a/307735/288906
: "${BUILD_PATH?Need to set BUILD_PATH}"
: "${BUILD_FILENAME?Need to set BUILD_FILENAME}"

# Although these checks are already part of the AWS command,
# we'd like to notify the user about missing variables before the
# build & compression (which takes about a minute or two)
: "${AWS_ACCESS_KEY_ID?Need to set AWS_ACCESS_KEY_ID}"
: "${AWS_SECRET_ACCESS_KEY?Need to set AWS_SECRET_ACCESS_KEY}"
: "${AWS_DEFAULT_REGION?Need to set AWS_DEFAULT_REGION}"

web-ext build --filename=$BUILD_FILENAME
aws s3 cp "web-ext-artifacts/$BUILD_FILENAME" "s3://pixiebrix-extension-builds/$BUILD_PATH" --no-progress
