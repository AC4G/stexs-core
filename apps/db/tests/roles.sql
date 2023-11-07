BEGIN;

SELECT plan(4);

SELECT roles_are(ARRAY[
    'anon', 
    'authenticator', 
    'authenticated', 
    'pg_database_owner',
    'pg_execute_server_program',
    'pg_monitor',
    'pg_read_all_data',
    'pg_read_all_settings',
    'pg_read_all_stats',
    'pg_read_server_files',
    'pg_signal_backend',
    'pg_stat_scan_tables',
    'pg_write_all_data',
    'pg_write_server_files',
    'postgres'
]);

SELECT isnt_superuser('anon', 'anon should not be a super user');
SELECT isnt_superuser('authenticated', 'authenticated should not be a super user');
SELECT isnt_superuser('authenticator', 'authenticator should not be a super user');

ROLLBACK;
