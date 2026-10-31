#!/bin/sh
# Always restores into a new isolated database. Never overwrites cond_prod.
set -eu
cd "$(dirname "$0")"
file=${1:?Usage: sh restore-test.sh backups/cond-TIMESTAMP.dump}
test -s "$file"
target="cond_restore_$(date -u +%Y%m%d_%H%M%S)"
docker compose --env-file .env.production -f compose.yml exec -T db psql -U cond_owner -d postgres --set=ON_ERROR_STOP=1 --set=target="$target" <<'SQL'
CREATE DATABASE :"target" OWNER cond_app;
SQL
docker compose --env-file .env.production -f compose.yml exec -T db pg_restore -U cond_owner --role=cond_app --dbname="$target" --no-owner --no-acl --exit-on-error --single-transaction < "$file"
docker compose --env-file .env.production -f compose.yml exec -T db psql -U cond_owner -d "$target" --set=ON_ERROR_STOP=1 -c 'SELECT count(*) AS users FROM users; SELECT count(*) AS materials FROM materials; SELECT count(*) AS productions FROM productions;'
printf 'Restored to isolated database %s. Production database is unchanged.\n' "$target"
