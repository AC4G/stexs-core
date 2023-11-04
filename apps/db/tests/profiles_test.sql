BEGIN;

SELECT plan(13);

SELECT ok(
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles'),
    'public.profiles table exists'
);

SELECT is(
    (SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id'),
    'user_id',
    'user_id is a column in public.profiles'
);

SELECT is(
    (SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username'),
    'username',
    'username is a column in public.profiles'
);

SELECT is(
    (SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_private'),
    'is_private',
    'is_private is a column in public.profiles'
);

SELECT is(
    (SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'friend_privacy_level'),
    'friend_privacy_level',
    'friend_privacy_level is a column in public.profiles'
);

SELECT is(
    (SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'inventory_privacy_level'),
    'inventory_privacy_level',
    'inventory_privacy_level is a column in public.profiles'
);

SELECT is(
    (SELECT conname FROM pg_constraint WHERE conname = 'profiles_check' AND conrelid = 'public.profiles'::regclass),
    'profiles_check',
    'CHECK constraint is valid'
);

SELECT ok(
    has_column_privilege('authenticated', 'public.profiles', 'username', 'UPDATE') AND
    has_column_privilege('authenticated', 'public.profiles', 'is_private', 'UPDATE') AND
    has_column_privilege('authenticated', 'public.profiles', 'friend_privacy_level', 'UPDATE') AND
    has_column_privilege('authenticated', 'public.profiles', 'inventory_privacy_level', 'UPDATE'),
    'authenticated role has UPDATE privilege on specified columns'
);

SELECT ok(
    has_table_privilege('anon', 'public.profiles', 'SELECT'),
    'anon role has SELECT privilege on public.profiles'
);

SELECT ok(
    has_table_privilege('authenticated', 'public.profiles', 'SELECT'),
    'authenticated role has SELECT privilege on public.profiles'
);

SELECT col_is_pk('profiles', 'user_id', 'user_id is a Primary Key');

SELECT col_is_unique('profiles', 'username', 'username has a unique constraint');

SELECT is(
    (SELECT conname FROM pg_constraint WHERE conname = 'profiles_check' AND conrelid = 'public.profiles'::regclass),
    'profiles_check',
    'CHECK constraint is valid'
);

ROLLBACK;
