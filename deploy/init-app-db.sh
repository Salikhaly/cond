#!/bin/sh
set -eu
# The application owns its database, but has no cluster superuser privileges.
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 --set=app_password="$APP_DB_PASSWORD" --set=app_database="$POSTGRES_DB" <<'SQL'
CREATE ROLE cond_app LOGIN PASSWORD :'app_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER DATABASE :"app_database" OWNER TO cond_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO cond_app;
SQL
