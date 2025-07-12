CREATE TABLE public.organization_requests (
	id SERIAL PRIMARY KEY,
	organization_id INT REFERENCES public.organizations (id) ON DELETE CASCADE NOT NULL,
	addressee_id UUID REFERENCES public.profiles (user_id) ON DELETE CASCADE NOT NULL,
	role VARCHAR(100) DEFAULT 'Member' NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CONSTRAINT unique_organization_requests_combination UNIQUE (organization_id, addressee_id),
	CHECK (role IN ('Member', 'Admin', 'Moderator', 'Owner'))
);

GRANT INSERT (organization_id, addressee_id, role) ON TABLE public.organization_requests TO authenticated;
GRANT UPDATE (role) ON TABLE public.organization_requests TO authenticated;
GRANT DELETE, SELECT ON TABLE public.organization_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.insert_organization_request_into_notifications()
RETURNS TRIGGER AS $$
BEGIN
	INSERT INTO public.notifications (
		user_id,
		type,
		organization_request_id
	) VALUES (
		NEW.addressee_id,
		'organization_request',
		NEW.id
	);

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organization_request_changed_trigger
AFTER INSERT ON public.organization_requests
FOR EACH ROW
EXECUTE FUNCTION public.insert_organization_request_into_notifications();

CREATE OR REPLACE FUNCTION public.check_organization_request_limit()
RETURNS TRIGGER AS $$
DECLARE
  organization_request_count INT;
BEGIN
	SELECT COUNT(1) INTO organization_request_count
	FROM public.organization_requests
	WHERE addressee_id = NEW.addressee_id;

	IF organization_request_count = 100 THEN
		RAISE sqlstate 'P0001' USING
			message = 'Organization join request limit exceeded',
			detail = 'User has 100 organization join requests',
			hint = 'Ask the user to make place for your organization join request';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_organization_request_limit_trigger
BEFORE INSERT ON public.organization_requests
FOR EACH ROW
EXECUTE FUNCTION public.check_organization_request_limit();

CREATE OR REPLACE FUNCTION public.make_organization_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN

	IF auth.uid() IS NOT NULL THEN
		INSERT INTO public.organization_members (organization_id, member_id, role)
		VALUES (NEW.id, auth.uid(), 'Owner');
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER make_organization_creator_as_owner_trigger
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.make_organization_creator_as_owner();

GRANT USAGE, SELECT ON SEQUENCE public.organization_requests_id_seq TO authenticated;
