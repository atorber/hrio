#!/usr/bin/env bash
set -e

VERSION=$(npx pkg-jq -r .version)

if npx --package @chatie/semver semver-is-prod "$VERSION"; then
  NPM_TAG=latest
else
  NPM_TAG=next
fi

npm run dist
npm pack

TMPDIR="/tmp/npm-pack-testing.$$"
mkdir "$TMPDIR"
mv ./*-*.*.*.tgz "$TMPDIR"

cd $TMPDIR

npm init -y
npm install --production *-*.*.*.tgz \
  @types/node \
  @chatie/tsconfig@$NPM_TAG \
  pkg-jq \
  "wechaty-puppet@$NPM_TAG" \
  "wechaty@$NPM_TAG"

# CommonJS and ES Modules compilation and testing code removed

echo "Script finished successfully."
