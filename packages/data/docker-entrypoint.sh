#!/bin/sh
set -eu

pnpm --filter @verity/data db:deploy
pnpm --filter @verity/data db:seed
