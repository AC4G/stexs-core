BEGIN;

SELECT plan(7);

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

COMMIT;
