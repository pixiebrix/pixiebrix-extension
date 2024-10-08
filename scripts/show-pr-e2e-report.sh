#!/bin/bash

#
# Copyright (C) 2024 PixieBrix, Inc.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
#

# Get the password from .env.development file
REPORT_ZIP_PASSWORD=$(grep REPORT_ZIP_PASSWORD .env.development | cut -d '=' -f2)


if [ -z "$REPORT_ZIP_PASSWORD" ]
then
  echo "Zip Password is required. Set REPORT_ZIP_PASSWORD in .env.development file."
  exit 1
fi

# Check if a named argument was provided
while getopts ":p:r:" opt; do
  case $opt in
    p) PR_ID="$OPTARG"
    ;;
    r) RUN_ID="$OPTARG"
    ;;
    \?) echo "Invalid option -$OPTARG" >&2
       exit 1
    ;;
  esac
done

# Check if either PR_ID or RUN_ID is set
if [ -z "$PR_ID" ] && [ -z "$RUN_ID" ]
then
  echo "Either pull request ID (-p) or run ID (-r) is required."
  exit 1
fi

# Create/clean up the directory to store the report
rm -rf .playwright-report/*
mkdir .playwright-report

# Get the RUN_ID if PR_ID was provided
if [ -n "$PR_ID" ]
then
  RUN_ID=$(gh pr checks "$PR_ID" --repo pixiebrix/pixiebrix-extension --json 'name,link' --jq ".[] | select(.name == \"Create report\") | .link" | cut -d'/' -f8)
fi

# Get the URL of the playwright-report artifact from the GitHub API
ARTIFACT_URL=$(gh api "repos/pixiebrix/pixiebrix-extension/actions/runs/$RUN_ID" --jq ".artifacts_url" | xargs gh api --jq ".artifacts[] | select(.name == \"end-to-end-tests-report\") | .archive_download_url")

echo "Artifact URL: $ARTIFACT_URL"

# Download the artifact
curl -L -o .playwright-report/playwright-report.zip -H "Authorization: token $(gh auth status --show-token | grep "Token: " | cut -d ':' -f2)" "$ARTIFACT_URL"

unzip .playwright-report/playwright-report.zip -d .playwright-report

# Extract the artifact
7zz x .playwright-report/playwright-report.7z -p"$REPORT_ZIP_PASSWORD" -o".playwright-report"

# Run npx playwright show-report
npx playwright show-report .playwright-report
