#!/bin/sh
set -eu

npx prisma generate
npx prisma migrate deploy
npm run db:prepare

exec npm run dev
