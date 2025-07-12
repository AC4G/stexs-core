CREATE TABLE public.friends (
	id SERIAL PRIMARY KEY,
	user_id UUID REFERENCES public.profiles (user_id) ON DELETE CASCADE NOT NULL,
	friend_id UUID REFERENCES public.profiles (user_id) ON DELETE CASCADE NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT unique_friends_combination UNIQUE (user_id, friend_id)
);

GRANT INSERT (user_id, friend_id) ON TABLE public.friends TO authenticated;
GRANT DELETE, SELECT ON TABLE public.friends TO authenticated;
GRANT SELECT ON TABLE public.friends TO anon;

CREATE OR REPLACE FUNCTION public.friend_insert()
RETURNS TRIGGER AS $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM public.friends
		WHERE user_id = NEW.friend_id 
			AND friend_id = NEW.user_id
	) THEN
		INSERT INTO public.friends (user_id, friend_id)
		VALUES (NEW.friend_id, NEW.user_id);

		DELETE FROM public.friend_requests
		WHERE addressee_id = NEW.user_id 
			AND requester_id = NEW.friend_id;
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friend_insert_trigger
AFTER INSERT ON public.friends
FOR EACH ROW
EXECUTE FUNCTION public.friend_insert();

CREATE OR REPLACE FUNCTION public.check_friends_limit()
RETURNS TRIGGER AS $$
DECLARE
  friends_count INT;
BEGIN
    SELECT COUNT(1) INTO friends_count
    FROM public.friends
    WHERE user_id = NEW.user_id;

    IF friends_count = 1000 THEN
		RAISE sqlstate 'P0001' USING
			message = 'Friend limit exceeded',
			detail = 'User has reached 1000 friends',
			hint = 'Remove some friends for new ones';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_friends_limit_trigger
BEFORE INSERT ON public.friends
FOR EACH ROW
EXECUTE FUNCTION public.check_friends_limit();

CREATE OR REPLACE FUNCTION public.friend_delete()
RETURNS TRIGGER AS $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM public.friends
		WHERE user_id = OLD.friend_id 
			AND friend_id = OLD.user_id
	) THEN 
		DELETE FROM public.friends
		WHERE user_id = OLD.friend_id 
			AND friend_id = OLD.user_id;
	END IF;

	RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friend_delete_trigger
AFTER DELETE ON public.friends
FOR EACH ROW
EXECUTE FUNCTION public.friend_delete();

GRANT USAGE, SELECT ON SEQUENCE public.friends_id_seq TO authenticated;
