CREATE TABLE public.organization_members (
	id SERIAL PRIMARY KEY,
	organization_id INT REFERENCES public.organizations (id) ON DELETE CASCADE NOT NULL,
	member_id UUID REFERENCES public.profiles (user_id) ON DELETE CASCADE NOT NULL,
	role VARCHAR(100) DEFAULT 'Member' NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CONSTRAINT unique_organization_members_combination UNIQUE (organization_id, member_id),
	CHECK (role IN ('Member', 'Admin', 'Moderator', 'Owner'))
);

GRANT INSERT (organization_id, member_id, role) ON TABLE public.organization_members TO authenticated;
GRANT UPDATE (role) ON TABLE public.organization_members TO authenticated;
GRANT DELETE, SELECT ON TABLE public.organization_members TO authenticated;
GRANT SELECT ON TABLE public.organization_members TO anon;

CREATE OR REPLACE FUNCTION public.delete_organization_request()
RETURNS TRIGGER AS $$
BEGIN
	DELETE FROM public.organization_requests
	WHERE organization_id = NEW.organization_id AND addressee_id = NEW.member_id;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delete_organization_request_trigger
AFTER INSERT ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.delete_organization_request();

GRANT USAGE, SELECT ON SEQUENCE public.organization_members_id_seq TO authenticated;
