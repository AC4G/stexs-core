BEGIN;

SELECT plan(4);

SELECT has_extension('uuid-ossp', 'uuid-ossp extension exists');
SELECT has_extension('pgcrypto', 'pgcrypto extension exists');
SELECT has_extension('citext', 'citext extension exists');
SELECT has_extension('pgtap', 'pgtap extension exists');

ROLLBACK;
