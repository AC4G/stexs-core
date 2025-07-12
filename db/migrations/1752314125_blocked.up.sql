CREATE TABLE public.blocked (
	id SERIAL PRIMARY KEY,
	blocker_id UUID REFERENCES public.profiles (user_id) ON DELETE CASCADE NOT NULL,
	blocked_id UUID REFERENCES public.profiles (user_id) ON DELETE CASCADE NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT unique_blocked_combination UNIQUE (blocker_id, blocked_id),
	CHECK (blocker_id <> blocked_id)
);

GRANT INSERT (blocker_id, blocked_id) ON TABLE public.blocked TO authenticated;
GRANT DELETE, SELECT ON TABLE public.blocked TO authenticated;
GRANT SELECT ON TABLE public.blocked TO anon;

CREATE OR REPLACE FUNCTION public.delete_friend_request_or_friend_if_exists()
RETURNS TRIGGER AS $$
BEGIN
	DELETE FROM public.friend_requests
	WHERE (requester_id = NEW.blocker_id AND addressee_id = NEW.blocked_id)
		OR (requester_id = NEW.blocked_id AND addressee_id = NEW.blocker_id);

	DELETE FROM public.friends
	WHERE (user_id = NEW.blocker_id AND friend_id = NEW.blocked_id)
		OR (user_id = NEW.blocked_id AND friend_id = NEW.blocker_id);

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delete_friend_request_or_friend_if_exists_trigger
BEFORE INSERT ON public.blocked
FOR EACH ROW
EXECUTE FUNCTION public.delete_friend_request_or_friend_if_exists();

GRANT USAGE, SELECT ON SEQUENCE public.blocked_id_seq TO authenticated;
