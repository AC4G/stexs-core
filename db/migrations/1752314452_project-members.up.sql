CREATE TABLE public.project_members (
	id SERIAL PRIMARY KEY,
	project_id INT REFERENCES public.projects (id) ON DELETE CASCADE NOT NULL,
	member_id UUID REFERENCES public.profiles (user_id) ON DELETE CASCADE NOT NULL,
	role VARCHAR(100) DEFAULT 'Member' NOT NULL,
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at TIMESTAMPTZ,
	CONSTRAINT unique_project_members_combination UNIQUE (project_id, member_id),
	CHECK (role IN ('Member', 'Admin', 'Moderator', 'Owner'))
);

GRANT INSERT (project_id, member_id, role) ON TABLE public.project_members TO authenticated;
GRANT UPDATE (role) ON TABLE public.project_members TO authenticated;
GRANT DELETE, SELECT ON TABLE public.project_members TO authenticated;
GRANT SELECT ON TABLE public.project_members TO anon;

CREATE OR REPLACE FUNCTION public.delete_project_request()
RETURNS TRIGGER AS $$
BEGIN
	DELETE FROM public.project_requests
	WHERE project_id = NEW.project_id 
		AND addressee_id = NEW.member_id;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_members_insert_trigger
AFTER INSERT ON public.project_members
FOR EACH ROW
EXECUTE FUNCTION public.delete_project_request();

GRANT USAGE, SELECT ON SEQUENCE public.project_members_id_seq TO authenticated;
