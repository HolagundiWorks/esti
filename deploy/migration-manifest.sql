-- Migration manifest (DB dimension): one `table|rowcount` line for every esti_*
-- table, plus the schema head. Static SQL — the per-table counts come from
-- query_to_xml (run the count query per catalogue row, extract with xpath), so
-- no dynamic SQL has to be assembled by the caller. Used by
-- deploy/test-migration-roundtrip.sh to prove a pg_dump→restore is faithful.
\pset tuples_only on
\pset format unaligned

select tablename || '|' ||
       (xpath('/row/c/text()',
              query_to_xml(format('select count(*) as c from %I', tablename), false, true, '')))[1]::text
from pg_tables
where schemaname = 'public' and tablename like 'esti\_%'
order by tablename;

select 'SCHEMA_HEAD|' || coalesce((select count(*) from drizzle.__drizzle_migrations), 0);
