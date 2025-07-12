CREATE TABLE public.project_requests (
	id SERIAL PRIMARY KEY,
	project_id INT REFERENCES public.projects (id) ON DELETE CASCADE NOT NULL,
	addressee_id UUID REFERENCES public.profiles (user_id) ON DELETE CASCADE NOT NULL,
	role VARCHAR(100) DEFAULT 'Member' NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CONSTRAINT unique_project_requests_combination UNIQUE (project_id, addressee_id),
	CHECK (role IN ('Member', 'Admin', 'Moderator', 'Owner'))
);

GRANT INSERT (project_id, addressee_id, role) ON TABLE public.project_requests TO authenticated;
GRANT UPDATE (role) ON TABLE public.project_requests TO authenticated;
GRANT DELETE, SELECT ON TABLE public.project_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.insert_project_request_into_notifications()
RETURNS TRIGGER AS $$
BEGIN
	INSERT INTO public.notifications (
		user_id,
		type,
		project_request_id
	) VALUES (
		NEW.addressee_id,
		'project_request',
		NEW.id
	);

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_request_changed_trigger
  AFTER INSERT ON public.project_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.insert_project_request_into_notifications();

CREATE OR REPLACE FUNCTION public.check_project_request_limit()
RETURNS TRIGGER AS $$
DECLARE
  	project_request_count INT;
BEGIN
	SELECT COUNT(1) INTO project_request_count
	FROM public.project_requests
	WHERE addressee_id = NEW.addressee_id;

	IF project_request_count = 100 THEN
		RAISE sqlstate 'P0001' USING
			message = 'Project join request limit exceeded',
			detail = 'User has 100 project join requests',
			hint = 'Ask the user to make place for your project join request';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

GRANT DELETE ON TABLE public.oauth2_app_scopes TO authenticated;

CREATE TRIGGER enforce_project_request_limit_trigger
BEFORE INSERT ON public.project_requests
FOR EACH ROW
EXECUTE FUNCTION public.check_project_request_limit();

GRANT USAGE, SELECT ON SEQUENCE public.project_requests_id_seq TO authenticated;
