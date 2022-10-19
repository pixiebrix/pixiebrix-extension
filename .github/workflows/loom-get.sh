#!/bin/bash
die () {
    echo >&2 "$@"
    exit 1
}

[ "$#" -eq 1 ] || die "PR number required as argument"
PR=$1

LOOM_REGEX="https://www.loom.com/share/\w\{32\}"

printf "\nFIRST POST\n----------\n"
gh pr view $PR --repo $GITHUB_REPOSITORY | tee FIRST_POST

printf "\nLOOM LINK\n---------\n"
grep $LOOM_REGEX FIRST_POST --max-count 1 --only-matching | tee LOOM_LINK || true

echo "LOOM_LINK=$(cat LOOM_LINK)" >> $GITHUB_ENV
