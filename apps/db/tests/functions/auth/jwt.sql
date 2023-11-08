BEGIN;

SELECT plan(32);

SELECT can('auth', ARRAY['jwt', 'role', 'uid', 'grant', 'scopes'], 'Functions for getting authenticated users jwt from request exists');

SELECT function_lang_is('auth', 'jwt', 'plpgsql', 'jwt function should be written in plpgsql');
SELECT function_lang_is('auth', 'role', 'plpgsql', 'role function should be written in plpgsql');
SELECT function_lang_is('auth', 'uid', 'plpgsql', 'uid function should be written in plpgsql');
SELECT function_lang_is('auth', 'grant', 'plpgsql', 'grant function should be written in plpgsql');
SELECT function_lang_is('auth', 'scopes', 'plpgsql', 'scopes function should be written in plpgsql');

SELECT function_returns('auth', 'jwt', 'jsonb', 'jwt function should return jsonb');
SELECT function_returns('auth', 'role', 'text', 'role function should return text');
SELECT function_returns('auth', 'uid', 'uuid', 'uid function should return uuid');
SELECT function_returns('auth', 'grant', 'text', 'grant function should return text');
SELECT function_returns('auth', 'scopes', 'text[]', 'scopes function should return text[]');

SELECT is_normal_function('auth', 'jwt', 'jwt is a normal function');
SELECT is_normal_function('auth', 'role', 'role is a normal function');
SELECT is_normal_function('auth', 'uid', 'uid is a normal function');
SELECT is_normal_function('auth', 'grant', 'grant is a normal function');
SELECT is_normal_function('auth', 'scopes', 'scopes is a normal function');

SELECT function_privs_are('auth', 'jwt', ARRAY[''],'authenticated', ARRAY['EXECUTE'], 'authenticated role has EXECUTE privilege on auth.jwt');
SELECT function_privs_are('auth', 'role', ARRAY[''],'authenticated', ARRAY['EXECUTE'], 'authenticated role has EXECUTE privilege on auth.role');
SELECT function_privs_are('auth', 'uid', ARRAY[''],'authenticated', ARRAY['EXECUTE'], 'authenticated role has EXECUTE privilege on auth.uid');
SELECT function_privs_are('auth', 'grant', ARRAY[''],'authenticated', ARRAY['EXECUTE'], 'authenticated role has EXECUTE privilege on auth.grant');
SELECT function_privs_are('auth', 'scopes', ARRAY[''],'authenticated', ARRAY['EXECUTE'], 'authenticated role has EXECUTE privilege on auth.scopes');

SELECT ok(auth.jwt() IS NULL, 'auth.jwt() returns NULL on empty request claim');
SELECT ok(auth.role() IS NULL, 'auth.role() returns NULL on empty request claim ->> role');
SELECT ok(auth.uid() IS NULL, 'auth.uid() returns NULL on empty request claim ->> sub');
SELECT ok(auth.grant() IS NULL, 'auth.grant() returns NULL on empty request claim ->> grant_type');
SELECT ok(auth.scopes() IS NULL, 'auth.scopes() returns NULL on empty request claim ->> scopes');


SELECT set_config('request.jwt.claims', '{"sub": "2d7ab9f2-e4dd-4635-a830-6f1f724fd2f9", "role": "authenticated", "grant_type": "password"}', true);

SELECT ok(auth.jwt() = '{"sub": "2d7ab9f2-e4dd-4635-a830-6f1f724fd2f9", "role": "authenticated", "grant_type": "password"}', 'auth.jwt() returns expected jsonb');
SELECT ok(auth.role() = 'authenticated', 'auth.role() returns authenticated role');
SELECT ok(auth.uid() = '2d7ab9f2-e4dd-4635-a830-6f1f724fd2f9', 'auth.uid() returns expected uuid from sub');
SELECT ok(auth.grant() = 'password', 'auth.grant() returns expected grant type');
SELECT ok(auth.scopes() IS NULL, 'auth.scopes() returns NULL');

SELECT set_config('request.jwt.claim.scopes', 'inventory.read,inventory.write', true);

SELECT ok(auth.scopes() = ARRAY['inventory.read', 'inventory.write'], 'auth.scopes() should return expected scopes');

ROLLBACK;
