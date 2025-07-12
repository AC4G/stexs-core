CREATE TABLE public.friend_requests (
	id SERIAL PRIMARY KEY,
	requester_id UUID REFERENCES public.profiles (user_id) ON DELETE CASCADE NOT NULL,
	addressee_id UUID REFERENCES public.profiles (user_id) ON DELETE CASCADE NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX unique_friend_requests_combination
ON public.friend_requests ((LEAST(requester_id, addressee_id)), (GREATEST(requester_id, addressee_id)));

GRANT INSERT (requester_id, addressee_id) ON TABLE public.friend_requests TO authenticated;
GRANT DELETE, SELECT ON TABLE public.friend_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.insert_friend_request_into_notifications()
RETURNS TRIGGER AS $$
BEGIN
	IF NEW.addressee_id IS NOT NULL THEN
		INSERT INTO public.notifications (
			user_id,
			type,
			friend_request_id
		) VALUES (
			NEW.addressee_id,
			'friend_request',
			NEW.id
		);
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friend_request_changed_trigger
  AFTER INSERT OR DELETE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.insert_friend_request_into_notifications();

CREATE OR REPLACE FUNCTION public.check_friend_request_limit()
RETURNS TRIGGER AS $$
DECLARE
  friend_request_count INT;
BEGIN
	SELECT COUNT(1) INTO friend_request_count
	FROM public.friend_requests
	WHERE addressee_id = NEW.addressee_id;

	IF friend_request_count = 100 THEN
		RAISE sqlstate 'P0001' USING
			message = 'Friend request limit exceeded',
			detail = 'User has 100 friend requests',
			hint = 'Ask your friend to make place for your friend request';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_friend_request_limit_trigger
BEFORE INSERT ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION public.check_friend_request_limit();

CREATE OR REPLACE FUNCTION public.check_accept_friend_requests_before_insert()
RETURNS TRIGGER AS $$
BEGIN
	IF (
		(SELECT accept_friend_requests FROM public.profiles WHERE user_id = NEW.addressee_id) = FALSE
	) THEN
		RAISE sqlstate 'P0001' USING
			message = 'User doesn''t accept friend requests',
			hint = 'Ask your friend to send a friend request to you instead';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_accept_friend_requests_before_insert_trigger
BEFORE INSERT ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION public.check_accept_friend_requests_before_insert();

GRANT USAGE, SELECT ON SEQUENCE public.friend_requests_id_seq TO authenticated;
