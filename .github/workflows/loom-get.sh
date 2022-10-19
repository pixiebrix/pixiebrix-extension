#!/bin/bash

gh pr view $1 | # Get first post
grep "https://www.loom.com/share/\w\{32\}" --max-count 1 --only-matching | # Find first loom
tee LOOM_LINK || true # Save it in ./LOOM_LINK and don't throw if not found

# Also store it in a $LOOM_LINK global env
# https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-environment-variable
echo "LOOM_LINK=$(cat LOOM_LINK)" >> $GITHUB_ENV
