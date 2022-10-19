#!/bin/bash
die () {
    echo >&2 "$@"
    exit 1
}

[ "$#" -eq 1 ] || die "PR number required as argument"

gh pr view $1 --repo $GITHUB_REPOSITORY |
grep "https://www.loom.com/share/\w\{32\}" --max-count 1 --only-matching |
tee LOOM_LINK || true

echo "LOOM_LINK=$(cat LOOM_LINK)" >> $GITHUB_ENV
