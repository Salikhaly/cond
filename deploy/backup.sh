#!/bin/sh
set -eu
cd "$(dirname "$0")"
umask 077
mkdir -p backups
stamp=$(date -u +%Y%m%d-%H%M%S)
file="backups/cond-$stamp.dump"
docker compose --env-file .env.production -f compose.yml exec -T db pg_dump -U cond_owner -d cond_prod --format=custom --no-owner --no-acl > "$file.partial"
test -s "$file.partial"
mv "$file.partial" "$file"
# Product images are separate from PostgreSQL.
docker compose --env-file .env.production -f compose.yml exec -T backend tar -czf - -C /app/src uploads > "backups/uploads-$stamp.tar.gz.partial"
test -s "backups/uploads-$stamp.tar.gz.partial"
mv "backups/uploads-$stamp.tar.gz.partial" "backups/uploads-$stamp.tar.gz"
printf 'Backup created: %s and uploads-%s.tar.gz\n' "$file" "$stamp"
