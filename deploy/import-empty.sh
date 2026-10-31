#!/bin/sh
# Only for the first migration, before starting backend. No deletion or --clean.
set -eu
cd "$(dirname "$0")"
file=${1:?Usage: sh import-empty.sh /absolute/path/source.dump}
test -s "$file"
tables=$(docker compose --env-file .env.production -f compose.yml exec -T db psql -U cond_owner -d cond_prod -Atc "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
if [ "$tables" != '0' ]; then
    printf 'Refused: target database is not empty. No data was changed.\n' >&2
    exit 1
fi
docker compose --env-file .env.production -f compose.yml exec -T db pg_restore -U cond_owner --role=cond_app --dbname=cond_prod --no-owner --no-acl --exit-on-error --single-transaction < "$file"
printf 'Import completed into the initially empty database. Start the application and run reconciliation.\n'
