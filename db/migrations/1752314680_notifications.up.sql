CREATE TABLE public.notifications (
	id SERIAL PRIMARY KEY,
	user_id UUID REFERENCES public.profiles (user_id) ON DELETE CASCADE NOT NULL,
	message TEXT,
	type VARCHAR(100) NOT NULL,
	seen BOOLEAN DEFAULT FALSE NOT NULL,
	friend_request_id INT REFERENCES public.friend_requests (id) ON DELETE CASCADE UNIQUE,
	organization_request_id INT REFERENCES public.organization_requests (id) ON DELETE CASCADE UNIQUE,
	project_request_id INT REFERENCES public.project_requests (id) ON DELETE CASCADE UNIQUE,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CHECK (type IN ('message', 'friend_request', 'organization_request', 'project_request')),
	CHECK (
		(friend_request_id IS NOT NULL)::INT +
		(organization_request_id IS NOT NULL)::INT +
		(project_request_id IS NOT NULL)::INT <= 1
	)
);

GRANT UPDATE (seen) ON TABLE public.notifications TO authenticated;
GRANT INSERT, DELETE, SELECT ON TABLE public.notifications TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE public.notifications_id_seq TO authenticated;
